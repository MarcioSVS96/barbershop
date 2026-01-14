-- Add breaks column to availability table
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS breaks JSONB DEFAULT '[]'::jsonb;