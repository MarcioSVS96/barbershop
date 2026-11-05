"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { findLoginPanel } from "@/lib/auth/panel"
import { createClient } from "@/lib/supabase/server"

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
})

export async function signIn(_previous: { error: string } | null, formData: FormData) {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  const invalidCredentials = { error: "E-mail ou senha inválidos." }
  if (!parsed.success) return invalidCredentials

  const db = await createClient()
  const { data, error } = await db.auth.signInWithPassword(parsed.data)
  if (error || !data.user || !data.session) return invalidCredentials

  const destination = await findLoginPanel(db, data.user.id)
  if (!destination) {
    await db.auth.signOut({ scope: "local" })
    return { error: "Sua conta precisa de um vínculo ativo para acessar o painel." }
  }

  redirect(destination)
}
