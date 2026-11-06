SET LOCAL lock_timeout TO '5s';

-- Application roles can only be assigned by the privileged account service.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.master_admins, public.barbershop_members
  FROM PUBLIC, anon, authenticated;

-- The owner can publish the booking page. Activation belongs to Admin Master.
REVOKE UPDATE ON public.barbershop_settings FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, description, logo_url, hero_background_url, whatsapp_phone, updated_at)
  ON public.barbershop_settings TO authenticated;
ALTER POLICY barbershop_settings_update_owner ON public.barbershop_settings
  USING (is_active AND EXISTS (
    SELECT 1 FROM public.barbershop_members m
    WHERE m.barbershop_id = barbershop_settings.id AND m.user_id = (SELECT auth.uid()) AND m.role = 'owner'
  ))
  WITH CHECK (is_active AND EXISTS (
    SELECT 1 FROM public.barbershop_members m
    WHERE m.barbershop_id = barbershop_settings.id AND m.user_id = (SELECT auth.uid()) AND m.role = 'owner'
  ));

-- Staff see customer details only through their assigned appointments.
ALTER POLICY clients_auth_all ON public.clients
  USING (public.role_in_shop(barbershop_id) = 'owner')
  WITH CHECK (public.role_in_shop(barbershop_id) = 'owner');
CREATE POLICY clients_select_assigned_staff ON public.clients FOR SELECT TO authenticated
  USING (public.role_in_shop(barbershop_id) = 'staff' AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.client_id = clients.id AND a.barbershop_id = clients.barbershop_id
      AND a.barber_id = public.barber_id_in_shop(clients.barbershop_id)
  ));

-- Public files remain readable. Writes to this bucket are scoped to the shop folder.
CREATE POLICY barbershop_assets_insert_shop_owner ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'barbershop-assets' OR (
    (storage.foldername(objects.name))[1] = 'shops' AND EXISTS (
      SELECT 1 FROM public.barbershop_members m
      JOIN public.barbershop_settings s ON s.id = m.barbershop_id AND s.is_active
      WHERE m.user_id = (SELECT auth.uid()) AND m.role = 'owner'
        AND m.barbershop_id::text = (storage.foldername(objects.name))[2]
    )
  ));
CREATE POLICY barbershop_assets_update_shop_owner ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> 'barbershop-assets' OR (
    (storage.foldername(objects.name))[1] = 'shops' AND EXISTS (
      SELECT 1 FROM public.barbershop_members m
      JOIN public.barbershop_settings s ON s.id = m.barbershop_id AND s.is_active
      WHERE m.user_id = (SELECT auth.uid()) AND m.role = 'owner'
        AND m.barbershop_id::text = (storage.foldername(objects.name))[2]
    )
  ))
  WITH CHECK (bucket_id <> 'barbershop-assets' OR (
    (storage.foldername(objects.name))[1] = 'shops' AND EXISTS (
      SELECT 1 FROM public.barbershop_members m
      JOIN public.barbershop_settings s ON s.id = m.barbershop_id AND s.is_active
      WHERE m.user_id = (SELECT auth.uid()) AND m.role = 'owner'
        AND m.barbershop_id::text = (storage.foldername(objects.name))[2]
    )
  ));
