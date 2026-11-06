SET LOCAL lock_timeout TO '5s';

-- New and rescheduled bookings must start on the grid for the shop's opening time.
CREATE OR REPLACE FUNCTION barber_internal.window_is_free(
  p_shop uuid, p_barber uuid, p_date date, p_time time, p_minutes integer, p_exclude uuid
) RETURNS boolean
LANGUAGE sql VOLATILE SET search_path = ''
AS $$
  SELECT p_minutes > 0 AND EXISTS (
    SELECT 1 FROM public.availability h
    WHERE h.barbershop_id = p_shop AND h.day_of_week = extract(dow FROM p_date) AND h.is_active
      AND p_time >= h.start_time
      AND date_bin(interval '30 minutes', p_date + p_time, p_date + h.start_time) = p_date + p_time
      AND p_date + p_time + make_interval(mins => p_minutes) <= p_date + h.end_time
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.breaks) = 'array' THEN h.breaks ELSE '[]'::jsonb END) AS b(item)
        WHERE CASE
          WHEN b.item->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
           AND b.item->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
          THEN (b.item->>'end')::time > p_time
            AND p_date + (b.item->>'start')::time < p_date + p_time + make_interval(mins => p_minutes)
          ELSE false END
      )
  ) AND NOT EXISTS (
    SELECT 1 FROM public.booking_blocks b
    WHERE b.barbershop_id = p_shop AND b.block_date = p_date
      AND (b.barber_id IS NULL OR b.barber_id = p_barber)
      AND b.end_time > p_time
      AND p_date + b.start_time < p_date + p_time + make_interval(mins => p_minutes)
  ) AND NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.barber_id = p_barber
      AND a.id IS DISTINCT FROM p_exclude AND a.status IN ('pending', 'confirmed')
      AND tsrange(a.appointment_date + a.appointment_time,
        a.appointment_date + a.appointment_time + make_interval(mins => coalesce(a.service_duration_at_booking, 30)), '[)')
        && tsrange(p_date + p_time, p_date + p_time + make_interval(mins => p_minutes), '[)')
  );
$$;

CREATE OR REPLACE FUNCTION public.booking_available_starts(
  p_shop uuid, p_barber uuid, p_service uuid, p_date date, p_exclude uuid DEFAULT NULL, p_lead integer DEFAULT 5
) RETURNS TABLE (start_time text)
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$
  WITH input AS (
    SELECT h.start_time AS opening, h.end_time AS closing,
      CASE WHEN a.id IS NOT NULL THEN coalesce(a.service_duration_at_booking, 30) ELSE s.duration END AS minutes
    FROM public.availability h
    JOIN public.barbershop_settings sh ON sh.id = h.barbershop_id AND sh.is_active
    JOIN public.services s ON s.barbershop_id = h.barbershop_id AND s.id = p_service
    JOIN public.barbers b ON b.barbershop_id = h.barbershop_id AND b.id = p_barber
    LEFT JOIN public.appointments a ON a.id = p_exclude AND a.barbershop_id = h.barbershop_id AND a.service_id = p_service
    WHERE h.barbershop_id = p_shop AND h.day_of_week = extract(dow FROM p_date) AND h.is_active
      AND ((s.is_active AND s.duration > 0) OR a.id IS NOT NULL)
  )
  SELECT to_char(candidate.start_at, 'HH24:MI')
  FROM input i
  CROSS JOIN LATERAL generate_series(p_date + i.opening, p_date + i.closing, interval '30 minutes') AS candidate(start_at)
  WHERE candidate.start_at::date = p_date
    AND candidate.start_at >= date_trunc('minute', now() AT TIME ZONE 'America/Fortaleza') + make_interval(mins => p_lead)
    AND barber_internal.window_is_free(p_shop, p_barber, p_date, candidate.start_at::time, i.minutes, p_exclude)
  ORDER BY candidate.start_at;
$$;
