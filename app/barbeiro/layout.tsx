import type React from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import type { BarbershopSettings } from "@/lib/types"

// Ícones padrão (fallback) iguais ao seu app/layout.tsx
const defaultIcons: Metadata["icons"] = {
  icon: [
    { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
    { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    { url: "/icon.svg", type: "image/svg+xml" },
  ],
  apple: "/apple-icon.png",
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()

  let settings: BarbershopSettings | null = null

  try {
    const { data: settingsRows } = await supabase
      .from("barbershop_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)

    settings = (settingsRows?.[0] as BarbershopSettings) ?? null
  } catch {
    settings = null
  }

  const barbershopName = settings?.name?.trim() || "Barbearia"
  const title = `Painel do Barbeiro | ${barbershopName}`

  // Se tiver logo_url, usa como favicon do admin.
  // Senão, mantém os padrões do app.
  const icons: Metadata["icons"] = settings?.logo_url
    ? {
        icon: settings.logo_url,
        apple: "/apple-icon.png",
      }
    : defaultIcons

  return {
    title,
    description: "Área administrativa do barbeiro",
    icons,
  }
}

export default function BarbeiroLayout({ children }: { children: React.ReactNode }) {
  return children
}
