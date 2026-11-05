import { redirect } from "next/navigation"
import { findLoginPanel } from "@/lib/auth/panel"
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

  const destination = await findLoginPanel(supabase, user.id)
  redirect(destination ?? "/auth/login")
}
