import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const QUERY_KEYS = {
  foods: {
    search: (query: string, category?: string) => ['foods', 'search', query, category],
    categories: () => ['foods', 'categories'],
    detail: (id: string) => ['foods', 'detail', id],
  },
  meals: {
    byDate: (date: string) => ['meals', 'byDate', date],
    byDateRange: (startDate: string, endDate: string) => ['meals', 'byDateRange', startDate, endDate],
    item: (id: string) => ['meals', 'item', id],
  },
  goals: {
    daily: (date: string) => ['goals', 'daily', date],
  },
  analytics: {
    dailyTotals: (startDate: string, endDate: string) => ['analytics', 'dailyTotals', startDate, endDate],
    monthly: (year: number, month: number) => ['analytics', 'monthly', year, month],
    weekly: (weeks: number) => ['analytics', 'weekly', weeks],
  },
  auth: {
    user: () => ['auth', 'user'],
  },
};