import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // 1) pega uma barbearia que o usuário tem acesso
  const { data: membership, error: membershipError } = await supabase
    .from("barbershop_members")
    .select("barbershop_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    // se der erro de query, evita quebrar em produção
    redirect("/auth/login")
  }

  if (!membership?.barbershop_id) {
    // usuário logado mas sem vínculo com nenhuma barbearia
    redirect("/auth/login")
  }

  // 2) resolve o slug da barbearia
  const { data: shop, error: shopError } = await supabase
    .from("barbershop_settings")
    .select("slug")
    .eq("id", membership.barbershop_id)
    .maybeSingle()

  if (shopError || !shop?.slug) {
    redirect("/auth/login")
  }

  // 3) manda para a rota multi-tenant correta
  redirect(`/${shop.slug}/barbeiro`)
}
