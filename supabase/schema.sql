-- Sports Team Management Platform - Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'player');
CREATE TYPE player_type AS ENUM ('Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper');
CREATE TYPE match_type AS ENUM ('Internal', 'External');
CREATE TYPE match_status AS ENUM ('Upcoming', 'Completed', 'Cancelled');
CREATE TYPE rsvp_status AS ENUM ('CONFIRMED', 'WAITLISTED', 'OUT');

-- =============================================================================
-- TABLES
-- =============================================================================

-- users: extends auth.users, stores profile and role
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  player_type player_type,
  profile_photo_url text,
  last_active timestamptz DEFAULT now(),
  recent_form text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  match_type match_type NOT NULL,
  opponent_name text,
  match_date timestamptz NOT NULL,
  venue text NOT NULL,
  max_capacity int NOT NULL DEFAULT 11,
  status match_status NOT NULL DEFAULT 'Upcoming',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- rsvps: match attendance with queue order
CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- attendance: tracks who actually attended (for Reliability Score)
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attended boolean NOT NULL DEFAULT true,
  performance_notes text,
  UNIQUE(match_id, user_id)
);

-- expenses: per-match expense categories
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- expense_assignments: which players owe which expenses (for matrix)
CREATE TABLE public.expense_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(expense_id, user_id)
);

-- user_dues: calculated amount owed per player per match
CREATE TABLE public.user_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_owed numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  approved_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_rsvps_match_id ON public.rsvps(match_id);
CREATE INDEX idx_rsvps_user_id ON public.rsvps(user_id);
CREATE INDEX idx_rsvps_status ON public.rsvps(match_id, status);
CREATE INDEX idx_matches_status_date ON public.matches(status, match_date);
CREATE INDEX idx_user_dues_user_id ON public.user_dues(user_id);
CREATE INDEX idx_user_dues_match_id ON public.user_dues(match_id);
CREATE INDEX idx_attendance_match_id ON public.attendance(match_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dues ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users: users can read/update own row; admins can read/update all
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Allow insert for new signups"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- matches: all authenticated users can read; admins can CRUD
CREATE POLICY "Authenticated users can read matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage matches"
  ON public.matches FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- rsvps: users can read own; users can insert/update own; admins can manage all
CREATE POLICY "Users can read own rsvps"
  ON public.rsvps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read rsvps for matches they have access to"
  ON public.rsvps FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own rsvp"
  ON public.rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rsvp"
  ON public.rsvps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all rsvps"
  ON public.rsvps FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- attendance: admins manage; users can read own
CREATE POLICY "Users can read own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage attendance"
  ON public.attendance FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- expenses: admins manage; users can read for matches
CREATE POLICY "Authenticated users can read expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage expenses"
  ON public.expenses FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- expense_assignments: admins manage; users can read
CREATE POLICY "Authenticated users can read expense_assignments"
  ON public.expense_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage expense_assignments"
  ON public.expense_assignments FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- user_dues: users can read/update own (mark paid); admins can manage all
CREATE POLICY "Users can read own dues"
  ON public.user_dues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own dues (mark paid)"
  ON public.user_dues FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all dues"
  ON public.user_dues FOR ALL
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- =============================================================================
-- STORAGE BUCKET FOR PROFILE PHOTOS
-- =============================================================================
-- Run in Supabase Dashboard > Storage:
-- 1. Create bucket "avatars" (public)
-- 2. Add policy: "Users can upload own avatar" - INSERT with (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
-- 3. Add policy: "Public read" - SELECT for all

-- =============================================================================
-- TRIGGER: Update users.updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER user_dues_updated_at
  BEFORE UPDATE ON public.user_dues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
