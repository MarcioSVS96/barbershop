-- Preserve existing reservations and enforce their full duration on new writes.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS barber_internal;
REVOKE ALL ON SCHEMA barber_internal FROM PUBLIC, anon, authenticated;
SET LOCAL search_path TO public, extensions;
SET LOCAL lock_timeout TO '5s';

ALTER TABLE public.appointments
  ADD COLUMN booking_source text NOT NULL DEFAULT 'site'
    CHECK (booking_source IN ('site', 'whatsapp', 'balcao', 'telefone')),
  ADD CONSTRAINT appointments_workflow_status_check
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  ADD CONSTRAINT appointments_no_overlapping_service
    EXCLUDE USING gist (
      barber_id WITH =,
      tsrange(appointment_date + appointment_time,
        appointment_date + appointment_time + make_interval(mins => coalesce(service_duration_at_booking, 30)),
        '[)') WITH &&
    ) WHERE (status IN ('pending', 'confirmed'));

CREATE UNIQUE INDEX payments_one_per_appointment ON public.payments (appointment_id);

CREATE TABLE public.booking_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershop_settings(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
  block_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  reason text CHECK (length(reason) <= 120)
);
CREATE INDEX booking_blocks_shop_date ON public.booking_blocks (barbershop_id, block_date);
ALTER TABLE public.booking_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_blocks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.booking_blocks TO authenticated;
GRANT ALL ON public.booking_blocks TO service_role;
CREATE POLICY blocks_read ON public.booking_blocks FOR SELECT TO authenticated
  USING (public.user_has_shop(barbershop_id) AND (
    public.role_in_shop(barbershop_id) = 'owner' OR barber_id IS NULL OR barber_id = public.barber_id_in_shop(barbershop_id)
  ));
CREATE POLICY blocks_create ON public.booking_blocks FOR INSERT TO authenticated
  WITH CHECK (public.role_in_shop(barbershop_id) = 'owner');
CREATE POLICY blocks_remove ON public.booking_blocks FOR DELETE TO authenticated
  USING (public.role_in_shop(barbershop_id) = 'owner');

-- The deployed schema has two permissive update policies. Apply the same
-- barber scope to the resulting row in both, not just the original row.
ALTER POLICY appointments_auth_update ON public.appointments
  WITH CHECK (public.user_has_shop(barbershop_id) AND (
    public.role_in_shop(barbershop_id) = 'owner' OR barber_id = public.barber_id_in_shop(barbershop_id)
  ));

CREATE FUNCTION barber_internal.window_is_free(
  p_shop uuid, p_barber uuid, p_date date, p_time time, p_minutes integer, p_exclude uuid
) RETURNS boolean
LANGUAGE sql VOLATILE SET search_path = ''
AS $$
  SELECT p_minutes > 0 AND EXISTS (
    SELECT 1 FROM public.availability h
    WHERE h.barbershop_id = p_shop AND h.day_of_week = extract(dow FROM p_date) AND h.is_active
      AND p_time >= h.start_time
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
REVOKE ALL ON FUNCTION barber_internal.window_is_free(uuid,uuid,date,time,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA barber_internal TO service_role;
GRANT EXECUTE ON FUNCTION barber_internal.window_is_free(uuid,uuid,date,time,integer,uuid) TO service_role;

CREATE FUNCTION barber_internal.guard_appointment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_service public.services%ROWTYPE;
  v_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'booking_invalid_status' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO v_service FROM public.services
    WHERE id = NEW.service_id AND barbershop_id = NEW.barbershop_id AND is_active;
    IF NOT FOUND OR v_service.duration <= 0 THEN
      RAISE EXCEPTION 'booking_invalid_service' USING ERRCODE = '23514';
    END IF;
    NEW.service_duration_at_booking := v_service.duration;
    NEW.service_price_at_booking := v_service.price;
    v_changed := true;
  ELSE
    IF (NEW.barbershop_id, NEW.service_id, NEW.client_id)
      IS DISTINCT FROM (OLD.barbershop_id, OLD.service_id, OLD.client_id) THEN
      RAISE EXCEPTION 'booking_invalid_change' USING ERRCODE = '23514';
    END IF;
    NEW.service_duration_at_booking := OLD.service_duration_at_booking;
    NEW.service_price_at_booking := OLD.service_price_at_booking;
    NEW.booking_source := OLD.booking_source;
    v_changed := (NEW.appointment_date, NEW.appointment_time, NEW.barber_id)
      IS DISTINCT FROM (OLD.appointment_date, OLD.appointment_time, OLD.barber_id)
      OR (NEW.status IN ('pending', 'confirmed') AND OLD.status NOT IN ('pending', 'confirmed'));
  END IF;

  IF v_changed THEN
    -- Serialize schedule changes across appointments, one-off blocks and
    -- weekly availability for the same shop. The exclusion constraint also
    -- prevents overlapping appointments if concurrent transactions race.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.barbershop_id::text, 8471));
    IF NOT EXISTS (SELECT 1 FROM public.barbershop_settings s WHERE s.id = NEW.barbershop_id AND s.is_active)
      OR NOT EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = NEW.barber_id AND b.barbershop_id = NEW.barbershop_id)
      OR NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = NEW.client_id AND c.barbershop_id = NEW.barbershop_id)
      OR NEW.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'booking_invalid_scope' USING ERRCODE = '23514';
    END IF;
    IF NEW.appointment_date + NEW.appointment_time <
         date_trunc('minute', now() AT TIME ZONE 'America/Fortaleza')
      OR NOT barber_internal.window_is_free(NEW.barbershop_id, NEW.barber_id, NEW.appointment_date,
         NEW.appointment_time, coalesce(NEW.service_duration_at_booking, 30), NEW.id) THEN
      RAISE EXCEPTION 'booking_unavailable' USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION barber_internal.guard_appointment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_appointment_window BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION barber_internal.guard_appointment();

CREATE FUNCTION barber_internal.lock_weekly_schedule()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(CASE WHEN TG_OP = 'DELETE' THEN OLD.barbershop_id::text ELSE NEW.barbershop_id::text END, 8471));
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION barber_internal.lock_weekly_schedule() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER serialize_weekly_schedule BEFORE INSERT OR UPDATE OR DELETE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION barber_internal.lock_weekly_schedule();

CREATE FUNCTION barber_internal.guard_block()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_conflict text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.barbershop_id::text, 8471));
  IF NEW.barber_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.barbers b WHERE b.id = NEW.barber_id AND b.barbershop_id = NEW.barbershop_id
  ) THEN
    RAISE EXCEPTION 'booking_invalid_scope' USING ERRCODE = '23514';
  END IF;
  SELECT to_char(a.appointment_time, 'HH24:MI') INTO v_conflict
  FROM public.appointments a
  WHERE a.barbershop_id = NEW.barbershop_id AND a.appointment_date = NEW.block_date
    AND (NEW.barber_id IS NULL OR a.barber_id = NEW.barber_id)
    AND a.status IN ('pending', 'confirmed')
    AND a.appointment_time < NEW.end_time
    AND a.appointment_date + a.appointment_time + make_interval(mins => coalesce(a.service_duration_at_booking, 30)) > NEW.block_date + NEW.start_time
  ORDER BY a.appointment_time LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'booking_block_conflict' USING ERRCODE = '23P01', DETAIL = v_conflict;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION barber_internal.guard_block() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_block_window BEFORE INSERT OR UPDATE ON public.booking_blocks
  FOR EACH ROW EXECUTE FUNCTION barber_internal.guard_block();

CREATE FUNCTION public.booking_available_starts(
  p_shop uuid, p_barber uuid, p_service uuid, p_date date, p_exclude uuid DEFAULT NULL, p_lead integer DEFAULT 5
) RETURNS TABLE (start_time text)
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$
  WITH input AS (
    SELECT h.start_time AS opening, h.end_time AS closing, h.breaks,
      CASE WHEN a.id IS NOT NULL THEN coalesce(a.service_duration_at_booking, 30) ELSE s.duration END AS minutes
    FROM public.availability h
    JOIN public.barbershop_settings sh ON sh.id = h.barbershop_id AND sh.is_active
    JOIN public.services s ON s.barbershop_id = h.barbershop_id AND s.id = p_service
    JOIN public.barbers b ON b.barbershop_id = h.barbershop_id AND b.id = p_barber
    LEFT JOIN public.appointments a ON a.id = p_exclude AND a.barbershop_id = h.barbershop_id AND a.service_id = p_service
    WHERE h.barbershop_id = p_shop AND h.day_of_week = extract(dow FROM p_date) AND h.is_active
      AND ((s.is_active AND s.duration > 0) OR a.id IS NOT NULL)
  ), candidates AS (
    SELECT tick AS at FROM input,
      LATERAL generate_series(p_date + opening, p_date + closing, interval '15 minutes') tick
    UNION
    SELECT p_date + a.appointment_time + make_interval(mins => coalesce(a.service_duration_at_booking, 30))
    FROM public.appointments a
    WHERE a.barber_id = p_barber AND a.appointment_date = p_date AND a.id IS DISTINCT FROM p_exclude
      AND a.status IN ('pending', 'confirmed')
    UNION
    SELECT p_date + b.end_time FROM public.booking_blocks b
    WHERE b.barbershop_id = p_shop AND b.block_date = p_date AND (b.barber_id IS NULL OR b.barber_id = p_barber)
    UNION
    SELECT CASE WHEN item->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' THEN p_date + (item->>'end')::time END
    FROM input, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(breaks) = 'array' THEN breaks ELSE '[]'::jsonb END) item
  )
  SELECT to_char(c.at, 'HH24:MI')
  FROM candidates c CROSS JOIN input i
  WHERE c.at::date = p_date AND c.at >= date_trunc('minute', now() AT TIME ZONE 'America/Fortaleza') + make_interval(mins => p_lead)
    AND barber_internal.window_is_free(p_shop, p_barber, p_date, c.at::time, i.minutes, p_exclude)
  ORDER BY c.at;
$$;
REVOKE ALL ON FUNCTION public.booking_available_starts(uuid,uuid,uuid,date,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_available_starts(uuid,uuid,uuid,date,uuid,integer) TO service_role;

CREATE FUNCTION public.create_service_booking(
  p_shop uuid, p_barber uuid, p_service uuid, p_date date, p_time time,
  p_name text, p_phone text, p_notes text, p_source text, p_actor uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_client uuid;
  v_booking uuid;
BEGIN
  IF p_source = 'site' THEN
    IF p_actor IS NOT NULL OR p_date + p_time < date_trunc('minute', now() AT TIME ZONE 'America/Fortaleza') + interval '5 minutes' THEN
      RAISE EXCEPTION 'booking_unavailable' USING ERRCODE = '23P01';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.barbershop_members m
    WHERE m.user_id = p_actor AND m.barbershop_id = p_shop
      AND (m.role = 'owner' OR (m.role = 'staff' AND m.barber_id = p_barber))
  ) THEN
    RAISE EXCEPTION 'booking_invalid_scope' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_shop::text, 8471));
  SELECT c.id INTO v_client FROM public.clients c
  WHERE c.barbershop_id = p_shop AND regexp_replace(c.phone, '[^0-9]', '', 'g') = p_phone
  ORDER BY c.created_at, c.id LIMIT 1;
  IF v_client IS NULL THEN
    INSERT INTO public.clients(barbershop_id, name, phone) VALUES (p_shop, p_name, p_phone)
    RETURNING id INTO v_client;
  END IF;
  INSERT INTO public.appointments(barbershop_id, barber_id, service_id, client_id, appointment_date, appointment_time, status, notes, booking_source)
  VALUES (p_shop, p_barber, p_service, v_client, p_date, p_time, 'confirmed', p_notes, p_source)
  RETURNING id INTO v_booking;
  RETURN v_booking;
END;
$$;
REVOKE ALL ON FUNCTION public.create_service_booking(uuid,uuid,uuid,date,time,text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_booking(uuid,uuid,uuid,date,time,text,text,text,text,uuid) TO service_role;

CREATE FUNCTION public.record_service_receipt(
  p_shop uuid, p_appointment uuid, p_actor uuid, p_amount numeric, p_method text
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_booking public.appointments%ROWTYPE;
  v_id uuid;
  v_amount numeric := round(p_amount, 2);
BEGIN
  IF v_amount IS NULL OR v_amount <= 0 OR v_amount > 999999.99
    OR p_method IS NULL OR p_method NOT IN ('pix', 'card', 'cash') THEN
    RAISE EXCEPTION 'receipt_invalid' USING ERRCODE = '23514';
  END IF;
  SELECT a.* INTO v_booking FROM public.appointments a
  JOIN public.barbershop_settings s ON s.id = a.barbershop_id AND s.is_active
  JOIN public.barbershop_members m ON m.barbershop_id = a.barbershop_id AND m.user_id = p_actor
  WHERE a.id = p_appointment AND a.barbershop_id = p_shop
    AND (m.role = 'owner' OR (m.role = 'staff' AND m.barber_id = a.barber_id))
  FOR UPDATE OF a;
  IF NOT FOUND OR v_booking.status <> 'completed' THEN
    RAISE EXCEPTION 'receipt_invalid_appointment' USING ERRCODE = '23514';
  END IF;
  -- Preserve the legacy breakdown for stored receipts. The new cash view
  -- reports gross amounts received and does not present a commission.
  INSERT INTO public.payments(barbershop_id, appointment_id, barber_id, amount, payment_method, payment_date, barber_commission, barbershop_revenue)
  VALUES (p_shop, p_appointment, v_booking.barber_id, v_amount, p_method, now(), round(v_amount * 0.6, 2), v_amount - round(v_amount * 0.6, 2))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_service_receipt(uuid,uuid,uuid,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_service_receipt(uuid,uuid,uuid,numeric,text) TO service_role;
