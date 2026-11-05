import "server-only"
import type { createClient } from "@/lib/supabase/server"

type SessionClient = Awaited<ReturnType<typeof createClient>>

export function findMasterAdmin(db: SessionClient, userId: string) {
  return db.from("master_admins").select("id").eq("user_id", userId).maybeSingle()
}

export async function findBarberPanel(db: SessionClient, userId: string) {
  const { data: memberships, error } = await db
    .from("barbershop_members")
    .select("barbershop_id, role, barber_id")
    .eq("user_id", userId)
    .limit(2)

  if (error || memberships?.length !== 1) return null

  const member = memberships[0]
  if (member.role !== "owner" && (member.role !== "staff" || !member.barber_id)) {
    return null
  }

  const { data: shop, error: shopError } = await db
    .from("barbershop_settings")
    .select("slug")
    .eq("id", member.barbershop_id)
    .eq("is_active", true)
    .maybeSingle()

  return !shopError && shop?.slug ? `/${encodeURIComponent(shop.slug)}/barbeiro` : null
}

export async function findLoginPanel(db: SessionClient, userId: string) {
  const { data: master, error } = await findMasterAdmin(db, userId)
  if (error) return null
  return master ? "/adminmaster" : findBarberPanel(db, userId)
}
