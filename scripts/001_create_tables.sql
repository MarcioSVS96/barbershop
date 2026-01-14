-- Create barbers table
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  specialty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- duration in minutes
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL, -- cash, card, pix
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  barber_commission DECIMAL(10, 2) NOT NULL, -- 60% of amount
  barbershop_revenue DECIMAL(10, 2) NOT NULL, -- 40% of amount
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON public.appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON public.payments(appointment_id);

-- Enable Row Level Security
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access for client booking
-- Barbers can see all data (we'll use auth metadata to identify barbers)
CREATE POLICY "Allow public to view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public to view barbers" ON public.barbers FOR SELECT USING (true);

-- Clients can insert their own appointments
CREATE POLICY "Allow public to insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public to view their appointments" ON public.appointments FOR SELECT USING (true);

-- Only authenticated users (barbers) can modify appointments
CREATE POLICY "Allow authenticated users to update appointments" ON public.appointments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete appointments" ON public.appointments FOR DELETE USING (auth.uid() IS NOT NULL);

-- Only authenticated users can manage barbers, services, clients, and payments
CREATE POLICY "Allow authenticated users to manage barbers" ON public.barbers FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to manage services" ON public.services FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to view clients" ON public.clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to manage clients" ON public.clients FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to manage payments" ON public.payments FOR ALL USING (auth.uid() IS NOT NULL);
