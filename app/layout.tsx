import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono, Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-primary",
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-code",
})

/**
 * ✅ Branding GLOBAL do seu SaaS (vale para / e /auth/*)
 * Rotas /[slug] devem ter o próprio layout + generateMetadata.
 */
const APP_NAME = "Agenda Barber"
const APP_DESCRIPTION = "Plataforma de agendamento e gestão para barbearias."

// ✅ Mantém seus ícones atuais como fallback (do projeto)
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
    // fallback comum (se existir)
    { url: "/favicon.ico" },
  ],
  apple: "/apple-icon.png",
}

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s • ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  generator: "v0.app",
  icons: defaultIcons,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
