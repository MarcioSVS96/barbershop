"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireMasterAdmin } from "@/lib/admin/master"

function toString(value: FormDataEntryValue | null) {
  if (typeof value === "string") return value.trim()
  return ""
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

function normalizeRole(role: string) {
  const r = role?.toLowerCase()
  if (r === "owner") return "owner"
  if (r === "staff") return "staff"
  return null
}

/* ============================================================
   BARBEARIAS
============================================================ */

export async function createBarbershop(formData: FormData) {
  await requireMasterAdmin()
  const admin = createAdminClient()

  const name = toString(formData.get("name"))
  const slugInput = toString(formData.get("slug"))
  const description = toString(formData.get("description"))
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
  if (error) throw new Error(error.message)

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
  const isActive = formData.has("is_active")

  if (!id || !name || !slug) {
    throw new Error("Dados obrigatórios ausentes.")
  }

  const { data: currentRow } = await admin
    .from("barbershop_settings")
    .select("slug")
    .eq("id", id)
    .maybeSingle()

  const oldSlug = currentRow?.slug || null

  const payload = {
    name,
    slug,
    description: description || null,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin
    .from("barbershop_settings")
    .update(payload)
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/adminmaster")
  revalidatePath("/")
  if (oldSlug) revalidatePath(`/${oldSlug}`)
  revalidatePath(`/${slug}`)
}

export async function deleteBarbershop(formData: FormData) {
  await requireMasterAdmin()
  const admin = createAdminClient()

  const id = toString(formData.get("id"))
  if (!id) throw new Error("ID obrigatório.")

  const { data: currentRow } = await admin
    .from("barbershop_settings")
    .select("slug")
    .eq("id", id)
    .maybeSingle()

  const oldSlug = currentRow?.slug || null

  const { error } = await admin
    .from("barbershop_settings")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/adminmaster")
  revalidatePath("/")
  if (oldSlug) revalidatePath(`/${oldSlug}`)
}

/* ============================================================
   CRIAÇÃO DE CONTA (OWNER / STAFF)
   → sempre cria barbeiro automaticamente
============================================================ */

export async function createBarbershopUser(formData: FormData) {
  await requireMasterAdmin()
  const admin = createAdminClient()

  const email = toString(formData.get("email"))
  const password = toString(formData.get("password"))
  const barbershopId = toString(formData.get("barbershop_id"))
  const roleRaw = toString(formData.get("role"))

  if (!email || !password || !barbershopId) {
    redirect("/adminmaster?msg=invalid_role")
  }

  const role = normalizeRole(roleRaw)
  if (!role) {
    redirect("/adminmaster?msg=invalid_role")
  }

  /* =============================
     1) CRIA USUÁRIO (AUTH)
  ============================== */

  const { data: userData, error: userError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (userError) {
    const msg = String(userError.message || "").toLowerCase()
    if (
      msg.includes("already") ||
      msg.includes("exists") ||
      msg.includes("email")
    ) {
      redirect("/adminmaster?msg=email_exists")
    }
    throw new Error(userError.message)
  }

  if (!userData?.user) {
    throw new Error("Não foi possível criar o usuário.")
  }

  /* =============================
     2) CRIA BARBEIRO AUTOMÁTICO
  ============================== */

  const barberName =
    email.split("@")[0]?.replace(".", " ") || "Barbeiro"

  const { data: barberData, error: barberError } = await admin
    .from("barbers")
    .insert({
      id: crypto.randomUUID(),
      name: barberName,
      barbershop_id: barbershopId,
    })
    .select("id")
    .single()

  if (barberError || !barberData?.id) {
    throw new Error("Erro ao criar barbeiro automaticamente.")
  }

  /* =============================
     3) VINCULA USER ↔ BARBEIRO
  ============================== */

  const { error: memberError } = await admin
    .from("barbershop_members")
    .insert({
      id: crypto.randomUUID(),
      user_id: userData.user.id,
      barbershop_id: barbershopId,
      role, // owner | staff
      barber_id: barberData.id,
    })

  if (memberError) {
    console.error("[adminmaster] member insert error:", memberError)
    const m = String(memberError.message || "").toLowerCase()
    if (m.includes("role_check") || m.includes("check constraint")) {
      redirect("/adminmaster?msg=invalid_role")
    }
    throw new Error(memberError.message)
  }

  revalidatePath("/adminmaster")
  redirect("/adminmaster?msg=user_created")
}
