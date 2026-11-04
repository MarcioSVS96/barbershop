-- Internal preparation for an explicitly confirmed admin-master deletion.
-- Creating this function does not delete users or change existing ownership.
-- It preserves business images when their original uploader's login is removed.
CREATE OR REPLACE FUNCTION public.prepare_account_deletion(
  p_actor_id uuid,
  p_user_id uuid,
  p_barbershop_id uuid,
  p_scope text
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  transferred_count integer;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Operação restrita ao servidor administrativo.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.master_admins WHERE user_id = p_actor_id) THEN
    RAISE EXCEPTION 'Administrador inválido.' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_actor_id = p_user_id
     OR EXISTS (SELECT 1 FROM public.master_admins WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Contas de admin master não podem ser excluídas.' USING ERRCODE = '23514';
  END IF;

  -- Recheck the scope in the same transaction as the ownership transfer.
  IF p_scope = 'unlinked' AND p_barbershop_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.barbershop_members WHERE user_id = p_user_id) THEN
      RAISE EXCEPTION 'A conta possui vínculo com uma barbearia. Atualize a página antes de excluir.' USING ERRCODE = '23514';
    END IF;
  ELSIF p_scope = 'linked' AND p_barbershop_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.barbershop_members WHERE user_id = p_user_id AND barbershop_id = p_barbershop_id)
       OR EXISTS (SELECT 1 FROM public.barbershop_members WHERE user_id = p_user_id AND barbershop_id <> p_barbershop_id) THEN
      RAISE EXCEPTION 'Os vínculos da conta mudaram. Atualize a página antes de excluir.' USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Escopo de exclusão inválido.' USING ERRCODE = '23514';
  END IF;

  -- Only the application's business-assets bucket is eligible. Other kinds of
  -- files need separate review; never silently delete them or broaden access.
  IF EXISTS (
    SELECT 1 FROM storage.objects
    WHERE (owner_id = p_user_id::text OR owner = p_user_id)
      AND bucket_id <> 'barbershop-assets'
  ) THEN
    RAISE EXCEPTION 'A conta possui arquivos em outros espaços. Revise esses arquivos antes de excluir.' USING ERRCODE = '23514';
  END IF;

  -- Ownership metadata only: paths, bytes, URLs and access policies stay intact.
  -- Keep the legacy owner field in sync with the current owner_id field.
  UPDATE storage.objects
  SET owner_id = p_actor_id::text, owner = p_actor_id
  WHERE bucket_id = 'barbershop-assets'
    AND (owner_id = p_user_id::text OR owner = p_user_id);
  GET DIAGNOSTICS transferred_count = ROW_COUNT;
  RETURN transferred_count;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid, uuid, uuid, text) TO service_role;
COMMENT ON FUNCTION public.prepare_account_deletion(uuid, uuid, uuid, text) IS
  'Service-role only. Rechecks master-admin scope and preserves shop assets before a confirmed Auth deletion.';
