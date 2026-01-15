import { createClient } from "@/lib/supabase/server"
import { BookingForm } from "@/components/booking-form"
import { Scissors } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true })

  const { data: barbers } = await supabase.from("barbers").select("*").order("name", { ascending: true })

  // ✅ settings da barbearia (perfil)
  const { data: settings } = await supabase
    .from("barbershop_settings")
    .select("name, description, logo_url, hero_background_url")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const shopName = settings?.name || "Barbearia Premium"
  const shopDesc = settings?.description || "Agende seu horário online"
  const logoUrl = settings?.logo_url || ""
  const heroBg = settings?.hero_background_url || "/bg-barbearia.jpg"

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      {/* HEADER */}
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

      {/* MAIN */}
      <main className="relative overflow-hidden">
        {/* BACKGROUND */}
        <div className="pointer-events-none absolute inset-0">
          {/* imagem */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBg})` }}
          />

          {/* 🔥 overlay mais escuro */}
          <div className="absolute inset-0 bg-black/65" />

          {/* leve degradê pra acabamento */}
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-background" />
        </div>

        <div className="relative container mx-auto px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center text-white">
              <h2 className="mb-2 text-3xl font-bold tracking-tight">Agende seu horário</h2>
              <p className="text-white/80">
                Escolha o serviço, barbeiro e horário de sua preferência
              </p>
            </div>

            {/* FORM branco sólido */}
            <div className="rounded-xl bg-white text-zinc-900 shadow-xl ring-1 ring-black/10">
              <BookingForm services={services || []} barbers={barbers || []} />
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
