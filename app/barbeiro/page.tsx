import { redirect } from "next/navigation"
import { findBarberPanel } from "@/lib/auth/panel"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const db = await createClient()
  const { data: { user }, error } = await db.auth.getUser()
  if (error || !user) redirect("/auth/login")

  const destination = await findBarberPanel(db, user.id)
  redirect(destination ?? "/auth/login")
}
