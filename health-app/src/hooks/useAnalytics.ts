import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getMealsByDateRange,
  getDailyTotalsByDateRange,
  getMonthlyStats,
  getWeeklyTrends,
  type MonthlyStats,
  type WeeklyTrend,
} from '../services/analytics';
import { QUERY_KEYS } from '../lib/queryClient';

export function useMealsByDateRange(startDate: string, endDate: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: user ? QUERY_KEYS.meals.byDateRange(startDate, endDate) : ['meals', 'byDateRange', startDate, endDate, 'unauthorized'],
    queryFn: () => getMealsByDateRange(startDate, endDate),
    enabled: !!user,
  });
}

export function useDailyTotalsByDateRange(startDate: string, endDate: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: user ? QUERY_KEYS.analytics.dailyTotals(startDate, endDate) : ['analytics', 'dailyTotals', startDate, endDate, 'unauthorized'],
    queryFn: () => getDailyTotalsByDateRange(startDate, endDate),
    enabled: !!user,
  });
}

export function useMonthlyStats(year: number, month: number) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: user ? QUERY_KEYS.analytics.monthly(year, month) : ['analytics', 'monthly', year, month, 'unauthorized'],
    queryFn: () => getMonthlyStats(year, month),
    enabled: !!user,
  });
}

export function useWeeklyTrends(weeks = 8) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: user ? QUERY_KEYS.analytics.weekly(weeks) : ['analytics', 'weekly', weeks, 'unauthorized'],
    queryFn: () => getWeeklyTrends(weeks),
    enabled: !!user,
  });
}