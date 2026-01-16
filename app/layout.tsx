import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { createClient } from "@/lib/supabase/server"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

// ✅ Mantém seus ícones atuais como fallback
const defaultIcons: Metadata["icons"] = {
  icon: [
    {
      url: "/icon-light-32x32.png",
      media: "(prefers-color-scheme: light)",
    },
    {
      url: "/icon-dark-32x32.png",
      media: "(prefers-color-scheme: dark)",
    },
    {
      url: "/icon.svg",
      type: "image/svg+xml",
    },
  ],
  apple: "/apple-icon.png",
}

// ✅ Metadata dinâmico a partir do perfil (barbershop_settings)
export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from("barbershop_settings")
    .select("name, description, logo_url, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const title = settings?.name?.trim() || "Barbearia - Agendamento Online"
  const description = settings?.description?.trim() || "Sistema de agendamento e controle financeiro para barbearia"

  // ✅ Se tiver logo_url, usa como favicon
  // Cache-buster com updated_at ajuda a atualizar o ícone no navegador
  const updatedAtMs = settings?.updated_at ? new Date(settings.updated_at).getTime() : 0
  const logoUrl = settings?.logo_url || ""
  const iconUrl =
    logoUrl && updatedAtMs
      ? `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${updatedAtMs}`
      : logoUrl

  const icons: Metadata["icons"] = iconUrl
    ? {
        icon: iconUrl,
        apple: "/apple-icon.png",
      }
    : defaultIcons

  return {
    title,
    description,
    generator: "v0.app",
    icons,
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
