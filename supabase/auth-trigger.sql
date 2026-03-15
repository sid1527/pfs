-- Auto-create public.users row when a new auth user signs up (email or OAuth)
-- Run this in Supabase SQL Editor after schema.sql
-- This ensures users get a profile row immediately, so sign-in works

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role, player_type, profile_photo_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(NEW.email, ''),
    'player',
    CASE
      WHEN NEW.raw_user_meta_data->>'player_type' IN ('Batsman','Bowler','All-Rounder','Wicketkeeper')
      THEN (NEW.raw_user_meta_data->>'player_type')::public.player_type
      ELSE NULL
    END,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop if exists to allow re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
