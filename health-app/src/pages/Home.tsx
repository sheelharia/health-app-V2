import { useState } from 'react';
import { useMealsByDate, useMealActions, useDailySummary, useDailyGoal } from '@hooks/useMeals';
import { useAuth } from '@hooks/useAuth';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { ProgressBar } from '@components/ui/ProgressBar';
import { ArrowLeft, ArrowRight, Plus, Settings, Pencil, Trash2 } from 'lucide-react';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import type { MealType } from '@lib/supabase';

function getCalorieEmoji(progress: number): string {
  if (progress < 50) return '😊';
  if (progress < 80) return '😐';
  if (progress < 100) return '😅';
  return '🔴';
}

function getCalorieColor(progress: number): string {
  if (progress < 80) return 'teal';
  if (progress < 100) return 'orange';
  return 'red';
}

function getMealIcon(type: MealType): string {
  switch (type) {
    case 'breakfast': return '☀️';
    case 'lunch': return '🌤️';
    case 'snack': return '🍪';
    case 'dinner': return '🌙';
  }
}

function getMealLabel(type: MealType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

const EMPTY_STATE_MESSAGES = [
  "Fuel your body right today! 🌱",
  "What's on the menu today? 🍽️",
  "Start logging to see your progress! 📊",
];

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  const { data: meals, isLoading: mealsLoading } = useMealsByDate(format(selectedDate, 'yyyy-MM-dd'));
  const { addItem, deleteItem } = useMealActions(format(selectedDate, 'yyyy-MM-dd'));
  const { totals, goalCalories, progress, remaining, isOverGoal, mealBreakdown } = useDailySummary(format(selectedDate, 'yyyy-MM-dd'));

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => addDays(prev, days));
  };

  const handleAddItem = (mealType: MealType, foodId: string, unitId: string, quantity: number) => {
    addItem.mutate({ mealType, foodId, unitId, quantity });
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem.mutate(itemId);
  };

  const emoji = getCalorieEmoji(progress);
  const calorieColor = getCalorieColor(progress);
  const emptyMessage = EMPTY_STATE_MESSAGES[Math.floor(Math.random() * EMPTY_STATE_MESSAGES.length)];

  return (
    <div className="min-h-screen bg-brand-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                aria-label="Previous day"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-500">{format(selectedDate, 'EEEE')}</p>
                <p className="text-xl font-bold text-gray-900">{format(selectedDate, 'MMM d, yyyy')}</p>
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                aria-label="Next day"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {!isToday(selectedDate) && (
                <button
                  onClick={() => setSelectedDate(startOfDay(new Date()))}
                  className="px-3 py-1.5 text-sm font-medium rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                >
                  Today
                </button>
              )}
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        {/* Calorie Summary Bar */}
        <Card>
          <div className="flex items-center gap-4">
            <span className="text-3xl">{emoji}</span>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900">{totals.calories}</span>
                <span className="text-gray-500">/</span>
                <span className="text-lg text-gray-600">{goalCalories} Cal</span>
              </div>
              <ProgressBar value={progress} color={calorieColor} size="md" />
            </div>
          </div>
        </Card>

        {/* Meal Sections */}
        {mealBreakdown.map((meal) => {
          const mealTarget = Math.round(goalCalories * (meal.type === 'breakfast' ? 0.3 : meal.type === 'lunch' ? 0.35 : meal.type === 'snack' ? 0.1 : 0.25));
          const mealCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
          const isEmpty = meal.items.length === 0;

          return (
            <Card key={meal.type} className={clsx(isEmpty && 'bg-white/50 border-dashed')}>
              {/* Meal Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getMealIcon(meal.type as MealType)}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{getMealLabel(meal.type as MealType)}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'text-sm font-medium',
                    mealCalories > mealTarget ? 'text-orange-600' : 'text-gray-600'
                  )}>
                    {mealCalories}/{mealTarget} Cal
                  </span>
                  <button
                    onClick={() => navigate(`/add-food/${meal.type}`)}
                    className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
                    aria-label={`Add to ${getMealLabel(meal.type as MealType)}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Meal Items */}
              {isEmpty ? (
                <div className="py-6 text-center">
                  <p className="text-gray-500 mb-2">No foods logged yet</p>
                  <p className="text-sm text-gray-400 mb-3">{emptyMessage}</p>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/add-food/${meal.type}`)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add first item
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {meal.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {item.food?.name || 'Unknown food'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.quantity} {item.unit?.name || 'unit'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-medium text-gray-700">{item.calories} kcal</span>
                          <span className="text-xs text-gray-500">
                            P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                            {item.fiber ? ` Fi:${item.fiber}g` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/edit-food/${item.id}`)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          aria-label="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Meal Total */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {mealCalories} kcal
                    </span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* Loading Overlay */}
        {mealsLoading && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading meals...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
