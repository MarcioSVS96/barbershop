import { redirect } from "next/navigation"
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

  const { data: adminRow, error: adminError } = await supabase
    .from("master_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (adminError || !adminRow) {
    redirect("/auth/login?reason=master_forbidden")
  }

  return { supabase, user }
}
