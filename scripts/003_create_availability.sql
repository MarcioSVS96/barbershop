-- ================================
-- Availability table (Horários)
-- ================================

-- Create availability table
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL, -- 0 = Domingo, 1 = Segunda, ...
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_active BOOLEAN DEFAULT true,
  breaks JSONB DEFAULT '[]'::jsonb, -- Intervalos/pausas do dia
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(day_of_week)
);

-- ================================
-- Default data (Horários padrão)
-- ================================

INSERT INTO public.availability (day_of_week, start_time, end_time, is_active)
VALUES
  (0, '09:00', '18:00', false), -- Domingo (fechado)
  (1, '09:00', '19:00', true),  -- Segunda
  (2, '09:00', '19:00', true),  -- Terça
  (3, '09:00', '19:00', true),  -- Quarta
  (4, '09:00', '19:00', true),  -- Quinta
  (5, '09:00', '19:00', true),  -- Sexta
  (6, '09:00', '18:00', true)   -- Sábado
ON CONFLICT (day_of_week) DO NOTHING;

-- ================================
-- Auto update updated_at
-- ================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_availability_updated ON public.availability;

CREATE TRIGGER trg_availability_updated
BEFORE UPDATE ON public.availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
