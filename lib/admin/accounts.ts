import type { SupabaseClient, User } from "@supabase/supabase-js"

export type DeleteAccountInput = {
  actorId: string
  userId: string
  barbershopId: string | null
  scope: "linked" | "unlinked"
  confirmed: boolean
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; code: string; error: string }

export type DeleteAccountState = { error: string } | null

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Only call with a server-side service-role client after authorizing the actor.
// Auth must succeed BEFORE any application membership is removed.
export async function deleteAccount(
  admin: SupabaseClient,
  input: DeleteAccountInput,
  log: (stage: string, error: unknown) => void = console.error,
): Promise<DeleteAccountResult> {
  const fail = (code: string, error: string): DeleteAccountResult => ({
    ok: false,
    code,
    error,
  })
  if (!input.confirmed)
    return fail("confirmation_required", "Confirme a exclusão da conta.")
  if (
    !uuid.test(input.userId) ||
    !uuid.test(input.actorId) ||
    (input.scope !== "linked" && input.scope !== "unlinked") ||
    (input.scope === "linked" &&
      (!input.barbershopId || !uuid.test(input.barbershopId))) ||
    (input.scope === "unlinked" && input.barbershopId !== null)
  ) {
    return fail(
      "invalid_input",
      "Os dados da conta são inválidos. Atualize a página e tente novamente.",
    )
  }
  if (input.userId === input.actorId)
    return fail(
      "protected_account",
      "Você não pode excluir a própria conta de administrador.",
    )

  const { data: master, error: masterError } = await admin
    .from("master_admins")
    .select("user_id")
    .eq("user_id", input.userId)
    .maybeSingle()
  if (masterError) {
    log("[deleteAccount] master lookup", masterError)
    return fail(
      "lookup_failed",
      "Não foi possível conferir a proteção desta conta. Nenhuma exclusão foi iniciada.",
    )
  }
  if (master)
    return fail(
      "protected_account",
      "Contas de admin master não podem ser excluídas por esta ação.",
    )

  const { data: memberships, error: membershipError } = await admin
    .from("barbershop_members")
    .select("user_id, barbershop_id")
    .eq("user_id", input.userId)
  if (membershipError) {
    log("[deleteAccount] membership lookup", membershipError)
    return fail(
      "lookup_failed",
      "Não foi possível conferir os vínculos da conta. Nenhuma exclusão foi iniciada.",
    )
  }
  const links = memberships || []
  if (input.scope === "unlinked" && links.length > 0) {
    return fail(
      "scope_changed",
      "Esta conta agora possui vínculo com uma barbearia. Atualize a página e revise o perfil antes de excluir.",
    )
  }
  if (
    input.scope === "linked" &&
    !links.some((link) => link.barbershop_id === input.barbershopId)
  ) {
    return fail(
      "scope_changed",
      "O vínculo selecionado não existe mais. Atualize a página antes de excluir a conta.",
    )
  }
  if (
    input.scope === "linked" &&
    links.some((link) => link.barbershop_id !== input.barbershopId)
  ) {
    return fail(
      "multiple_shops",
      "Esta conta atende mais de uma barbearia. A exclusão foi bloqueada para preservar os outros acessos.",
    )
  }

  const { error: preparationError } = await admin.rpc(
    "prepare_account_deletion",
    {
      p_actor_id: input.actorId,
      p_user_id: input.userId,
      p_barbershop_id: input.barbershopId,
      p_scope: input.scope,
    },
  )
  if (preparationError) {
    log("[deleteAccount] storage ownership preparation", preparationError)
    return fail(
      "preparation_failed",
      preparationError.code === "23514"
        ? preparationError.message
        : "Não foi possível preparar a exclusão e preservar os arquivos da barbearia. Nenhum vínculo foi removido. Tente novamente.",
    )
  }

  const { error: authError } = await admin.auth.admin.deleteUser(
    input.userId,
    false,
  )
  // A previous successful Auth deletion may have left a membership if its cleanup
  // failed. Retrying can finish it; other errors must never remove memberships.
  if (authError && authError.code !== "user_not_found") {
    log("[deleteAccount] auth deletion", {
      userId: input.userId,
      code: authError.code,
      message: authError.message,
    })
    return fail(
      "auth_failed",
      "O Supabase não conseguiu excluir a conta de acesso. O vínculo foi preservado. Verifique as dependências da conta e tente novamente.",
    )
  }

  if (links.length > 0) {
    const { error: cleanupError } = await admin
      .from("barbershop_members")
      .delete()
      .eq("user_id", input.userId)
      .eq("barbershop_id", input.barbershopId!)
    if (cleanupError) {
      log("[deleteAccount] membership cleanup", cleanupError)
      return fail(
        "cleanup_failed",
        "A conta de acesso foi excluída, mas o vínculo ainda precisa ser removido. Tente confirmar novamente para concluir a limpeza.",
      )
    }
  }
  return { ok: true }
}

export async function listAllAuthUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = []
  const perPage = 200
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) return users
  }
}

// Missing access to either application table must never classify real accounts
// as unlinked. The caller passes null when a query could not be completed.
export function findUnlinkedAccounts(
  users: User[],
  memberships: { user_id: string }[] | null,
  masters: { user_id: string }[] | null,
  actorId: string,
): User[] {
  if (memberships === null || masters === null) return []
  const protectedIds = new Set([
    actorId,
    ...masters.map((row) => row.user_id),
    ...memberships.map((row) => row.user_id),
  ])
  return users.filter((user) => !protectedIds.has(user.id))
}
