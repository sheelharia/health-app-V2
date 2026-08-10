import { supabase } from '../lib/supabase';
import type { MealTemplate } from '../lib/supabase';

export async function getMealTemplates(): Promise<MealTemplate[]> {
  const { data, error } = await supabase
    .from('meal_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveMealTemplate(template: {
  name: string;
  meal_type: string;
  items: Array<{ food_id: string; unit_id: string; quantity: number; name?: string }>;
}): Promise<MealTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('meal_templates')
    .insert({
      user_id: user.id,
      name: template.name,
      meal_type: template.meal_type,
      items: template.items,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMealTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('meal_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
