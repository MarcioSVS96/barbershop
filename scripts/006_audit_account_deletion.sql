-- READ-ONLY AUDIT. Does not delete users, memberships, files or shop records.
-- Run with authorized administrative access to the correct Supabase project.

-- 1. References that may block Auth deletion, including whether memberships cascade.
SELECT c.conname AS constraint_name,
       c.conrelid::regclass AS referencing_table,
       c.confrelid::regclass AS referenced_table,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.contype = 'f'
  AND (c.confrelid = 'auth.users'::regclass
       OR c.conrelid = 'public.barbershop_members'::regclass)
ORDER BY referencing_table::text, constraint_name;

-- 2. User-defined delete triggers may also block an Auth transaction.
SELECT t.tgname AS trigger_name, t.tgrelid::regclass AS table_name,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
WHERE NOT t.tgisinternal
  AND t.tgrelid IN ('auth.users'::regclass, 'public.barbershop_members'::regclass)
ORDER BY table_name::text, trigger_name;

-- 3. Unlinked accounts require manual review; absence of a membership does NOT
-- prove that an account is disposable. Master admins are explicitly excluded.
SELECT u.id, u.email, u.created_at,
       (SELECT count(*) FROM storage.objects o
        WHERE coalesce(to_jsonb(o)->>'owner_id', to_jsonb(o)->>'owner') = u.id::text
       ) AS owned_storage_objects
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.barbershop_members m WHERE m.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.master_admins a WHERE a.user_id = u.id)
ORDER BY u.created_at DESC;

-- 4. A membership without a corresponding Auth user needs separate cleanup.
SELECT m.user_id, m.barbershop_id
FROM public.barbershop_members m
LEFT JOIN auth.users u ON u.id = m.user_id
WHERE u.id IS NULL;
