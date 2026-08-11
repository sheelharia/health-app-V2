import { supabase } from '../lib/supabase';
import type { Meal, MealItem, MealType, MealWithItems, DailyGoal } from '../lib/supabase';
import { MEAL_TYPES } from '../lib/supabase';
import { calculateNutrition } from './foods';

export type { Meal, MealItem, MealType, MealWithItems, DailyGoal };
export { MEAL_TYPES };

export async function getMealsByDate(date: string): Promise<MealWithItems[]> {
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select(`
      *,
      items:meal_items (
        *,
        food:foods (*),
        unit:food_units (*)
      )
    `)
    .eq('date', date)
    .order('meal_type', { ascending: true });

  if (mealsError) throw mealsError;

  const mealsByType = new Map((meals || []).map(m => [m.meal_type, m]));
  
  return MEAL_TYPES.map(type => 
    mealsByType.get(type) || {
      id: '',
      user_id: '',
      date,
      meal_type: type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: []
    }
  );
}

export async function getOrCreateMeal(date: string, mealType: MealType, userId: string): Promise<Meal> {
  const { data: existing, error: getError } = await supabase
    .from('meals')
    .select('*')
    .eq('date', date)
    .eq('meal_type', mealType)
    .eq('user_id', userId)
    .maybeSingle();

  if (getError) throw getError;

  if (existing) return existing;

  const { data: newMeal, error: createError } = await supabase
    .from('meals')
    .insert({ date, meal_type: mealType, user_id: userId })
    .select()
    .single();

  if (createError) throw createError;
  return newMeal;
}

export async function addMealItem(
  mealId: string,
  foodId: string,
  unitId: string,
  quantity: number
): Promise<MealItem> {
  const [food, unit] = await Promise.all([
    supabase.from('foods').select('*').eq('id', foodId).single(),
    supabase.from('food_units').select('*').eq('id', unitId).single()
  ]);

  if (food.error) throw food.error;
  if (unit.error) throw unit.error;

  const nutrition = calculateNutrition(food.data, unit.data, quantity);

  const { data, error } = await supabase
    .from('meal_items')
    .insert({
      meal_id: mealId,
      food_id: foodId,
      unit_id: unitId,
      quantity,
      ...nutrition
    })
    .select(`
      *,
      food:foods (*),
      unit:food_units (*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateMealItem(
  itemId: string,
  quantity: number
): Promise<MealItem> {
  const { data: item, error: itemError } = await supabase
    .from('meal_items')
    .select('food_id, unit_id')
    .eq('id', itemId)
    .single();

  if (itemError) throw itemError;

  const [food, unit] = await Promise.all([
    supabase.from('foods').select('*').eq('id', item.food_id).single(),
    supabase.from('food_units').select('*').eq('id', item.unit_id).single()
  ]);

  if (food.error) throw food.error;
  if (unit.error) throw unit.error;

  const nutrition = calculateNutrition(food.data, unit.data, quantity);

  const { data, error } = await supabase
    .from('meal_items')
    .update({ quantity, ...nutrition })
    .eq('id', itemId)
    .select(`
      *,
      food:foods (*),
      unit:food_units (*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMealItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function getDailyGoal(date: string, userId: string): Promise<DailyGoal | null> {
  const { data, error } = await supabase
    .from('daily_goals')
    .select('*')
    .eq('date', date)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function setDailyGoal(date: string, userId: string, calories: number): Promise<DailyGoal> {
  const { data: existing } = await supabase
    .from('daily_goals')
    .select('id')
    .eq('date', date)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('daily_goals')
      .update({ calories })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('daily_goals')
    .insert({ date, user_id: userId, calories })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function getMealTypeLabel(type: MealType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getMealTypeIcon(type: MealType): string {
  switch (type) {
    case 'breakfast': return '☀️';
    case 'lunch': return '🌤️';
    case 'snack': return '🍪';
    case 'dinner': return '🌙';
  }
}

export function sumMealItems(items: MealItem[]): { calories: number; protein: number; carbs: number; fat: number; fiber: number } {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + (item.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}