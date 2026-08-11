-- Force-add fiber column to meal_items (handles case where prior migration failed silently)
ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS fiber NUMERIC(10,1) DEFAULT 0;
