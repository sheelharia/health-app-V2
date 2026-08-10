-- Migration: Add fiber tracking, meal percentages, and meal templates
-- Run this against your Supabase database

-- Add fiber to meal_items
ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS fiber NUMERIC(10,1) DEFAULT 0;

-- Add meal_percentages to daily_goals
ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS meal_percentages JSONB DEFAULT '{"breakfast": 30, "lunch": 35, "snack": 10, "dinner": 25}';

-- Create meal_templates table
CREATE TABLE IF NOT EXISTS meal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for meal_templates
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON meal_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON meal_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON meal_templates
  FOR DELETE USING (auth.uid() = user_id);
