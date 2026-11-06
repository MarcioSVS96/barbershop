"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireMasterAdmin } from "@/lib/admin/master"
import { createBarbershopAccount } from "@/lib/admin/create-account"
import { findMasterAdmin } from "@/lib/auth/panel"
import { deleteAccount, type DeleteAccountState } from "@/lib/admin/accounts"

type FormState = { error: string } | null

function toString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function validSlug(slug: string) {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !["adminmaster", "auth", "barbeiro", "api"].includes(slug)
  )
}

function normalizeRole(role: string) {
  const value = role.toLowerCase()
  return value === "owner" || value === "staff" ? value : null
}

function readShop(formData: FormData) {
  const name = toString(formData.get("name"))
  return {
    name,
    slug: toString(formData.get("slug")) || slugify(name),
    description: toString(formData.get("description")) || null,
    whatsapp_phone:
      toString(formData.get("whatsapp_phone")).replace(/\D/g, "") || null,
    updated_at: new Date().toISOString(),
  }
}

function shopWriteError(error: { code?: string; message: string }) {
  return {
    error:
      error.code === "23505"
        ? "Este endereço já está em uso. Escolha outro endereço."
        : "Não foi possível salvar a barbearia. Tente novamente.",
  }
}

function refreshShop(...slugs: (string | null | undefined)[]) {
  revalidatePath("/adminmaster")
  revalidatePath("/")
  for (const slug of new Set(slugs)) {
    if (slug) {
      revalidatePath(`/${slug}`)
      revalidatePath(`/${slug}/barbeiro`)
    }
  }
}

export async function createBarbershop(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMasterAdmin()
  const admin = createAdminClient()
  const shop = readShop(formData)
  if (!shop.name) return { error: "Informe o nome da barbearia." }
  if (!validSlug(shop.slug))
    return {
      error:
        "Escolha um endereço disponível com letras minúsculas, números e hífens.",
    }
  if (shop.whatsapp_phone && !/^[1-9]{2}9[0-9]{8}$/.test(shop.whatsapp_phone)) {
    return { error: "Informe um WhatsApp com DDD e 9 dígitos." }
  }

  const id = crypto.randomUUID()
  const { error } = await admin.from("barbershop_settings").insert({
    ...shop,
    id,
    is_active: formData.has("is_active"),
  })
  if (error) {
    console.error("[adminmaster] create shop", error)
    return shopWriteError(error)
  }

  refreshShop(shop.slug)
  redirect(`/adminmaster?novo=acesso&barbearia=${id}&etapa=2`)
}

export async function updateBarbershop(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMasterAdmin()
  const admin = createAdminClient()
  const id = toString(formData.get("id"))
  const shop = readShop(formData)
  if (!id || !shop.name) return { error: "Informe o nome da barbearia." }
  const { data: current, error: lookupError } = await admin
    .from("barbershop_settings")
    .select("slug, whatsapp_phone")
    .eq("id", id)
    .maybeSingle()
  if (lookupError || !current)
    return { error: "Não foi possível localizar a barbearia." }
  if (shop.slug !== current.slug && !validSlug(shop.slug)) {
    return {
      error:
        "Escolha um endereço disponível com letras minúsculas, números e hífens.",
    }
  }
  if (
    shop.whatsapp_phone &&
    shop.whatsapp_phone !== current.whatsapp_phone &&
    !/^[1-9]{2}9[0-9]{8}$/.test(shop.whatsapp_phone)
  ) {
    return { error: "Informe um WhatsApp com DDD e 9 dígitos." }
  }

  const { error } = await admin
    .from("barbershop_settings")
    .update(shop)
    .eq("id", id)
  if (error) {
    console.error("[adminmaster] update shop", error)
    return shopWriteError(error)
  }
  refreshShop(current.slug, shop.slug)
  redirect("/adminmaster?msg=barbershop_updated")
}

export async function updateBarbershopActive(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMasterAdmin()
  const admin = createAdminClient()
  const id = toString(formData.get("id"))
  const isActive = formData.get("is_active") === "true"
  const { data, error } = await admin
    .from("barbershop_settings")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .maybeSingle()
  if (error || !data)
    return { error: "Não foi possível alterar a situação da barbearia." }
  refreshShop(data.slug)
  redirect(
    `/adminmaster?msg=${isActive ? "barbershop_activated" : "barbershop_deactivated"}`,
  )
}

export async function deleteBarbershop(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMasterAdmin()
  if (formData.get("confirmed") !== "1")
    return { error: "Confirme a exclusão da barbearia." }
  const admin = createAdminClient()
  const id = toString(formData.get("id"))
  const { data: linkedAccounts, error: linksError } = await admin
    .from("barbershop_members")
    .select("user_id")
    .eq("barbershop_id", id)
    .limit(1)
  if (linksError)
    return { error: "Não foi possível conferir os acessos vinculados." }
  if (linkedAccounts?.length)
    return {
      error: "Revise os acessos vinculados antes de excluir a barbearia.",
    }

  const { data, error } = await admin
    .from("barbershop_settings")
    .delete()
    .eq("id", id)
    .select("slug")
    .maybeSingle()
  if (error || !data) {
    console.error("[adminmaster] delete shop", error)
    return {
      error:
        "Não foi possível excluir a barbearia. Verifique se há dados vinculados.",
    }
  }

  refreshShop(data.slug)
  redirect("/adminmaster?msg=barbershop_deleted")
}

export async function createBarbershopUser(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMasterAdmin()
  const onboarding = formData.get("onboarding") === "1"
  if (onboarding) formData.set("role", "owner")

  const result = await createBarbershopAccount(createAdminClient(), formData)
  if ("error" in result) return result

  revalidatePath("/adminmaster")
  const message = result.whatsappSaved ? "user_created" : "user_created_whatsapp_failed"
  if (onboarding) redirect(`/adminmaster?msg=${message}`)
  const shopId = toString(formData.get("barbershop_id"))
  redirect(
    `/adminmaster?tab=acessos&barbearia=${encodeURIComponent(shopId)}&msg=${message}`,
  )
}

export async function updateBarbershopUser(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMasterAdmin()
  const admin = createAdminClient()
  const userId = toString(formData.get("user_id"))
  const currentShopId = toString(formData.get("current_barbershop_id"))
  const nextShopId = toString(formData.get("barbershop_id"))
  const email = toString(formData.get("email"))
  const submittedPassword = formData.get("password")
  const password = typeof submittedPassword === "string" ? submittedPassword : ""
  const role = normalizeRole(toString(formData.get("role")))

  if (
    !userId ||
    !currentShopId ||
    !nextShopId ||
    !email ||
    !role ||
    (password && password.length < 6)
  ) {
    return {
      error: "Confira o e-mail, a função, a barbearia e o tamanho da senha.",
    }
  }

  const [master, membership, shop] = await Promise.all([
    findMasterAdmin(admin, userId),
    admin
      .from("barbershop_members")
      .select("barber_id, role, barber:barbers(name)")
      .eq("user_id", userId)
      .eq("barbershop_id", currentShopId)
      .maybeSingle()
      .overrideTypes<{
        barber_id: string | null
        role: string
        barber: { name: string } | null
      } | null, { merge: false }>(),
    admin
      .from("barbershop_settings")
      .select("id")
      .eq("id", nextShopId)
      .maybeSingle(),
  ])

  if (
    master.error ||
    membership.error ||
    shop.error ||
    !membership.data ||
    !shop.data
  ) {
    return {
      error:
        "Não foi possível conferir o vínculo do acesso. Atualize a página.",
    }
  }
  if (master.data)
    return { error: "Este acesso administrativo está protegido." }

  if (nextShopId !== currentShopId) {
    const existing = await admin
      .from("barbershop_members")
      .select("user_id")
      .eq("user_id", userId)
      .eq("barbershop_id", nextShopId)
      .maybeSingle()
    if (existing.error)
      return {
        error: "Não foi possível conferir o acesso na barbearia de destino.",
      }
    if (existing.data)
      return { error: "A conta já está vinculada à barbearia de destino." }
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email,
    ...(password ? { password } : {}),
  })
  if (authError) {
    if (
      ["email_exists", "user_already_exists"].includes(authError.code ?? "")
    ) {
      return { error: "Este e-mail já está em uso." }
    }
    return {
      error: "Não foi possível atualizar a conta. Confira o e-mail e a senha.",
    }
  }

  const member = membership.data
  let newBarberId: string | null = null
  if (nextShopId !== currentShopId || (role === "staff" && !member.barber_id)) {
    newBarberId = crypto.randomUUID()
    const { error } = await admin.from("barbers").insert({
      id: newBarberId,
      name: member.barber?.name || email.split("@")[0]?.replace(".", " ") || "Barbeiro",
      barbershop_id: nextShopId,
    })
    if (error) {
      console.error("[adminmaster] create barber for edited access", error)
      revalidatePath("/adminmaster")
      return {
        error:
          "Os dados da conta foram salvos. Não foi possível concluir a alteração do vínculo.",
      }
    }
  }

  if (nextShopId !== currentShopId || role !== member.role || newBarberId) {
    const { data: updated, error } = await admin
      .from("barbershop_members")
      .update({
        barbershop_id: nextShopId,
        role,
        barber_id: newBarberId ?? member.barber_id,
      })
      .eq("user_id", userId)
      .eq("barbershop_id", currentShopId)
      .select("user_id")
      .maybeSingle()
    if (error || !updated) {
      console.error("[adminmaster] update access membership", error)
      if (newBarberId && error && error.code === "23505") {
        await admin
          .from("barbers")
          .delete()
          .eq("id", newBarberId)
          .eq("barbershop_id", nextShopId)
      }
      revalidatePath("/adminmaster")
      return {
        error:
          "Os dados da conta foram salvos. Não foi possível concluir a alteração do vínculo.",
      }
    }
  }

  revalidatePath("/adminmaster")
  redirect(
    `/adminmaster?tab=acessos&barbearia=${encodeURIComponent(nextShopId)}&msg=profile_updated`,
  )
}

export async function deleteMemberAndUser(
  _previousState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const { user } = await requireMasterAdmin()
  const scope = toString(formData.get("scope"))
  if (scope !== "linked" && scope !== "unlinked")
    return { error: "Selecione a conta novamente antes de excluir." }
  try {
    const result = await deleteAccount(createAdminClient(), {
      actorId: user.id,
      userId: toString(formData.get("user_id")),
      barbershopId: toString(formData.get("barbershop_id")) || null,
      scope,
      confirmed: formData.get("confirmed") === "1",
    })
    if (!result.ok) return { error: result.error }
  } catch (error) {
    console.error("[adminmaster] account deletion failed:", error)
    return {
      error:
        "Não foi possível concluir a exclusão. Verifique a configuração de acesso administrativo e tente novamente.",
    }
  }
  revalidatePath("/adminmaster")
  revalidatePath("/barbeiro")
  redirect("/adminmaster?tab=acessos&msg=profile_deleted")
}
