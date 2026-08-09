import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getMealsByDate,
  getOrCreateMeal,
  addMealItem,
  updateMealItem,
  deleteMealItem,
  getDailyGoal,
  setDailyGoal,
  type MealWithItems,
  type MealItem,
  type DailyGoal,
  type MealType,
  sumMealItems,
  getMealTypeLabel,
  MEAL_TYPES,
} from '../services/meals';
import { QUERY_KEYS } from '../lib/queryClient';

export function useMealsByDate(date: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: user ? QUERY_KEYS.meals.byDate(date) : ['meals', 'byDate', date, 'unauthorized'],
    queryFn: () => getMealsByDate(date),
    enabled: !!user,
  });
}

export function useMealActions(date: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addItem = useMutation({
    mutationFn: async ({ mealType, foodId, unitId, quantity }: { mealType: MealType; foodId: string; unitId: string; quantity: number }) => {
      if (!user) throw new Error('Not authenticated');
      const meal = await getOrCreateMeal(date, mealType, user.id);
      return addMealItem(meal.id, foodId, unitId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meals.byDate(date) });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => 
      updateMealItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meals.byDate(date) });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => deleteMealItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meals.byDate(date) });
    },
  });

  return { addItem, updateItem, deleteItem };
}

export function useDailyGoal(date: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: goal, isLoading } = useQuery({
    queryKey: user ? QUERY_KEYS.goals.daily(date) : ['goals', 'daily', date, 'unauthorized'],
    queryFn: () => getDailyGoal(date, user!.id),
    enabled: !!user,
  });

  const setGoal = useMutation({
    mutationFn: (calories: number) => setDailyGoal(date, user!.id, calories),
    onSuccess: (newGoal) => {
      queryClient.setQueryData(QUERY_KEYS.goals.daily(date), newGoal);
    },
  });

  return { goal, isLoading, setGoal: setGoal.mutate, isSetting: setGoal.isPending };
}

export function useDailySummary(date: string) {
  const { data: meals } = useMealsByDate(date);
  const { goal } = useDailyGoal(date);

  const totals = meals?.reduce(
    (acc, meal) => {
      const mealTotals = sumMealItems(meal.items || []);
      return {
        calories: acc.calories + mealTotals.calories,
        protein: acc.protein + mealTotals.protein,
        carbs: acc.carbs + mealTotals.carbs,
        fat: acc.fat + mealTotals.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const goalCalories = goal?.calories || 2000;
  const progress = Math.min((totals.calories / goalCalories) * 100, 100);
  const remaining = Math.max(goalCalories - totals.calories, 0);

  const mealBreakdown = MEAL_TYPES.map(type => {
    const meal = meals?.find(m => m.meal_type === type);
    const items = meal?.items || [];
    const mealTotals = sumMealItems(items);
    return {
      type,
      label: getMealTypeLabel(type),
      items,
      totals: mealTotals,
      itemCount: items.length,
    };
  });

  return {
    totals,
    goalCalories,
    progress,
    remaining,
    mealBreakdown,
    isOverGoal: totals.calories > goalCalories,
  };
}