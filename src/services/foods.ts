import { supabase } from '../lib/supabase';
import type { Food, FoodUnit, FoodWithUnits } from '../lib/supabase';

const SEARCH_LIMIT = 20;

let searchAbortController: AbortController | null = null;

export async function searchFoods(query: string, category?: string): Promise<FoodWithUnits[]> {
  if (!query.trim()) return [];

  if (searchAbortController) {
    searchAbortController.abort();
  }
  searchAbortController = new AbortController();

  try {
    let dbQuery = supabase
      .from('foods')
      .select(`
        *,
        units:food_units (
          id,
          food_id,
          name,
          grams_per_unit,
          is_default,
          display_order
        )
      `)
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(SEARCH_LIMIT)
      .abortSignal(searchAbortController.signal);

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    return (data || []).map(food => ({
      ...food,
      units: (food.units || []).sort((a: FoodUnit, b: FoodUnit) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return a.display_order - b.display_order;
      })
    }));
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return [];
    throw err;
  }
}

export async function getFoodWithUnits(foodId: string): Promise<FoodWithUnits | null> {
  const { data, error } = await supabase
    .from('foods')
    .select(`
      *,
      units:food_units (
        id,
        food_id,
        name,
        grams_per_unit,
        is_default,
        display_order
      )
    `)
    .eq('id', foodId)
    .single();

  if (error) throw error;

  return {
    ...data,
    units: (data.units || []).sort((a: FoodUnit, b: FoodUnit) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.display_order - b.display_order;
    })
  };
}

export async function getFoodCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('category')
    .eq('is_active', true);

  if (error) throw error;

  const categories = [...new Set((data || []).map(f => f.category))];
  return categories.sort();
}

export function calculateNutrition(
  food: Food,
  unit: FoodUnit,
  quantity: number
): { calories: number; protein: number; carbs: number; fat: number; fiber: number } {
  const grams = unit.grams_per_unit * quantity;
  const factor = grams / 100;

  return {
    calories: Math.round(food.calories_per_100g * factor * 10) / 10,
    protein: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat: Math.round(food.fat_per_100g * factor * 10) / 10,
    fiber: Math.round(((food as any).fiber_per_100g || 0) * factor * 10) / 10,
  };
}

export function getDefaultUnit(food: FoodWithUnits): FoodUnit | undefined {
  return food.units.find(u => u.is_default) || food.units[0];
}

export function formatUnitName(unit: FoodUnit): string {
  return unit.name;
}

export interface FoodLookupResult {
  food: FoodWithUnits;
  source: 'database' | 'database_similar' | 'ai_lookup';
}

export async function lookupFood(query: string): Promise<FoodLookupResult> {
  const { data, error } = await supabase.functions.invoke('lookup-food', {
    body: { query },
  });
  if (error) throw new Error(error.message || 'Food lookup failed');
  return data;
}