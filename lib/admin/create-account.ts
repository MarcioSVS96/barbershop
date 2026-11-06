import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

const accountFields = z.object({
  name: z.string().trim().min(1, "Informe o nome do barbeiro.").max(100, "Use até 100 caracteres no nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(6, "Use uma senha com pelo menos 6 caracteres."),
  shopId: z.string().uuid("Selecione uma barbearia cadastrada."),
  role: z.enum(["owner", "staff"], { message: "Selecione a função do perfil." }),
  whatsapp: z.string().refine((value) => !value || /^[1-9]{2}9[0-9]{8}$/.test(value), {
    message: "Informe um WhatsApp válido com DDD e 9 dígitos.",
  }),
})

type AccountCreation = { error: string } | { whatsappSaved: boolean }

// Only call with a server-side client after authorizing the admin master.
export async function createBarbershopAccount(
  admin: SupabaseClient,
  form: FormData,
  log: (stage: string, code?: string) => void = console.error,
): Promise<AccountCreation> {
  const fields = accountFields.safeParse({
    name: form.get("barber_name") ?? "",
    email: form.get("email") ?? "",
    password: form.get("password") ?? "",
    shopId: form.get("barbershop_id") ?? "",
    role: form.get("role"),
    whatsapp: String(form.get("whatsapp_phone") ?? "").replace(/\D/g, ""),
  })
  if (!fields.success) return { error: fields.error.issues[0].message }

  const { name, email, password, shopId, role, whatsapp } = fields.data
  const shop = await admin.from("barbershop_settings").select("id").eq("id", shopId).maybeSingle()
  if (shop.error) {
    log("[adminmaster] verify shop", shop.error.code)
    return { error: "Não foi possível conferir a barbearia. Tente novamente." }
  }
  if (!shop.data) return { error: "Selecione uma barbearia cadastrada." }

  const { data, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError || !data.user) {
    switch (authError?.code) {
      case "email_exists":
      case "user_already_exists":
        return { error: "Este e-mail já está cadastrado. Confira Perfis e Contas sem vínculo." }
      case "email_address_invalid":
        return { error: "O Supabase recusou o endereço de e-mail. Confira o endereço informado." }
      case "weak_password":
        return { error: "A senha não atende aos requisitos de segurança. Escolha uma senha mais forte." }
      default:
        log("[adminmaster] create account", authError?.code)
        return { error: "Não foi possível criar o acesso. Confira o e-mail e a senha e tente novamente." }
    }
  }

  const userId = data.user.id
  const barberId = crypto.randomUUID()
  const barber = await admin.from("barbers").insert({ id: barberId, name, barbershop_id: shopId })
  const member = barber.error ? null : await admin.from("barbershop_members").insert({
    user_id: userId,
    barbershop_id: shopId,
    role,
    barber_id: barberId,
  })

  let linkError = member?.error
  if (member?.error && (member.status === 0 || member.status >= 500)) {
    // A lost response can hide a committed link. Confirm before undoing it.
    const check = await admin.from("barbershop_members").select("user_id")
      .eq("user_id", userId).eq("barbershop_id", shopId).eq("barber_id", barberId).maybeSingle()
    if (check.error) {
      log("[adminmaster] verify new membership", check.error.code)
      return { error: "Não foi possível confirmar o cadastro. Confira Perfis e Contas sem vínculo antes de tentar novamente." }
    }
    if (check.data) linkError = null
  }

  if (barber.error || linkError) {
    log("[adminmaster] create barber or membership", (barber.error ?? linkError)?.code)
    const { error: authCleanup } = await admin.auth.admin.deleteUser(userId, false)
    if (authCleanup && authCleanup.code !== "user_not_found") {
      log("[adminmaster] clean up new account", authCleanup.code)
      return { error: "O vínculo falhou. Confira este e-mail em Contas sem vínculo antes de tentar novamente." }
    }

    const { error: barberCleanup } = await admin.from("barbers").delete()
      .eq("id", barberId).eq("barbershop_id", shopId)
    if (barberCleanup) {
      log("[adminmaster] clean up new barber", barberCleanup.code)
      return { error: "O vínculo falhou. Confira a lista de barbeiros da barbearia antes de tentar novamente." }
    }
    return { error: "Não foi possível vincular o perfil à barbearia. O cadastro foi desfeito. Tente novamente." }
  }

  if (!whatsapp) return { whatsappSaved: true }
  const { error } = await admin.from("barbershop_settings").update({
    whatsapp_phone: whatsapp,
    updated_at: new Date().toISOString(),
  }).eq("id", shopId)
  if (error) log("[adminmaster] save shop WhatsApp", error.code)
  return { whatsappSaved: !error }
}
