import Link from "next/link"
import { Scissors } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Shop = {
  id: string
  name: string | null
  description: string | null
  logo_url: string | null
  slug: string | null
  updated_at: string | null
  is_active?: boolean | null
}

type ServiceRow = {
  id: string
  name: string
  price: number
  duration: number
  description: string | null
  barbershop_id: string
  is_active: boolean
}

function publicUrlFromPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const { data } = supabase.storage.from("barbershop-assets").getPublicUrl(path)
  return data.publicUrl
}

export default async function RootPage() {
  const supabase = await createClient()

  const { data: shops } = await supabase
    .from("barbershop_settings")
    .select("id, name, description, logo_url, slug, updated_at, is_active")
    .order("name", { ascending: true })

  const { data: services } = await supabase
    .from("services")
    .select("id, name, price, duration, description, barbershop_id, is_active")
    .eq("is_active", true)
    .order("price", { ascending: true })

  const shopsList = (shops || []).filter((shop) => shop.is_active !== false)
  const servicesList = services || []

  const servicesByShop = new Map<string, ServiceRow[]>()
  for (const service of servicesList) {
    const list = servicesByShop.get(service.barbershop_id) || []
    list.push(service)
    servicesByShop.set(service.barbershop_id, list)
  }

  const formatCurrency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/30">
      <header className="border-b bg-card/70 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Scissors className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Serviços das Barbearias</h1>
              <p className="text-sm text-muted-foreground">Escolha uma barbearia e veja os serviços disponíveis</p>
            </div>
          </div>

          <Button asChild variant="outline">
            <Link href="/auth/login">Área administrativa</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        {shopsList.length === 0 ? (
          <Card className="border-muted/60">
            <CardHeader>
              <CardTitle>Nenhuma barbearia ativa</CardTitle>
              <CardDescription>Cadastre uma barbearia no painel master para aparecer aqui.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {shopsList.map((shop) => {
              const shopServices = servicesByShop.get(shop.id) || []
              const logoUrl = publicUrlFromPath(supabase, shop.logo_url)
              const shopName = shop.name || "Barbearia"
              const shopDesc = shop.description || "Serviços profissionais para você"

              return (
                <Card key={shop.id} className="border-muted/60 shadow-sm">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/30 overflow-hidden">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt={`Logo ${shopName}`} className="h-full w-full object-cover" />
                        ) : (
                          <Scissors className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{shopName}</CardTitle>
                        <CardDescription>{shopDesc}</CardDescription>
                        {shop.slug ? <Badge variant="outline">/{shop.slug}</Badge> : null}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Serviços em destaque</div>
                      {shopServices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum serviço ativo cadastrado.</p>
                      ) : (
                        <div className="space-y-2">
                          {shopServices.slice(0, 4).map((service) => (
                            <div key={service.id} className="flex items-center justify-between rounded-lg border bg-muted/10 px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">{service.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {service.duration} min • {service.description || "Atendimento profissional"}
                                </p>
                              </div>
                              <span className="text-sm font-semibold">{formatCurrency.format(service.price || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {shopServices.length} serviço(s) ativo(s)
                      </div>
                      {shop.slug ? (
                        <Button asChild>
                          <Link href={`/${shop.slug}`}>Ver agendamentos</Link>
                        </Button>
                      ) : (
                        <Button variant="outline" disabled>
                          Slug não definido
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
