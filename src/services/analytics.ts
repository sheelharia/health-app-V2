import { supabase } from '../lib/supabase';
import type { MealWithItems } from '../lib/supabase';
import { sumMealItems, getMealTypeLabel } from './meals';

export type MonthlyStats = {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalDaysLogged: number;
  streak: number;
  bestDay: { date: string; calories: number; protein: number; carbs: number; fat: number; mealCount: number } | null;
  worstDay: { date: string; calories: number; protein: number; carbs: number; fat: number; mealCount: number } | null;
  daysOverGoal: number;
  daysUnderGoal: number;
  goalCalories: number;
};

export type WeeklyTrend = {
  weekStart: string;
  weekEnd: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  days: number;
  avgCalories: number;
};

export async function getMealsByDateRange(startDate: string, endDate: string): Promise<MealWithItems[]> {
  const { data: meals, error } = await supabase
    .from('meals')
    .select(`
      *,
      items:meal_items (
        *,
        food:foods (*),
        unit:food_units (*)
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('meal_type', { ascending: true });

  if (error) throw error;
  return meals || [];
}

export async function getDailyTotalsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('meals')
    .select(`
      date,
      items:meal_items (calories, protein, carbs, fat)
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  // Aggregate by date
  const totalsByDate: Record<string, { calories: number; protein: number; carbs: number; fat: number; mealCount: number }> = {};
  
  (data || []).forEach(meal => {
    const date = meal.date;
    if (!totalsByDate[date]) {
      totalsByDate[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 };
    }
    totalsByDate[date].mealCount++;
    meal.items?.forEach(item => {
      totalsByDate[date].calories += item.calories;
      totalsByDate[date].protein += item.protein;
      totalsByDate[date].carbs += item.carbs;
      totalsByDate[date].fat += item.fat;
    });
  });

  return totalsByDate;
}

export async function getMonthlyStats(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = month === 12 
    ? `${year + 1}-01-01` 
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const totalsByDate = await getDailyTotalsByDateRange(startDate, endDate);
  
  const days = Object.entries(totalsByDate);
  const totalDays = days.length;
  
  if (totalDays === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      totalDaysLogged: 0,
      streak: 0,
      bestDay: null,
      worstDay: null,
      daysOverGoal: 0,
      daysUnderGoal: 0,
    };
  }

  const totalCalories = days.reduce((sum, [, d]) => sum + d.calories, 0);
  const totalProtein = days.reduce((sum, [, d]) => sum + d.protein, 0);
  const totalCarbs = days.reduce((sum, [, d]) => sum + d.carbs, 0);
  const totalFat = days.reduce((sum, [, d]) => sum + d.fat, 0);

  // Get user's goal for the month (use most recent goal)
  const { data: goalData } = await supabase
    .from('daily_goals')
    .select('calories, date')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .limit(1);
  
  const goalCalories = goalData?.[0]?.calories || 2000;

  const daysOverGoal = days.filter(([, d]) => d.calories > goalCalories).length;
  const daysUnderGoal = days.filter(([, d]) => d.calories > 0 && d.calories <= goalCalories).length;

  // Find best/worst days
  const bestDay = days.reduce((best, [date, d]) => 
    d.calories > 0 && d.calories <= goalCalories && (best === null || d.calories > best.calories) 
      ? { date, ...d } : best, null as { date: string; calories: number; protein: number; carbs: number; fat: number; mealCount: number } | null);
  
  const worstDay = days.reduce((worst, [date, d]) => 
    d.calories > 0 && (worst === null || d.calories > worst.calories) 
      ? { date, ...d } : worst, null as { date: string; calories: number; protein: number; carbs: number; fat: number; mealCount: number } | null);

  // Calculate streak (consecutive days with meals)
  const sortedDates = days
    .filter(([, d]) => d.calories > 0)
    .map(([date]) => date)
    .sort()
    .reverse();
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = today;
  
  for (const date of sortedDates) {
    if (date === checkDate) {
      streak++;
      checkDate = new Date(new Date(checkDate).getTime() - 86400000).toISOString().split('T')[0];
    } else if (date < checkDate) {
      break;
    }
  }

  return {
    avgCalories: Math.round(totalCalories / totalDays),
    avgProtein: Math.round(totalProtein / totalDays * 10) / 10,
    avgCarbs: Math.round(totalCarbs / totalDays * 10) / 10,
    avgFat: Math.round(totalFat / totalDays * 10) / 10,
    totalDaysLogged: totalDays,
    streak,
    bestDay,
    worstDay,
    daysOverGoal,
    daysUnderGoal,
    goalCalories,
  };
}

export async function getWeeklyTrends(weeks = 8) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - weeks * 7);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const totalsByDate = await getDailyTotalsByDateRange(startStr, endStr);
  
  // Group by week (Monday-Sunday)
  const weeksData: Record<string, { calories: number; protein: number; carbs: number; fat: number; days: number }> = {};
  
  Object.entries(totalsByDate).forEach(([date, totals]) => {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0 = Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const weekKey = monday.toISOString().split('T')[0];
    
    if (!weeksData[weekKey]) {
      weeksData[weekKey] = { calories: 0, protein: 0, carbs: 0, fat: 0, days: 0 };
    }
    weeksData[weekKey].calories += totals.calories;
    weeksData[weekKey].protein += totals.protein;
    weeksData[weekKey].carbs += totals.carbs;
    weeksData[weekKey].fat += totals.fat;
    weeksData[weekKey].days++;
  });
  
  return Object.entries(weeksData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, data]) => ({
      weekStart,
      weekEnd: new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().split('T')[0],
      ...data,
      avgCalories: Math.round(data.calories / Math.max(data.days, 1)),
    }));
}

export function generateCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(',')
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportMealsCSV(meals: any[], dateRange: string) {
  const rows = meals.flatMap(meal => 
    meal.items?.map((item: any) => ({
      Date: meal.date,
      Meal: getMealTypeLabel(meal.meal_type as 'breakfast' | 'lunch' | 'snack' | 'dinner'),
      Food: item.food?.name || 'Unknown',
      Serving: item.unit?.name || 'unit',
      Quantity: item.quantity,
      Calories: item.calories,
      Protein: item.protein,
      Carbs: item.carbs,
      Fat: item.fat,
    })) || []
  );
  
  generateCSV(rows, `meals_${dateRange}.csv`);
}

export function exportDailyTotalsCSV(totalsByDate: Record<string, any>, dateRange: string) {
  const rows = Object.entries(totalsByDate).map(([date, data]) => ({
    Date: date,
    Calories: data.calories,
    Protein: data.protein,
    Carbs: data.carbs,
    Fat: data.fat,
    Meals: data.mealCount,
  }));
  
  generateCSV(rows, `daily_totals_${dateRange}.csv`);
}

export function exportMonthlyStatsCSV(stats: any, month: number, year: number) {
  const rows = [{
    Month: `${year}-${String(month).padStart(2, '0')}`,
    'Avg Calories': stats.avgCalories,
    'Avg Protein (g)': stats.avgProtein,
    'Avg Carbs (g)': stats.avgCarbs,
    'Avg Fat (g)': stats.avgFat,
    'Days Logged': stats.totalDaysLogged,
    'Current Streak': stats.streak,
    'Best Day': stats.bestDay?.date || 'N/A',
    'Best Day Calories': stats.bestDay?.calories || 0,
    'Worst Day': stats.worstDay?.date || 'N/A',
    'Worst Day Calories': stats.worstDay?.calories || 0,
    'Days Over Goal': stats.daysOverGoal,
    'Days Under Goal': stats.daysUnderGoal,
    'Goal Calories': stats.goalCalories,
  }];
  
  generateCSV(rows, `monthly_stats_${year}_${month}.csv`);
}

export function exportWeeklyTrendsCSV(weeklyTrends: any[], weeks: number) {
  const rows = weeklyTrends.map(w => ({
    'Week Start': w.weekStart,
    'Week End': w.weekEnd,
    'Avg Calories': w.avgCalories,
    'Total Calories': w.calories,
    'Total Protein (g)': Math.round(w.protein * 10) / 10,
    'Total Carbs (g)': Math.round(w.carbs * 10) / 10,
    'Total Fat (g)': Math.round(w.fat * 10) / 10,
    'Days Logged': w.days,
  }));
  
  generateCSV(rows, `weekly_trends_${weeks}w.csv`);
}