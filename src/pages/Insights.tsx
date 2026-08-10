import { useState } from 'react';
import { useMonthlyStats, useWeeklyTrends } from '@hooks/useAnalytics';
import { Card, CardHeader } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { ProgressBar } from '@components/ui/ProgressBar';
import { PillFilter } from '@components/ui/PillFilter';
import { Download, TrendingUp, TrendingDown, Calendar, Award, AlertTriangle } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { clsx } from 'clsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportMonthlyStatsCSV, exportWeeklyTrendsCSV } from '@services/analytics';

const MEAL_TABS = [
  { value: 'all', label: 'All Meals' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'snack', label: 'Snack' },
  { value: 'dinner', label: 'Dinner' },
];

function getMotivationalMessage(progress: number): string {
  if (progress < 50) return "Great start! Keep tracking to reach your goal. 🌱";
  if (progress < 80) return "You're on track! Keep it up! 💪";
  if (progress < 100) return "Almost there! Watch your remaining calories. 🎯";
  return "Over budget today. Tomorrow is a new day! 🔄";
}

function getMotivationalEmoji(progress: number): string {
  if (progress < 50) return '😊';
  if (progress < 80) return '😐';
  if (progress < 100) return '😅';
  return '🔴';
}

export function Insights() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [weeks, setWeeks] = useState(8);
  const [activeTab, setActiveTab] = useState('all');

  const { data: monthlyStats, isLoading: statsLoading } = useMonthlyStats(selectedMonth.year, selectedMonth.month);
  const { data: weeklyTrends, isLoading: trendsLoading } = useWeeklyTrends(weeks);

  const handleExportMonthly = () => {
    if (monthlyStats) {
      exportMonthlyStatsCSV(monthlyStats, selectedMonth.month, selectedMonth.year);
    }
  };

  const handleExportWeekly = () => {
    if (weeklyTrends) {
      exportWeeklyTrendsCSV(weeklyTrends, weeks);
    }
  };

  const monthLabel = format(new Date(selectedMonth.year, selectedMonth.month - 1), 'MMMM yyyy');

  // Weekly chart data
  const chartData = weeklyTrends?.map(w => ({
    week: format(new Date(w.weekStart), 'MMM d'),
    calories: w.avgCalories,
    protein: w.protein / w.days,
    carbs: w.carbs / w.days,
    fat: w.fat / w.days,
  })) || [];

  // Calculate progress for calorie budget
  const avgCalories = monthlyStats?.avgCalories || 0;
  const goalCalories = monthlyStats?.goalCalories || 2000;
  const progress = Math.min((avgCalories / goalCalories) * 100, 100);
  const emoji = getMotivationalEmoji(progress);
  const message = getMotivationalMessage(progress);

  // Macro goals (percentage-based)
  const macroGoals = {
    protein: { goal: 150, color: 'text-brand-600', barColor: 'bg-brand-600' },
    carbs: { goal: 200, color: 'text-green-600', barColor: 'bg-green-600' },
    fat: { goal: 67, color: 'text-yellow-600', barColor: 'bg-yellow-600' },
    fiber: { goal: 30, color: 'text-purple-600', barColor: 'bg-purple-600' },
  };

  const avgProtein = monthlyStats?.avgProtein || 0;
  const avgCarbs = monthlyStats?.avgCarbs || 0;
  const avgFat = monthlyStats?.avgFat || 0;
  const avgFiber = 0; // Fiber data not yet available from stats

  if (statsLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Today's Insights</h1>
            <div className="flex items-center gap-2">
              <select
                value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setSelectedMonth({ year: y, month: m });
                }}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-500"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const d = subMonths(new Date(), i);
                  return (
                    <option key={i} value={`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`}>
                      {format(d, 'MMM yyyy')}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b border-emerald-100">
        <div className="max-w-2xl mx-auto px-5">
          <PillFilter
            options={MEAL_TABS}
            selected={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* Calorie Budget Section */}
        {monthlyStats && (
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">{emoji}</span>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">{avgCalories.toLocaleString()}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-lg text-gray-600">{goalCalories.toLocaleString()} Cal</span>
                </div>
                <ProgressBar value={progress} color={progress < 80 ? 'teal' : progress < 100 ? 'orange' : 'red'} size="md" />
              </div>
            </div>
            <p className="text-sm text-gray-600">{message}</p>
          </Card>
        )}

        {/* Macronutrients Section */}
        {monthlyStats && (
          <Card>
            <CardHeader title="Macronutrients" />
            <div className="space-y-4">
              <MacroRow label="Protein" value={avgProtein} goal={macroGoals.protein.goal} color={macroGoals.protein.barColor} />
              <MacroRow label="Carbs" value={avgCarbs} goal={macroGoals.carbs.goal} color={macroGoals.carbs.barColor} />
              <MacroRow label="Fat" value={avgFat} goal={macroGoals.fat.goal} color={macroGoals.fat.barColor} />
              <MacroRow label="Fiber" value={avgFiber} goal={macroGoals.fiber.goal} color={macroGoals.fiber.barColor} />
            </div>
          </Card>
        )}

        {/* Weekly Trend Section */}
        <Card>
          <CardHeader title="Weekly Calorie Trend" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" />
                <XAxis 
                  dataKey="week" 
                  stroke="#6B7280" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6B7280" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #D1FAE5', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                  labelFormatter={(val: string) => `Week of ${val}`}
                />
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="#0D9488"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Monthly Summary */}
        {monthlyStats && (
          <Card>
            <CardHeader title="Monthly Summary" />
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-brand-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Days Logged</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.totalDaysLogged}</p>
              </div>
              <div className="p-4 bg-brand-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Calories</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.avgCalories.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-brand-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Streak</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.streak} days</p>
              </div>
              <div className="p-4 bg-brand-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Days Over Goal</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyStats.daysOverGoal}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Best/Worst Day */}
        {monthlyStats?.bestDay && monthlyStats?.worstDay && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader title="🏆 Best Day" subtitle={format(new Date(monthlyStats.bestDay.date), 'MMM d')} />
              <p className="text-2xl font-bold text-green-600">{monthlyStats.bestDay.calories} kcal</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>P: {monthlyStats.bestDay.protein}g</p>
                <p>C: {monthlyStats.bestDay.carbs}g</p>
                <p>F: {monthlyStats.bestDay.fat}g</p>
              </div>
            </Card>
            <Card>
              <CardHeader title="📉 Worst Day" subtitle={format(new Date(monthlyStats.worstDay.date), 'MMM d')} />
              <p className="text-2xl font-bold text-red-600">{monthlyStats.worstDay.calories} kcal</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>P: {monthlyStats.worstDay.protein}g</p>
                <p>C: {monthlyStats.worstDay.carbs}g</p>
                <p>F: {monthlyStats.worstDay.fat}g</p>
              </div>
            </Card>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleExportMonthly}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </main>
    </div>
  );
}

function MacroRow({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const percentage = Math.min((value / goal) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{Math.round(value)}g / {goal}g</span>
          <span className={clsx('text-sm font-semibold', color)}>{Math.round(percentage)}%</span>
        </div>
      </div>
      <ProgressBar value={percentage} color="teal" size="sm" />
    </div>
  );
}
