import { useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useMealsByDateRange, useDailyTotalsByDateRange } from '@hooks/useAnalytics';
import { Card, CardHeader } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Modal } from '@components/ui/Modal';
import { ChevronLeft, ChevronRight, Calendar, Download, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isToday, addDays, startOfDay, getDay } from 'date-fns';
import { clsx } from 'clsx';
import { exportDailyTotalsCSV, exportMealsCSV } from '@services/analytics';

export function History() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [exportType, setExportType] = useState<'daily' | 'meals'>('daily');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: meals, isLoading: mealsLoading } = useMealsByDateRange(
    format(calendarStart, 'yyyy-MM-dd'),
    format(calendarEnd, 'yyyy-MM-dd')
  );

  const { data: dailyTotals, isLoading: totalsLoading } = useDailyTotalsByDateRange(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd')
  );

  // Build calendar weeks
  const weeks: Date[][] = [];
  let weekStart = calendarStart;
  while (weekStart <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(weekStart, i));
    }
    weeks.push(week);
    weekStart = addDays(weekStart, 7);
  }

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setShowDayDetail(true);
  };

  const getDayColor = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const total = dailyTotals?.[dateStr]?.calories || 0;
    if (total === 0) return 'bg-gray-100';
    if (total < 1000) return 'bg-green-100';
    if (total < 1800) return 'bg-green-200';
    if (total < 2200) return 'bg-yellow-200';
    if (total < 2800) return 'bg-orange-200';
    return 'bg-red-200';
  };

  const handleExport = () => {
    if (exportType === 'daily' && dailyTotals) {
      exportDailyTotalsCSV(dailyTotals, format(currentMonth, 'yyyy-MM'));
    } else if (meals) {
      exportMealsCSV(meals, format(currentMonth, 'yyyy-MM'));
    }
  };

  const dayDetailMeals = selectedDate ? meals?.filter(m => m.date === selectedDate) || [] : [];

  return (
    <div className="min-h-screen bg-brand-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 flex-1 text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h1>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                aria-label="Next month"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setExportType('daily'); }}>
                <Download className="h-4 w-4 mr-1" /> Daily CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setExportType('meals'); }}>
                <FileText className="h-4 w-4 mr-1" /> Meals CSV
              </Button>
              <Button size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Calendar */}
        <Card className="mb-6">
          <CardHeader title="Meal History" subtitle={format(currentMonth, 'MMMM yyyy')} />
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-2xl overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 bg-gray-100 text-center text-xs font-medium text-gray-600">
                {day}
              </div>
            ))}
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7">
                {week.map((day, dIdx) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
                  const isTodayDate = isToday(day);
                  const dayTotal = dailyTotals?.[format(day, 'yyyy-MM-dd')]?.calories || 0;
                  
                  return (
                    <button
                      key={dIdx}
                      onClick={() => handleDateClick(day)}
                      disabled={!isCurrentMonth}
                      className={clsx(
                        'relative aspect-square flex flex-col items-center justify-center p-1',
                        'transition-colors',
                        !isCurrentMonth && 'text-gray-300 bg-gray-50',
                        isCurrentMonth && 'text-gray-900 bg-white hover:bg-gray-50',
                        isSelected && 'ring-2 ring-brand-500 bg-brand-50',
                        isTodayDate && !isSelected && 'ring-2 ring-brand-500',
                      )}
                    >
                      <span className={clsx(
                        'text-sm font-medium',
                        isTodayDate && 'text-brand-600',
                        !isCurrentMonth && 'text-gray-400',
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div 
                        className={clsx(
                          'w-full h-1 rounded mt-1',
                          dayTotal > 0 ? getDayColor(day) : 'bg-transparent'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {/* Legend */}
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-600">Intensity:</span>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 bg-gray-100 rounded" />
              <span className="text-gray-500">No data</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 bg-green-100 rounded" />
              <span className="text-gray-500">{'<' + '1000'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 bg-green-200 rounded" />
              <span className="text-gray-500">1000-1800</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 bg-yellow-200 rounded" />
              <span className="text-gray-500">1800-2200</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 bg-orange-200 rounded" />
              <span className="text-gray-500">2200-2800</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 bg-red-200 rounded" />
              <span className="text-gray-500">{'>' + '2800'}</span>
            </div>
          </div>
        </Card>

        {/* Monthly Summary */}
        {dailyTotals && (
          <Card className="mb-6">
            <CardHeader title="Monthly Summary" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Days Logged</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(dailyTotals).length}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Calories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(dailyTotals).reduce((sum, d) => sum + d.calories, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg/Day</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(dailyTotals).length > 0
                    ? Math.round(Object.values(dailyTotals).reduce((sum, d) => sum + d.calories, 0) / Object.keys(dailyTotals).length).toLocaleString()
                    : '0'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Meals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(dailyTotals).reduce((sum, d) => sum + d.mealCount, 0)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading */}
        {(mealsLoading || totalsLoading) && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          </div>
        )}
      </main>

      {/* Day Detail Modal */}
      <Modal
        isOpen={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        title={selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy') : 'Day Detail'}
        size="lg"
      >
        {selectedDate && (
          <div>
            {dayDetailMeals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No meals logged for this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dayDetailMeals.map(meal => (
                  <div key={meal.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-brand-50 border-b border-emerald-100 flex items-center justify-between">
                      <span className="font-medium text-gray-900 capitalize">{meal.meal_type}</span>
                      <span className="text-sm text-gray-500">
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
          </div>
        )}
      </Modal>
    </div>
  );
}