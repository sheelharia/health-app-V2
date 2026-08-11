-- Backfill public.users from auth.users
-- This fixes FK constraint violations for existing users who signed up
-- before the on_auth_user_created trigger was created

INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
