import { useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useMonthlyStats, useWeeklyTrends } from '@hooks/useAnalytics';
import { Card, CardHeader } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Select } from '@components/ui/Select';
import { Download, TrendingUp, TrendingDown, Calendar, Award, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { clsx } from 'clsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { exportMonthlyStatsCSV, exportWeeklyTrendsCSV } from '@services/analytics';

export function Analytics() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [weeks, setWeeks] = useState(8);

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

  // Monthly comparison (last 6 months)
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  // This would need a new hook, skipping for now

  if (statsLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
            <div className="flex items-center gap-2">
              <Select
                value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setSelectedMonth({ year: y, month: m });
                }}
                options={Array.from({ length: 12 }, (_, i) => {
                  const d = subMonths(new Date(), i);
                  return {
                    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                    label: format(d, 'MMMM yyyy'),
                  };
                })}
                className="w-48"
              />
              <Select
                value={String(weeks)}
                onChange={(e) => setWeeks(Number(e.target.value))}
                options={[
                  { value: '4', label: '4 weeks' },
                  { value: '8', label: '8 weeks' },
                  { value: '12', label: '12 weeks' },
                  { value: '26', label: '6 months' },
                ]}
                className="w-32"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Monthly Stats Cards */}
        {monthlyStats && (
          <>
            <div className="max-w-4xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{monthLabel} Summary</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportMonthly}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Avg Calories"
                value={monthlyStats.avgCalories.toLocaleString()}
                icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                trend={monthlyStats.avgCalories > (monthlyStats.goalCalories || 2000) ? 'over' : 'under'}
                goal={monthlyStats.goalCalories?.toLocaleString()}
              />
              <StatCard
                label="Days Logged"
                value={monthlyStats.totalDaysLogged}
                icon={<Calendar className="h-5 w-5 text-green-500" />}
              />
              <StatCard
                label="Current Streak"
                value={`${monthlyStats.streak} days`}
                icon={<Award className="h-5 w-5 text-yellow-500" />}
              />
              <StatCard
                label="Days Over Goal"
                value={monthlyStats.daysOverGoal}
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                subLabel={`${monthlyStats.daysUnderGoal} under goal`}
              />
            </div>

            {/* Best/Worst Days */}
            <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {monthlyStats.bestDay && (
                <Card>
                  <CardHeader title="Best Day" subtitle={format(new Date(monthlyStats.bestDay.date), 'MMM d')} action={
                    <span className="text-green-600 font-medium">{monthlyStats.bestDay.calories} kcal</span>
                  } />
                  <div className="text-sm text-gray-600">
                    <p>Protein: {monthlyStats.bestDay.protein}g</p>
                    <p>Carbs: {monthlyStats.bestDay.carbs}g</p>
                    <p>Fat: {monthlyStats.bestDay.fat}g</p>
                    <p>Meals: {monthlyStats.bestDay.mealCount}</p>
                  </div>
                </Card>
              )}
              {monthlyStats.worstDay && (
                <Card>
                  <CardHeader title="Worst Day" subtitle={format(new Date(monthlyStats.worstDay.date), 'MMM d')} action={
                    <span className="text-red-600 font-medium">{monthlyStats.worstDay.calories} kcal</span>
                  } />
                  <div className="text-sm text-gray-600">
                    <p>Protein: {monthlyStats.worstDay.protein}g</p>
                    <p>Carbs: {monthlyStats.worstDay.carbs}g</p>
                    <p>Fat: {monthlyStats.worstDay.fat}g</p>
                    <p>Meals: {monthlyStats.worstDay.mealCount}</p>
                  </div>
                </Card>
              )}
            </div>

            {/* Weekly Trends Chart */}
            <Card className="mb-6">
              <CardHeader 
                title={`${weeks}-Week Calorie Trend`} 
                action={
                  <Button variant="outline" size="sm" onClick={handleExportWeekly}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                }
              />
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="week" 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => val.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                      labelFormatter={(val: string) => `Week of ${val}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Macro Breakdown Chart */}
            <Card>
              <CardHeader title="Average Macronutrients (per day)" />
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="week" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => [value.toFixed(1), name]}
                    />
                    <Bar dataKey="protein" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={30} name="Protein (g)" />
                    <Bar dataKey="carbs" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={30} name="Carbs (g)" />
                    <Bar dataKey="fat" fill="#eab308" radius={[0, 4, 4, 0]} maxBarSize={30} name="Fat (g)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, trend, goal, subLabel }: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend?: 'over' | 'under';
  goal?: string;
  subLabel?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subLabel && <p className="text-xs text-gray-500 mt-1">{subLabel}</p>}
          {goal && <p className="text-xs text-gray-400 mt-1">Goal: {goal}</p>}
        </div>
        <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend === 'over' ? (
            <TrendingUp className="h-3 w-3 text-red-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-green-500" />
          )}
          <span className={trend === 'over' ? 'text-red-500' : 'text-green-500'}>
            {trend === 'over' ? 'Over goal' : 'Under goal'}
          </span>
        </div>
      )}
    </div>
  );
}