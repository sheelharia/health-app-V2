-- Refresh PostgREST schema cache so the fiber column is visible via the API
SELECT pg_notify('pgrst', 'reload schema');
