-- Add created_by to matches table to track the captain (match creator)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id);
