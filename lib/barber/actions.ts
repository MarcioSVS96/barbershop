"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizePhone, shopDate, shopTime } from "./time"
import { expenseCategories } from "./expenses"

const uuid = z.string().uuid()
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
  })
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const bookingKey = z.object({
  shopId: uuid,
  barberId: uuid,
  serviceId: uuid,
  date,
})
const bookingInput = bookingKey.extend({
  time,
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .max(30)
    .transform(normalizePhone)
    .refine((value) => /^\d{10,11}$/.test(value)),
  notes: z.string().trim().max(500).optional(),
})

type Failure = { ok: false; error: string }
const failure = (error: string): Failure => ({ ok: false, error })

function bookingError(error: {
  code?: string
  message: string
  details?: string | null
}) {
  if (error.message === "booking_block_conflict") {
    const hour = error.details?.match(/^\d{2}:\d{2}$/)?.[0]
    return failure(
      hour
        ? `Há um atendimento às ${hour} nesse intervalo. Remarque-o antes de bloquear.`
        : "Remarque o atendimento desse intervalo antes de bloquear.",
    )
  }
  if (error.code === "23P01" || error.code === "23505") {
    return failure(
      "Esse horário já está ocupado ou o serviço não cabe no período. Escolha outro horário.",
    )
  }
  if (error.message === "booking_invalid_service")
    return failure("Este serviço não está disponível.")
  return failure("Não foi possível salvar. Confira os dados e tente novamente.")
}

async function memberOf(shopId: string) {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null
  const [member, shop] = await Promise.all([
    db
      .from("barbershop_members")
      .select("role, barber_id")
      .eq("barbershop_id", shopId)
      .eq("user_id", user.id)
      .maybeSingle(),
    db
      .from("barbershop_settings")
      .select("slug, is_active")
      .eq("id", shopId)
      .maybeSingle(),
  ])
  if (
    !member.data ||
    (member.data.role !== "owner" && member.data.role !== "staff") ||
    !shop.data?.is_active
  )
    return null
  return {
    db,
    userId: user.id,
    role: member.data.role as "owner" | "staff",
    barberId: member.data.barber_id as string | null,
    slug: shop.data.slug as string,
  }
}

function refresh(slug: string) {
  revalidatePath(`/${slug}/barbeiro`)
  revalidatePath(`/${slug}`)
}

export async function availableBookingTimes(input: unknown) {
  const parsed = bookingKey
    .extend({ panel: z.boolean().optional(), appointmentId: uuid.optional() })
    .safeParse(input)
  if (!parsed.success)
    return failure("Escolha o serviço, o profissional e uma data válida.")
  const data = parsed.data
  if (data.panel || data.appointmentId) {
    const member = await memberOf(data.shopId)
    if (
      !member ||
      (member.role === "staff" && member.barberId !== data.barberId)
    )
      return failure("Você não tem acesso a essa agenda.")
    if (data.appointmentId) {
      const { data: current } = await member.db
        .from("appointments")
        .select("id")
        .eq("id", data.appointmentId)
        .eq("barbershop_id", data.shopId)
        .eq("service_id", data.serviceId)
        .in("status", ["pending", "confirmed"])
        .maybeSingle()
      if (!current)
        return failure("Este agendamento não está disponível para remarcação.")
    }
  }

  const { data: times, error } = await createAdminClient().rpc(
    "booking_available_starts",
    {
      p_shop: data.shopId,
      p_barber: data.barberId,
      p_service: data.serviceId,
      p_date: data.date,
      p_exclude: data.appointmentId ?? null,
      p_lead: data.panel ? 0 : 5,
    },
  )
  if (error) {
    console.error("[agenda] available times", error.code)
    return failure("Não foi possível consultar os horários. Tente atualizar.")
  }
  return {
    ok: true as const,
    times: (times || []).map((row: { start_time: string }) => row.start_time),
  }
}

async function saveBooking(
  input: z.infer<typeof bookingInput>,
  source: string,
  actor: string | null,
) {
  const { error } = await createAdminClient().rpc("create_service_booking", {
    p_shop: input.shopId,
    p_barber: input.barberId,
    p_service: input.serviceId,
    p_date: input.date,
    p_time: input.time,
    p_name: input.name,
    p_phone: input.phone,
    p_notes: input.notes || null,
    p_source: source,
    p_actor: actor,
  })
  if (error) return bookingError(error)
  return { ok: true as const }
}

export async function createPublicBooking(input: unknown) {
  const parsed = bookingInput.safeParse(input)
  if (!parsed.success)
    return failure("Confira o nome, o telefone com DDD e o horário escolhido.")
  return saveBooking(parsed.data, "site", null)
}

export async function createManualBooking(input: unknown) {
  const parsed = bookingInput
    .extend({ source: z.enum(["whatsapp", "balcao", "telefone"]) })
    .safeParse(input)
  if (!parsed.success)
    return failure("Confira o nome, o telefone com DDD e o horário escolhido.")
  const data = parsed.data
  const member = await memberOf(data.shopId)
  if (!member || (member.role === "staff" && member.barberId !== data.barberId))
    return failure("Você não pode reservar para esse profissional.")
  const result = await saveBooking(data, data.source, member.userId)
  if (result.ok) refresh(member.slug)
  return result
}

export async function rescheduleBooking(input: unknown) {
  const parsed = bookingKey
    .extend({ time, appointmentId: uuid })
    .safeParse(input)
  if (!parsed.success) return failure("Escolha um novo horário.")
  const data = parsed.data
  const member = await memberOf(data.shopId)
  if (!member || (member.role === "staff" && member.barberId !== data.barberId))
    return failure("Você não pode remarcar para esse profissional.")
  const { data: saved, error } = await member.db
    .from("appointments")
    .update({
      appointment_date: data.date,
      appointment_time: data.time,
      barber_id: data.barberId,
    })
    .eq("id", data.appointmentId)
    .eq("barbershop_id", data.shopId)
    .eq("service_id", data.serviceId)
    .in("status", ["pending", "confirmed"])
    .select("id")
    .maybeSingle()
  if (error) return bookingError(error)
  if (!saved)
    return failure("Este agendamento já foi alterado ou você não tem acesso.")
  refresh(member.slug)
  return { ok: true as const }
}

export async function changeBookingStatus(input: unknown) {
  const parsed = z
    .object({
      shopId: uuid,
      appointmentId: uuid,
      status: z.enum(["confirmed", "completed", "cancelled", "no_show"]),
    })
    .safeParse(input)
  if (!parsed.success) return failure("Ação inválida.")
  const { shopId, appointmentId, status } = parsed.data
  const member = await memberOf(shopId)
  if (!member) return failure("Você não tem acesso a essa agenda.")
  let query = member.db
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("barbershop_id", shopId)
    .in(
      "status",
      status === "confirmed"
        ? ["pending"]
        : status === "completed"
          ? ["confirmed"]
          : ["pending", "confirmed"],
    )
  if (member.role === "staff")
    query = query.eq("barber_id", member.barberId || "")
  if (status === "completed" || status === "no_show") {
    query = query.or(
      `appointment_date.lt.${shopDate()},and(appointment_date.eq.${shopDate()},appointment_time.lte.${shopTime()}:59)`,
    )
  }
  const { data, error } = await query.select("id").maybeSingle()
  if (error) return bookingError(error)
  if (!data)
    return failure(
      "Confira a situação e o horário do atendimento antes de atualizar.",
    )
  refresh(member.slug)
  return { ok: true as const }
}

export async function setBookingBlock(input: unknown) {
  const parsed = z
    .object({
      shopId: uuid,
      barberId: uuid.nullable(),
      date,
      start: time,
      end: time,
      reason: z.string().trim().max(120),
    })
    .refine((value) => value.start < value.end && value.date >= shopDate())
    .safeParse(input)
  if (!parsed.success)
    return failure("Informe uma data válida e um fim posterior ao início.")
  const data = parsed.data
  const member = await memberOf(data.shopId)
  if (!member || member.role !== "owner")
    return failure("Somente o responsável pode bloquear horários.")
  const { error } = await member.db.from("booking_blocks").insert({
    barbershop_id: data.shopId,
    barber_id: data.barberId,
    block_date: data.date,
    start_time: data.start,
    end_time: data.end,
    reason: data.reason || null,
  })
  if (error) return bookingError(error)
  refresh(member.slug)
  return { ok: true as const }
}

export async function removeBookingBlock(input: unknown) {
  const parsed = z.object({ shopId: uuid, blockId: uuid }).safeParse(input)
  if (!parsed.success) return failure("Bloqueio inválido.")
  const { shopId, blockId } = parsed.data
  const member = await memberOf(shopId)
  if (!member || member.role !== "owner")
    return failure("Somente o responsável pode remover bloqueios.")
  const { error } = await member.db
    .from("booking_blocks")
    .delete()
    .eq("id", blockId)
    .eq("barbershop_id", shopId)
  if (error) return bookingError(error)
  refresh(member.slug)
  return { ok: true as const }
}

export async function recordBookingReceipt(input: unknown) {
  const parsed = z
    .object({
      shopId: uuid,
      appointmentId: uuid,
      amount: z.number().finite().positive().max(999999.99),
      method: z.enum(["pix", "card", "cash"]),
    })
    .safeParse(input)
  if (!parsed.success)
    return failure("Confira o valor e a forma de recebimento.")
  const { shopId, appointmentId, amount, method } = parsed.data
  const member = await memberOf(shopId)
  if (!member) return failure("Você não tem acesso a esse recebimento.")
  const { error } = await createAdminClient().rpc("record_service_receipt", {
    p_shop: shopId,
    p_appointment: appointmentId,
    p_actor: member.userId,
    p_amount: amount,
    p_method: method,
  })
  if (error?.code === "23505")
    return failure("Já existe um recebimento para esse atendimento.")
  if (error)
    return failure(
      "Confira se o atendimento foi concluído e está disponível para recebimento.",
    )
  refresh(member.slug)
  return { ok: true as const }
}

export async function createCashExpense(input: unknown) {
  const parsed = z
    .object({
      id: uuid,
      shopId: uuid,
      description: z.string().trim().min(2).max(120),
      category: z.enum(expenseCategories),
      amount: z
        .number()
        .finite()
        .min(0.01)
        .max(999999.99)
        .refine(
          (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
        ),
      paidOn: date.refine((value) => value <= shopDate()),
    })
    .safeParse(input)
  if (!parsed.success)
    return failure("Confira a descrição, o valor e a data do pagamento.")

  const { id, shopId, description, category, amount, paidOn } = parsed.data
  const member = await memberOf(shopId)
  if (!member || member.role !== "owner")
    return failure("Somente o responsável pode registrar despesas.")

  const { error } = await member.db.from("cash_expenses").insert({
    id,
    barbershop_id: shopId,
    description,
    category,
    amount,
    paid_on: paidOn,
  })
  if (error?.code === "23505") {
    // A retry after a dropped response should find the same entry, not add it again.
    const { data } = await member.db
      .from("cash_expenses")
      .select("description, category, amount, paid_on, voided_at")
      .eq("barbershop_id", shopId)
      .eq("id", id)
      .maybeSingle()
    if (
      !data ||
      data.voided_at ||
      data.description !== description ||
      data.category !== category ||
      Number(data.amount) !== amount ||
      data.paid_on !== paidOn
    ) {
      return failure(
        "Confira os lançamentos do caixa antes de tentar novamente.",
      )
    }
  } else if (error) {
    return failure("Não foi possível registrar a despesa. Tente novamente.")
  }

  revalidatePath(`/${member.slug}/barbeiro`)
  return { ok: true as const }
}

export async function voidCashExpense(input: unknown) {
  const parsed = z.object({ shopId: uuid, id: uuid }).safeParse(input)
  if (!parsed.success) return failure("Despesa inválida.")

  const { shopId, id } = parsed.data
  const member = await memberOf(shopId)
  if (!member || member.role !== "owner")
    return failure("Somente o responsável pode cancelar despesas.")

  const { data, error } = await member.db
    .from("cash_expenses")
    .update({ voided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("barbershop_id", shopId)
    .is("voided_at", null)
    .select("id")
    .maybeSingle()
  if (error) return failure("Não foi possível cancelar a despesa.")
  if (!data)
    return failure("A despesa já foi cancelada ou não está disponível.")

  revalidatePath(`/${member.slug}/barbeiro`)
  return { ok: true as const }
}
