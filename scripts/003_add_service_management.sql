-- Add is_active field to services for enable/disable functionality
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add snapshot fields to appointments for financial immutability
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS service_price_at_booking DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS service_duration_at_booking INTEGER;

-- Update existing appointments with current service values for historical data
UPDATE public.appointments 
SET 
  service_price_at_booking = services.price,
  service_duration_at_booking = services.duration
FROM public.services
WHERE appointments.service_id = services.id
  AND appointments.service_price_at_booking IS NULL;
