import { createAdminClient } from "@/lib/supabase/admin"
import { BookingForm } from "@/components/booking-form"
import { CalendarDays, Check, Scissors } from "lucide-react"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = createAdminClient()
  const { slug } = await params

  // ✅ FIX: só permite rota pública se a barbearia estiver ativa
  const { data: shop, error: shopError } = await supabase
    .from("barbershop_settings")
    .select(
      "id, name, description, logo_url, hero_background_url, slug, updated_at, is_active, whatsapp_phone",
    )
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
    .select("id, name, specialty")
    .eq("barbershop_id", barbershopId)
    .order("name", { ascending: true })

  const shopName = shop.name || "Barbearia"
  const shopDesc = shop.description?.trim()

  const publicUrlFromPath = (path: string | null) => {
    if (!path) return ""
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    const { data } = supabase.storage
      .from("barbershop-assets")
      .getPublicUrl(path)
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
  const heroBg = cacheBuster(publicUrlFromPath(shop.hero_background_url), shop.updated_at)

  return (
    <div className="flex min-h-dvh flex-col bg-[#f6f4f0] text-[#172134]">
      <header className="border-b border-[#e7e3db] bg-[#fcfbf8]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#172134] text-[#f4d3b4] sm:size-12">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-full object-cover" />
              ) : (
                <Scissors aria-hidden className="size-5" />
              )}
            </div>
            <p className="min-w-0 break-words text-base font-semibold leading-tight tracking-tight sm:text-lg">{shopName}</p>
          </div>
          <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[#e7e3db] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 sm:inline-flex">
            <CalendarDays aria-hidden className="size-3.5" /> Agenda online
          </span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-start items-start gap-4 px-4 pt-5 pb-8 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-7 lg:py-10">
        <section aria-labelledby="booking-heading" className="relative isolate flex min-w-0 flex-col justify-end overflow-hidden rounded-2xl bg-[#172134] bg-[radial-gradient(ellipse_at_top_right,#3c4e68,transparent_70%)] px-5 py-6 text-white sm:px-7 sm:py-8 lg:min-h-[24rem] lg:rounded-3xl lg:p-8">
          {heroBg ? (
            <>
              <img src={heroBg} alt="" className="pointer-events-none absolute inset-0 -z-20 size-full object-cover" />
              <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-tr from-[#121b2c] via-[#121b2c]/90 to-[#121b2c]/35" />
            </>
          ) : (
            <span aria-hidden className="pointer-events-none absolute -top-36 -right-36 -z-10 size-[25rem] rounded-full border border-[#f4d3b4]/25 ring-28 ring-white/5 lg:-top-22" />
          )}
          <p className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-[#f4d3b4] uppercase sm:mb-3">
            <span aria-hidden className="h-px w-5 bg-current" /> Sua reserva online
          </p>
          <h1 id="booking-heading" className="max-w-[11ch] text-[2rem] leading-[1.06] font-semibold tracking-[-0.045em] sm:text-[2.6rem] lg:text-[3.2rem]">
            Agende seu horário
          </h1>
          <p className="mt-3 max-w-[32ch] break-words text-sm leading-relaxed text-slate-200 sm:text-base">
            {shopDesc || "Escolha o serviço e reserve o melhor horário para você."}
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-200 lg:mt-6">
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-white/10 text-[#f4d3b4]">
              <Check className="size-3" />
            </span>
            Agendamento sem cadastro
          </p>
        </section>

        <BookingForm
          services={services || []}
          barbers={barbers || []}
          barbershopId={barbershopId}
          whatsappPhone={shop.whatsapp_phone}
        />
      </main>

      <footer className="border-t border-[#e7e3db] py-5">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-600 sm:px-6 sm:text-left">
          <p className="break-words">{shopName} · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
