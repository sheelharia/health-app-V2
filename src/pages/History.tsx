import { useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useMealsByDateRange, useDailyTotalsByDateRange } from '@hooks/useAnalytics';
import { Card, CardHeader } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Modal } from '@components/ui/Modal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, isSameDay, isToday, startOfDay } from 'date-fns';
import { clsx } from 'clsx';

function getDayColor(calories: number): string {
  if (calories === 0) return 'bg-gray-100';
  if (calories < 1000) return 'bg-green-100';
  if (calories < 1800) return 'bg-green-200';
  if (calories < 2200) return 'bg-yellow-200';
  if (calories < 2800) return 'bg-orange-200';
  return 'bg-red-200';
}

function getDayTextColor(calories: number): string {
  if (calories === 0) return 'text-gray-400';
  return 'text-gray-900';
}

export function History() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);

  const weekEnd = endOfWeek(currentWeekStart);
  
  // Build 7 days for the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const { data: meals, isLoading: mealsLoading } = useMealsByDateRange(
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  const { data: dailyTotals, isLoading: totalsLoading } = useDailyTotalsByDateRange(
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  // Calculate weekly summary
  const weekTotalCalories = weekDays.reduce((sum, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return sum + (dailyTotals?.[dateStr]?.calories || 0);
  }, 0);
  
  const daysLogged = weekDays.filter(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return (dailyTotals?.[dateStr]?.calories || 0) > 0;
  }).length;
  
  const avgCalories = daysLogged > 0 ? Math.round(weekTotalCalories / daysLogged) : 0;

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setShowDayDetail(true);
  };

  const dayDetailMeals = selectedDate ? meals?.filter(m => m.date === selectedDate) || [] : [];

  return (
    <div className="min-h-screen bg-brand-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevWeek}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold text-gray-900 flex-1 text-center">
                {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h1>
              <button
                onClick={handleNextWeek}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                aria-label="Next week"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        {/* Week View */}
        <Card>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const calories = dailyTotals?.[dateStr]?.calories || 0;
              const isTodayDate = isToday(day);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  className={clsx(
                    'flex flex-col items-center p-2 rounded-xl transition-all',
                    'hover:bg-gray-50',
                    isTodayDate && 'ring-2 ring-brand-500',
                    isSelected && 'bg-brand-50 ring-2 ring-brand-500',
                  )}
                >
                  <span className={clsx(
                    'text-xs font-medium mb-1',
                    isTodayDate ? 'text-brand-600' : 'text-gray-500'
                  )}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={clsx(
                    'text-lg font-bold mb-2',
                    isTodayDate ? 'text-brand-600' : 'text-gray-900'
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className={clsx(
                    'w-full h-8 rounded-lg flex items-center justify-center',
                    calories > 0 ? getDayColor(calories) : 'bg-gray-50'
                  )}>
                    <span className={clsx(
                      'text-xs font-medium',
                      calories > 0 ? getDayTextColor(calories) : 'text-gray-300'
                    )}>
                      {calories > 0 ? calories.toLocaleString() : '—'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader title="Weekly Summary" />
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-brand-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{daysLogged}</p>
              <p className="text-xs text-gray-500">Days Logged</p>
            </div>
            <div className="text-center p-3 bg-brand-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{weekTotalCalories.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total kcal</p>
            </div>
            <div className="text-center p-3 bg-brand-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{avgCalories.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Avg/Day</p>
            </div>
          </div>
        </Card>

        {/* Day Detail */}
        {selectedDate && (
          <Card>
            <CardHeader 
              title={format(new Date(selectedDate), 'EEEE, MMM d')} 
              action={
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              }
            />
            
            {dayDetailMeals.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                <p>No meals logged for this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayDetailMeals.map(meal => (
                  <div key={meal.id} className="border border-emerald-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-brand-50 border-b border-emerald-100 flex items-center justify-between">
                      <span className="font-medium text-gray-900 capitalize">{meal.meal_type}</span>
                      <span className="text-sm text-gray-600">
                        {meal.items?.reduce((sum, i) => sum + i.calories, 0) || 0} kcal
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {meal.items?.map(item => (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.food?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity} {item.unit?.name || 'unit'} • 
                              P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                            </p>
                          </div>
                          <span className="font-medium text-gray-900">{item.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Loading */}
        {(mealsLoading || totalsLoading) && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
