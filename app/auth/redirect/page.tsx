import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AuthRedirectPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login?reason=redirect_no_user")
  }

  const { data: masterRow, error: masterError } = await supabase
    .from("master_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (masterError) {
    redirect("/auth/login?reason=redirect_master_error")
  }

  if (masterRow) {
    redirect("/adminmaster")
  }

  redirect("/barbeiro")
}
