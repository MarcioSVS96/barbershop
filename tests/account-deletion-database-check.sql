-- Verifies the installed helper with a fresh random target that has no objects
-- or memberships. It transfers zero objects and never calls Auth deletion.
WITH claims AS MATERIALIZED (
  SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true)
), target AS MATERIALIZED (
  SELECT gen_random_uuid() AS id
)
SELECT public.prepare_account_deletion(
  (SELECT user_id FROM public.master_admins ORDER BY id LIMIT 1),
  target.id, NULL, 'unlinked'
) AS transferred_objects,
  has_function_privilege('anon', 'public.prepare_account_deletion(uuid,uuid,uuid,text)', 'EXECUTE') AS anonymous_can_call,
  has_function_privilege('authenticated', 'public.prepare_account_deletion(uuid,uuid,uuid,text)', 'EXECUTE') AS authenticated_can_call,
  has_function_privilege('service_role', 'public.prepare_account_deletion(uuid,uuid,uuid,text)', 'EXECUTE') AS service_role_can_call
FROM target CROSS JOIN claims
WHERE NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.owner_id = target.id::text OR o.owner = target.id)
  AND NOT EXISTS (SELECT 1 FROM public.barbershop_members m WHERE m.user_id = target.id);
