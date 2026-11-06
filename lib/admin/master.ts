import { redirect } from "next/navigation"
import { findMasterAdmin } from "@/lib/auth/panel"
import { createClient } from "@/lib/supabase/server"

export async function requireMasterAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login?reason=master_no_user")
  }

  const { data: adminRow, error: adminError } = await findMasterAdmin(supabase, user.id)

  if (adminError || !adminRow) {
    redirect("/auth/login?reason=master_forbidden")
  }

  return { supabase, user }
}
