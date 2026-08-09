import { useState } from 'react';
import { useMealsByDate, useMealActions, useDailySummary, useDailyGoal } from '@hooks/useMeals';
import { useAuth } from '@hooks/useAuth';
import { MealCard } from '@components/meals/MealCard';
import { Card, CardHeader } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { clsx } from 'clsx';

export function Dashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  const { data: meals, isLoading: mealsLoading } = useMealsByDate(format(selectedDate, 'yyyy-MM-dd'));
  const { addItem, deleteItem } = useMealActions(format(selectedDate, 'yyyy-MM-dd'));
  const { totals, goalCalories, progress, remaining, isOverGoal, mealBreakdown } = useDailySummary(format(selectedDate, 'yyyy-MM-dd'));
  const { goal, isLoading: goalLoading, setGoal, isSetting } = useDailyGoal(format(selectedDate, 'yyyy-MM-dd'));

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => addDays(prev, days));
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const calories = parseInt(formData.get('calories') as string, 10);
    if (!isNaN(calories) && calories > 0) {
      setGoal(calories);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                aria-label="Previous day"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-500">{format(selectedDate, 'EEEE')}</p>
                <p className="text-xl font-semibold text-gray-900">{format(selectedDate, 'MMM d, yyyy')}</p>
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                aria-label="Next day"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>
            <button
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                isToday(selectedDate)
                  ? 'bg-gray-100 text-gray-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              Today
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Calorie Ring */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke={isOverGoal ? '#ef4444' : '#3b82f6'}
                  strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{totals.calories}</span>
                <span className="text-sm text-gray-500">/ {goalCalories} kcal</span>
              </div>
            </div>
            <div className="flex-1 ml-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-500', isOverGoal ? 'bg-red-500' : 'bg-blue-500')}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Consumed</p>
                  <p className="text-xl font-bold text-gray-900">{totals.calories} kcal</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{isOverGoal ? 'Over Goal' : 'Remaining'}</p>
                  <p className={clsx('text-xl font-bold', isOverGoal ? 'text-red-600' : 'text-green-600')}>{remaining} kcal</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Macro Bars */}
        <Card className="mb-6">
          <CardHeader title="Macronutrients" />
          <div className="space-y-3">
            {[
              { label: 'Protein', value: totals.protein, goal: goalCalories * 0.3 / 4, color: 'bg-blue-500', unit: 'g' },
              { label: 'Carbs', value: totals.carbs, goal: goalCalories * 0.4 / 4, color: 'bg-green-500', unit: 'g' },
              { label: 'Fat', value: totals.fat, goal: goalCalories * 0.3 / 9, color: 'bg-yellow-500', unit: 'g' },
            ].map((macro) => (
              <div key={macro.label} className="flex items-center gap-3">
                <span className="w-16 text-sm font-medium text-gray-700">{macro.label}</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${macro.color} transition-all duration-500`}
                    style={{ width: `${Math.min((macro.value / macro.goal) * 100, 100)}%` }}
                  />
                </div>
                <span className="w-24 text-sm font-semibold text-gray-900 text-right">
                  {macro.value}{macro.unit} / {Math.round(macro.goal)}{macro.unit}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Daily Goal Setting */}
        <Card className="mb-6">
          <CardHeader title="Daily Calorie Goal" subtitle={goal ? `Current: ${goal.calories} kcal` : 'Not set'} action={
            <form onSubmit={handleGoalSubmit} className="flex items-center gap-2">
              <Input
                name="calories"
                type="number"
                placeholder="Calories"
                defaultValue={goal?.calories || 2000}
                className="w-28"
              />
              <Button type="submit" size="sm" disabled={isSetting}>
                Save
              </Button>
            </form>
          } />
        </Card>

        {/* Meal Cards */}
        <div className="space-y-4">
          {mealBreakdown.map(meal => (
            <MealCard
              key={meal.type}
              meal={{
                id: '',
                user_id: user?.id || '',
                date: format(selectedDate, 'yyyy-MM-dd'),
                meal_type: meal.type,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                items: meal.items,
              }}
              onAddItem={(mealType, foodId, unitId, quantity) => addItem.mutate({ mealType, foodId, unitId, quantity })}
              onDeleteItem={(itemId) => deleteItem.mutate(itemId)}
              isLoading={addItem.isPending}
            />
          ))}
        </div>

        {mealsLoading && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading meals...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}