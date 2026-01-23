import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: shop } = await supabase
    .from("barbershop_settings")
    .select("name, description, logo_url")
    .eq("slug", slug)
    .single()

  if (!shop) return {}

  const publicUrlFromPath = (path: string | null) => {
    if (!path) return ""
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    const { data } = supabase.storage.from("barbershop-assets").getPublicUrl(path)
    return data.publicUrl
  }

  return {
    title: shop.name || "Barbearia",
    description: shop.description || "Agende seu horário online",
    icons: {
      icon: publicUrlFromPath(shop.logo_url) || "/favicon.ico",
    },
  }
}

export default function SlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
