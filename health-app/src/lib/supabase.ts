import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export type Food = {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FoodUnit = {
  id: string;
  food_id: string;
  name: string;
  grams_per_unit: number;
  is_default: boolean;
  display_order: number;
  created_at: string;
};

export type FoodWithUnits = Food & {
  units: FoodUnit[];
};

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export type Meal = {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  created_at: string;
  updated_at: string;
};

export type MealItem = {
  id: string;
  meal_id: string;
  food_id: string;
  unit_id: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
  food?: Food;
  unit?: FoodUnit;
};

export type DailyGoal = {
  id: string;
  user_id: string;
  calories: number;
  date: string;
  created_at: string;
  updated_at: string;
};

export type MealWithItems = Meal & {
  items: MealItem[];
};