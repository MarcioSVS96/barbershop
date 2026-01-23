import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    redirect("/auth/login?reason=barbeiro_getuser_error")
  }

  if (!user) {
    redirect("/auth/login?reason=barbeiro_no_user")
  }

  // 1) busca TODAS as barbearias que o usuário tem acesso
  const { data: memberships, error: membershipError } = await supabase
    .from("barbershop_members")
    .select("barbershop_id")
    .eq("user_id", user.id)

  if (membershipError) {
    redirect("/auth/login?reason=barbeiro_membership_error")
  }

  if (!memberships || memberships.length === 0) {
    redirect("/auth/login?reason=barbeiro_no_membership")
  }

  // ✅ evita cair na barbearia errada quando o usuário tem mais de um vínculo
  // (mais tarde você pode criar uma tela /choose-barbershop para seleção)
  if (memberships.length > 1) {
    redirect("/auth/login?reason=barbeiro_multiple_memberships")
  }

  const barbershopId = memberships[0].barbershop_id

  // 2) resolve o slug da barbearia
  const { data: shop, error: shopError } = await supabase
    .from("barbershop_settings")
    .select("slug")
    .eq("id", barbershopId)
    .maybeSingle()

  if (shopError) {
    redirect("/auth/login?reason=barbeiro_shop_error")
  }

  if (!shop?.slug) {
    redirect("/auth/login?reason=barbeiro_no_shop_slug")
  }

  // 3) manda para a rota multi-tenant correta
  redirect(`/${shop.slug}/barbeiro`)
}
