import { createClient } from "@/lib/supabase/server"
import { BookingForm } from "@/components/booking-form"
import { Scissors } from "lucide-react"
import { notFound } from "next/navigation"

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { slug } = await params

  // ✅ FIX: só permite rota pública se a barbearia estiver ativa
  const { data: shop, error: shopError } = await supabase
    .from("barbershop_settings")
    .select("id, name, description, logo_url, hero_background_url, slug, updated_at, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()

  if (shopError) {
    // opcional: log em dev
    console.error("[public] shopError:", shopError)
  }

  if (!shop) notFound()

  const barbershopId = shop.id

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("barbershop_id", barbershopId)
    .eq("is_active", true)
    .order("price", { ascending: true })

  const { data: barbers } = await supabase
    .from("barbers")
    .select("*")
    .eq("barbershop_id", barbershopId)
    .order("name", { ascending: true })

  const shopName = shop.name || "Barbearia"
  const shopDesc = shop.description || "Agende seu horário online"

  const publicUrlFromPath = (path: string | null) => {
    if (!path) return ""
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    const { data } = supabase.storage.from("barbershop-assets").getPublicUrl(path)
    return data.publicUrl
  }

  const cacheBuster = (url: string | null, updatedAt?: string | null) => {
    if (!url) return ""
    if (!updatedAt) return url
    const hasQuery = url.includes("?")
    const version = new Date(updatedAt).getTime()
    return `${url}${hasQuery ? "&" : "?"}v=${version}`
  }

  const logoUrl = cacheBuster(publicUrlFromPath(shop.logo_url), shop.updated_at)
  const heroBg = shop.hero_background_url
    ? cacheBuster(publicUrlFromPath(shop.hero_background_url), shop.updated_at)
    : "/bg-barbearia.jpg"

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Scissors className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{shopName}</h1>
              <p className="text-sm text-muted-foreground">{shopDesc}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-background" />
        </div>

        <div className="relative container mx-auto px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center text-white">
              <h2 className="mb-2 text-3xl font-bold tracking-tight">Agende seu horário</h2>
              <p className="text-white/80">Escolha o serviço, barbeiro e horário de sua preferência</p>
            </div>

            <div className="rounded-xl bg-white text-zinc-900 shadow-xl ring-1 ring-black/10">
              <BookingForm services={services || []} barbers={barbers || []} barbershopId={barbershopId} />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{shopName} - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
