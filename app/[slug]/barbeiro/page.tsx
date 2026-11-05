import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { CashExpense } from "@/lib/barber/expenses"
import { BarberWorkspace } from "@/components/barber/workspace"
import type { Availability } from "@/components/availability-management"
import type {
  Appointment,
  Barber,
  BarbershopSettings,
  BookingBlock,
  Payment,
  Service,
} from "@/lib/types"

export const dynamic = "force-dynamic"

async function allRows<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const rows: T[] = []
  const size = 500
  for (let offset = 0; ; offset += size) {
    const result = await read(offset, offset + size - 1)
    if (result.error) return { data: [], error: result.error }
    rows.push(...(result.data || []))
    if ((result.data?.length || 0) < size) return { data: rows, error: null }
  }
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect("/auth/login?reason=slugbarbeiro_no_user")

  const { data: shop } = await db
    .from("barbershop_settings")
    .select(
      "id, name, slug, description, logo_url, hero_background_url, whatsapp_phone, updated_at, is_active",
    )
    .eq("slug", slug)
    .maybeSingle()
  if (!shop) notFound()
  if (!shop.is_active) redirect("/auth/login?reason=shop_inactive")

  const { data: member } = await db
    .from("barbershop_members")
    .select("role, barber_id")
    .eq("user_id", user.id)
    .eq("barbershop_id", shop.id)
    .maybeSingle()
  if (
    !member ||
    (member.role !== "owner" && (member.role !== "staff" || !member.barber_id))
  ) {
    redirect("/auth/login?reason=slugbarbeiro_no_membership")
  }
  const role = member.role as "owner" | "staff"
  const barberId = member.barber_id as string | null
  const staff = role === "staff"

  const apptQuery = db
    .from("appointments")
    .select(
      "*, clients(id, name, phone), barbers(id, name), services(id, name)",
    )
    .eq("barbershop_id", shop.id)
    .order("appointment_date")
    .order("appointment_time")
    .order("id")
  const paymentQuery = db
    .from("payments")
    .select("*, appointments(barber_id)")
    .eq("barbershop_id", shop.id)
    .order("payment_date", { ascending: false })
    .order("id")
  const barberQuery = db
    .from("barbers")
    .select("id, name, specialty")
    .eq("barbershop_id", shop.id)
    .order("name")

  const [appointments, payments, barbers, services, hours, blocks, expenses] =
    await Promise.all([
      allRows((from, to) =>
        (staff ? apptQuery.eq("barber_id", barberId!) : apptQuery).range(
          from,
          to,
        ),
      ),
      allRows((from, to) =>
        (staff ? paymentQuery.eq("barber_id", barberId!) : paymentQuery).range(
          from,
          to,
        ),
      ),
      staff ? barberQuery.eq("id", barberId!) : barberQuery,
      db
        .from("services")
        .select("*")
        .eq("barbershop_id", shop.id)
        .order("name"),
      db
        .from("availability")
        .select("*")
        .eq("barbershop_id", shop.id)
        .order("day_of_week"),
      allRows((from, to) =>
        db
          .from("booking_blocks")
          .select("id, barber_id, block_date, start_time, end_time, reason")
          .eq("barbershop_id", shop.id)
          .order("block_date")
          .order("id")
          .range(from, to),
      ),
      staff
        ? Promise.resolve({ data: [], error: null })
        : allRows((from, to) =>
            db
              .from("cash_expenses")
              .select(
                "id, description, category, amount, paid_on, created_at, voided_at",
              )
              .eq("barbershop_id", shop.id)
              .order("paid_on", { ascending: false })
              .order("id")
              .range(from, to),
          ),
    ])
  const failedSections = [
    appointments.error && "agendamentos",
    payments.error && "recebimentos",
    barbers.error && "profissionais",
    services.error && "serviços",
    hours.error && "horários",
    blocks.error && "bloqueios",
    expenses.error && "despesas",
  ].filter(Boolean) as string[]
  if (failedSections.length)
    console.error("[barbeiro] failed to load", failedSections)

  const path = shop.logo_url || ""
  const url =
    !path || /^https?:\/\//.test(path)
      ? path
      : db.storage.from("barbershop-assets").getPublicUrl(path).data.publicUrl
  const logoUrl =
    url && shop.updated_at
      ? `${url}${url.includes("?") ? "&" : "?"}v=${new Date(shop.updated_at).getTime()}`
      : url

  return (
    <BarberWorkspace
      shop={shop as BarbershopSettings & { slug: string }}
      role={role}
      barberId={barberId}
      logoUrl={logoUrl}
      appointments={appointments.data as Appointment[]}
      payments={payments.data as Payment[]}
      barbers={(barbers.data || []) as Barber[]}
      services={(services.data || []) as Service[]}
      availability={(hours.data || []) as Availability[]}
      blocks={blocks.data as BookingBlock[]}
      expenses={expenses.data as CashExpense[]}
      failedSections={failedSections}
    />
  )
}
