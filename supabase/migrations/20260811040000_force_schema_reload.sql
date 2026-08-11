-- Force PostgREST schema reload by commenting on the column
COMMENT ON COLUMN meal_items.fiber IS 'Fiber content in grams';
