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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Barbearia Premium</h1>
              <p className="text-sm text-muted-foreground">Agende seu horário online</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-3xl font-bold tracking-tight">Agende seu horário</h2>
            <p className="text-balance text-muted-foreground">
              Escolha o serviço, barbeiro e horário de sua preferência
            </p>
          </div>

          <BookingForm services={services || []} barbers={barbers || []} />
        </div>
      </main>

      <footer className="mt-16 border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Barbearia Premium - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
