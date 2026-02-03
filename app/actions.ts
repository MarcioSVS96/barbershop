"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type DeleteResult = { ok: true } | { ok: false; error: string }

export async function deleteBarberAndRelated(barbershopId: string, barberId: string): Promise<DeleteResult> {
  if (!barbershopId || !barberId) {
    return { ok: false, error: "Parâmetros inválidos para exclusão." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Usuário não autenticado." }
  }

  const { data: member, error: memberError } = await supabase
    .from("barbershop_members")
    .select("role")
    .eq("barbershop_id", barbershopId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (memberError || !member || member.role !== "owner") {
    return { ok: false, error: "Sem permissão para excluir barbeiros." }
  }

  const { data: targetMember, error: targetMemberError } = await supabase
    .from("barbershop_members")
    .select("role")
    .eq("barbershop_id", barbershopId)
    .eq("barber_id", barberId)
    .maybeSingle()

  if (targetMemberError || !targetMember) {
    return { ok: false, error: "Barbeiro não encontrado ou sem vínculo." }
  }

  if (targetMember.role !== "staff") {
    return { ok: false, error: "Apenas o admin master pode excluir owner." }
  }

  const admin = createAdminClient()

  const { error: paymentsError } = await admin
    .from("payments")
    .delete()
    .eq("barbershop_id", barbershopId)
    .eq("barber_id", barberId)

  if (paymentsError) {
    return { ok: false, error: paymentsError.message || "Falha ao remover pagamentos." }
  }

  const { error: appointmentsError } = await admin
    .from("appointments")
    .delete()
    .eq("barbershop_id", barbershopId)
    .eq("barber_id", barberId)

  if (appointmentsError) {
    return { ok: false, error: appointmentsError.message || "Falha ao remover agendamentos." }
  }

  const { error: membersError } = await admin
    .from("barbershop_members")
    .delete()
    .eq("barbershop_id", barbershopId)
    .eq("barber_id", barberId)

  if (membersError) {
    return { ok: false, error: membersError.message || "Falha ao remover vínculos do barbeiro." }
  }

  const { error: barbersError } = await admin.from("barbers").delete().eq("id", barberId)

  if (barbersError) {
    return { ok: false, error: barbersError.message || "Falha ao remover barbeiro." }
  }

  return { ok: true }
}
