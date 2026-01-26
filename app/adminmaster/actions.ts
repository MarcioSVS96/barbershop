"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireMasterAdmin } from "@/lib/admin/master"

function toString(value: FormDataEntryValue | null) {
  if (typeof value === "string") return value.trim()
  return ""
}

// Mantive (pode ser útil em outros campos), mas para checkbox é melhor usar formData.has(...)
function toBool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true"
}

function slugify(input: string) {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

  return base || "barbearia"
}

export async function createBarbershop(formData: FormData) {
  await requireMasterAdmin()
  const admin = createAdminClient()

  const name = toString(formData.get("name"))
  const slugInput = toString(formData.get("slug"))
  const description = toString(formData.get("description"))

  // ✅ checkbox: desmarcado => não vem no FormData
  const isActive = formData.has("is_active")

  if (!name) {
    throw new Error("Nome obrigatório.")
  }

  const slug = slugInput || slugify(name)

  const payload = {
    id: crypto.randomUUID(),
    name,
    slug,
    description: description || null,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from("barbershop_settings").insert(payload)
  if (error) {
    throw new Error(error.message)
  }

  // ✅ revalida admin + público
  revalidatePath("/adminmaster")
  revalidatePath("/")
  revalidatePath(`/${slug}`)
}

export async function updateBarbershop(formData: FormData) {
  await requireMasterAdmin()
  const admin = createAdminClient()

  const id = toString(formData.get("id"))
  const name = toString(formData.get("name"))
  const slug = toString(formData.get("slug"))
  const description = toString(formData.get("description"))

  // ✅ checkbox: desmarcado => não vem no FormData
  const isActive = formData.has("is_active")

  if (!id || !name || !slug) {
    throw new Error("Dados obrigatórios ausentes.")
  }

  // ✅ pega slug antigo para revalidar a rota antiga também (caso tenha mudado)
  const { data: currentRow, error: currentError } = await admin
    .from("barbershop_settings")
    .select("slug")
    .eq("id", id)
    .maybeSingle()

  if (currentError) {
    throw new Error(currentError.message)
  }

  const oldSlug = currentRow?.slug || null

  const payload = {
    name,
    slug,
    description: description || null,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from("barbershop_settings").update(payload).eq("id", id)
  if (error) {
    throw new Error(error.message)
  }

  // ✅ revalida admin + público
  revalidatePath("/adminmaster")
  revalidatePath("/")
  if (oldSlug) revalidatePath(`/${oldSlug}`)
  revalidatePath(`/${slug}`)
}

export async function deleteBarbershop(formData: FormData) {
  await requireMasterAdmin()
  const admin = createAdminClient()

  const id = toString(formData.get("id"))
  if (!id) {
    throw new Error("ID obrigatório.")
  }

  // ✅ pega slug antes de deletar para revalidar a rota pública
  const { data: currentRow, error: currentError } = await admin
    .from("barbershop_settings")
    .select("slug")
    .eq("id", id)
    .maybeSingle()

  if (currentError) {
    throw new Error(currentError.message)
  }

  const oldSlug = currentRow?.slug || null

  const { error } = await admin.from("barbershop_settings").delete().eq("id", id)
  if (error) {
    throw new Error(error.message)
  }

  // ✅ revalida admin + público
  revalidatePath("/adminmaster")
  revalidatePath("/")
  if (oldSlug) revalidatePath(`/${oldSlug}`)
}

export async function createBarbershopUser(formData: FormData) {
  await requireMasterAdmin()
  const admin = createAdminClient()

  const email = toString(formData.get("email"))
  const password = toString(formData.get("password"))
  const barbershopId = toString(formData.get("barbershop_id"))
  const role = toString(formData.get("role")) || "owner"

  if (!email || !password || !barbershopId) {
    throw new Error("Email, senha e barbearia são obrigatórios.")
  }

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (userError || !userData?.user) {
    throw new Error(userError?.message || "Não foi possível criar o usuário.")
  }

  const { error: memberError } = await admin.from("barbershop_members").insert({
    user_id: userData.user.id,
    barbershop_id: barbershopId,
    role,
  })

  if (memberError) {
    throw new Error(memberError.message)
  }

  revalidatePath("/adminmaster")
}
