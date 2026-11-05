"use client"

import type { CashExpense } from "@/lib/barber/expenses"
import { CashView } from "./cash-view"
import { PublicPageSettings } from "./public-page-settings"
import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  LogOut,
  Plus,
  Scissors,
  Settings,
  Wallet,
  MessageCircle,
  LayoutDashboard,
  CheckCircle2,
  BriefcaseBusiness,
  Users,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  endOfService,
  money,
  normalizePhone,
  shopDate,
  shopTime,
} from "@/lib/barber/time"
import { changeBookingStatus, removeBookingBlock } from "@/lib/barber/actions"
import type {
  Appointment,
  Barber,
  BarbershopSettings,
  BookingBlock,
  Payment,
  Service,
} from "@/lib/types"
import {
  AvailabilityManagement,
  type Availability,
} from "../availability-management"
import { ServiceManagement } from "../service-management"
import { ProfileManagement } from "../profile-management"
import {
  BarberSheet,
  BookingEditor,
  BlockEditor,
  ReceiptEditor,
  FormError,
  fieldClass,
  primaryClass,
} from "./forms"

const sections = [
  { value: "today", name: "Hoje", Icon: LayoutDashboard },
  { value: "agenda", name: "Agenda", Icon: CalendarDays },
  { value: "cash", name: "Caixa", Icon: Wallet },
  { value: "settings", name: "Configurações", Icon: Settings },
] as const
type Section = (typeof sections)[number]["value"]
type Setup = "services" | "hours" | "team" | "page"
type OpenPanel =
  | { type: "new" | "block" }
  | { type: "details" | "move" | "receipt"; id: string }
type Props = {
  shop: BarbershopSettings & { slug: string }
  canManageShop: boolean
  barberId: string | null
  logoUrl: string
  appointments: Appointment[]
  payments: Payment[]
  expenses: CashExpense[]
  barbers: Barber[]
  services: Service[]
  availability: Availability[]
  blocks: BookingBlock[]
  failedSections: string[]
}

const statusLabels: Record<Appointment["status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
}
const statusStyles: Record<Appointment["status"], string> = {
  pending: "bg-amber-50 text-amber-900 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-900 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  no_show: "bg-rose-50 text-rose-900 ring-rose-200",
}
const sources = {
  site: "Site",
  whatsapp: "WhatsApp",
  balcao: "Balcão",
  telefone: "Telefone",
}
const panelClass = "rounded-2xl border border-slate-200 bg-white"
const dateLabel = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Fortaleza",
})
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Fortaleza",
})

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function displayDate(date: string, full = false) {
  return (full ? dateLabel : shortDate).format(new Date(`${date}T12:00:00Z`))
}

function activeAppointment(appointment: Appointment) {
  return appointment.status === "pending" || appointment.status === "confirmed"
}

function Status({ appointment }: { appointment: Appointment }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${statusStyles[appointment.status] ?? statusStyles.pending}`}
    >
      {statusLabels[appointment.status] || appointment.status}
    </span>
  )
}

function Empty({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-2 px-5 py-10 text-center">
      <CalendarDays aria-hidden className="mx-auto size-5 text-slate-500" />
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mx-auto max-w-md text-sm text-slate-600">{detail}</p>
      {children ? (
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {children}
        </div>
      ) : null}
    </div>
  )
}

function BookingRows({
  appointments,
  showDate,
  select,
}: {
  appointments: Appointment[]
  showDate?: boolean
  select: (id: string) => void
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {appointments.map((a) => (
        <li
          key={a.id}
          className="grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-5"
        >
          <div>
            {showDate ? (
              <p className="text-xs text-slate-600">
                {displayDate(a.appointment_date)}
              </p>
            ) : null}
            <p className="font-semibold tabular-nums">
              {a.appointment_time.slice(0, 5)}
            </p>
            <p className="text-xs tabular-nums text-slate-600">
              até{" "}
              {endOfService(a.appointment_time, a.service_duration_at_booking)}
            </p>
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="break-words text-sm font-semibold">
              {a.clients?.name || "Cliente"}
            </p>
            <p className="break-words text-xs text-slate-600">
              {a.services?.name || "Serviço"}
              {a.barbers?.name ? ` · ${a.barbers.name}` : ""}
            </p>
            <Status appointment={a} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shadow-none"
            onClick={() => select(a.id)}
            aria-label={`Detalhes de ${a.clients?.name || "cliente"} às ${a.appointment_time.slice(0, 5)}`}
          >
            Detalhes
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function BarberWorkspace({
  shop,
  canManageShop,
  barberId,
  logoUrl,
  appointments,
  payments,
  expenses,
  barbers,
  services,
  availability,
  blocks,
  failedSections,
}: Props) {
  const router = useRouter()
  const [section, setSection] = useState<Section>("today")
  const [setup, setSetup] = useState<Setup>(
    canManageShop ? "services" : "team",
  )
  const [date, setDate] = useState(shopDate)
  const [week, setWeek] = useState(false)
  const [professional, setProfessional] = useState("")
  const [open, setOpen] = useState<OpenPanel>()
  const [message, setMessage] = useState("")
  const [actionError, setActionError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<"cancelled" | "no_show">()
  const owner = canManageShop
  const today = shopDate()
  const now = shopTime()
  const pageUrl = `/${shop.slug}`
  const activeServices = services.filter((s) => s.is_active)
  const hasHours = availability.some((a) => a.is_active)
  const canBook = !!(activeServices.length && barbers.length && hasHours)
  const setupMissing = owner && failedSections.length === 0 && !canBook
  const bookedToday = appointments.filter(
    (a) =>
      a.appointment_date === today &&
      !["cancelled", "no_show"].includes(a.status),
  )
  const upcoming = bookedToday.filter(
    (a) => activeAppointment(a) && a.appointment_time.slice(0, 5) >= now,
  )
  const next = upcoming[0]
  const paidIds = new Set(payments.map((p) => p.appointment_id))
  const filteredAppointments = appointments.filter(
    (a) =>
      (!professional || a.barber_id === professional) &&
      a.appointment_date >= date &&
      a.appointment_date <= (week ? shiftDate(date, 6) : date),
  )
  const shownBlocks = blocks.filter(
    (b) =>
      (!professional || !b.barber_id || b.barber_id === professional) &&
      b.block_date >= date &&
      b.block_date <= (week ? shiftDate(date, 6) : date),
  )
  const unpaid = appointments.filter(
    (a) =>
      a.status === "completed" &&
      !paidIds.has(a.id) &&
      (!professional || a.barber_id === professional),
  )
  const receivedToday = payments.reduce(
    (sum, p) =>
      sum +
      (p.payment_date && shopDate(new Date(p.payment_date)) === today
        ? Number(p.amount)
        : 0),
    0,
  )
  const appointment =
    open && "id" in open
      ? appointments.find((a) => a.id === open.id)
      : undefined
  const phone = normalizePhone(appointment?.clients?.phone || "")
  const pastStart =
    appointment &&
    (appointment.appointment_date < today ||
      (appointment.appointment_date === today &&
        appointment.appointment_time.slice(0, 5) <= now))

  function close() {
    setOpen(undefined)
    setConfirm(undefined)
    setActionError("")
  }

  function finish(text: string, nextDate?: string) {
    close()
    if (nextDate) {
      setDate(nextDate)
      setSection("agenda")
      setProfessional("")
    }
    setMessage(text)
    router.refresh()
  }

  function showSetup(tab: Setup) {
    setSection("settings")
    setSetup(tab)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        new URL(pageUrl, location.origin).href,
      )
      setMessage("Link da agenda copiado.")
    } catch {
      setMessage(
        "Abra a página de agendamento e copie o endereço do navegador.",
      )
    }
  }

  async function updateStatus(
    status: "confirmed" | "completed" | "cancelled" | "no_show",
  ) {
    if (!appointment) return
    setBusy(true)
    setActionError("")
    try {
      const result = await changeBookingStatus({
        shopId: shop.id,
        appointmentId: appointment.id,
        status,
      })
      if (!result.ok) setActionError(result.error)
      else
        finish(
          status === "completed"
            ? "Atendimento concluído. O recebimento pode ser lançado no caixa."
            : "Situação do atendimento atualizada.",
        )
    } catch {
      setActionError("Não foi possível atualizar o atendimento.")
    } finally {
      setBusy(false)
    }
  }

  async function removeBlock(id: string) {
    setBusy(true)
    setActionError("")
    try {
      const result = await removeBookingBlock({ shopId: shop.id, blockId: id })
      if (!result.ok) setActionError(result.error)
      else finish("Bloqueio removido.")
    } catch {
      setActionError("Não foi possível remover o bloqueio.")
    } finally {
      setBusy(false)
    }
  }

  const newBooking = (
    <Button
      className={primaryClass}
      onClick={() => setOpen({ type: "new" })}
      disabled={!canBook}
    >
      <Plus aria-hidden /> Novo agendamento
    </Button>
  )
  const professionalFilter =
    owner && barbers.length > 1 ? (
      <select
        aria-label="Filtrar por profissional"
        className={`${fieldClass} sm:w-48`}
        value={professional}
        onChange={(event) => setProfessional(event.target.value)}
      >
        <option value="">Toda a equipe</option>
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    ) : null

  return (
    <div className="min-h-dvh bg-[#f4f6f9] text-slate-950 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 bg-[#131e32] text-white lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-5 lg:py-7">
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#e2283d]">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Scissors aria-hidden className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{shop.name}</p>
            <p className="text-xs text-slate-300">
              {owner ? "Painel da barbearia" : "Painel do profissional"}
            </p>
          </div>
          <form action="/auth/logout" method="post" className="lg:hidden">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Sair"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <LogOut aria-hidden />
            </Button>
          </form>
        </div>
        <nav
          aria-label="Painel do Barbeiro"
          className="grid grid-cols-4 gap-1 px-2 pb-3 sm:px-4 lg:mt-4 lg:flex lg:flex-col"
        >
          {sections.map(({ value, name, Icon }) => (
            <button
              key={value}
              type="button"
              aria-current={section === value ? "page" : undefined}
              onClick={() => {
                setSection(value)
                setActionError("")
                setMessage("")
              }}
              className={`flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white sm:text-xs lg:flex-row lg:gap-3 lg:px-3 lg:text-sm ${section === value ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8"}`}
            >
              <Icon aria-hidden className="size-4 shrink-0" /> {name}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-1 border-t border-white/10 p-4 lg:block">
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-white/8 hover:text-white"
          >
            Página de agendamento{" "}
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
          <form action="/auth/logout" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-white/8 hover:text-white"
            >
              <LogOut aria-hidden /> Sair
            </Button>
          </form>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="hidden h-14 items-center justify-between border-b border-slate-200 bg-white px-8 text-xs text-slate-600 lg:flex">
          <span>
            Agenda Barber{" "}
            <span aria-hidden className="px-1.5">
              /
            </span>{" "}
            {sections.find((s) => s.value === section)?.name}
          </span>
          <span className="font-medium">{displayDate(today, true)}</span>
        </div>
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight sm:text-[2.15rem]">
                {sections.find((s) => s.value === section)?.name}
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">
                {section === "today"
                  ? displayDate(today, true)
                  : section === "agenda"
                    ? "Acompanhe e organize os atendimentos."
                    : section === "cash"
                      ? "Acompanhe o dinheiro recebido e o que falta registrar."
                      : "Organize a operação e a página da barbearia."}
              </p>
            </div>
            {section === "today" || section === "agenda" ? (
              <div className="flex flex-wrap gap-2">
                {section === "agenda" && owner ? (
                  <Button
                    variant="outline"
                    onClick={() => setOpen({ type: "block" })}
                  >
                    <Clock3 aria-hidden /> Bloquear período
                  </Button>
                ) : null}
                {newBooking}
              </div>
            ) : null}
          </header>
          {failedSections.length ? (
            <FormError
              error={`Não foi possível carregar ${failedSections.join(", ")}. Atualize a página antes de usar esses dados.`}
            />
          ) : null}
          {message ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            >
              <CheckCircle2 aria-hidden className="size-4 shrink-0" />
              {message}
            </p>
          ) : null}
          {!open ? <FormError error={actionError} /> : null}

          {section === "today" ? (
            <>
              {setupMissing ? (
                <section
                  className={`${panelClass} flex flex-wrap items-center justify-between gap-3 p-4`}
                >
                  <div>
                    <h2 className="font-semibold">Prepare sua agenda</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Cadastre um profissional, um serviço ativo e os horários
                      de atendimento.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      showSetup(
                        !barbers.length
                          ? "team"
                          : !activeServices.length
                            ? "services"
                            : "hours",
                      )
                    }
                  >
                    {!barbers.length
                      ? "Adicionar profissional"
                      : !activeServices.length
                        ? "Cadastrar primeiro serviço"
                        : "Configurar horários"}
                  </Button>
                </section>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <section className="flex min-h-44 flex-col justify-between rounded-2xl bg-[#17263e] p-5 text-white sm:p-6">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <Clock3 aria-hidden className="size-4" /> Próximo
                    atendimento
                  </p>
                  <div className="my-4">
                    <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {next
                        ? `${next.appointment_time.slice(0, 5)} · ${next.clients?.name || "Cliente"}`
                        : "Sem próximos horários"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {next
                        ? `${next.services?.name || "Serviço"} · ${next.service_duration_at_booking ?? 30} min`
                        : "Consulte a agenda ou compartilhe o link com os clientes."}
                    </p>
                  </div>
                  {next ? (
                    <Button
                      variant="ghost"
                      className="w-fit px-0 text-white hover:bg-transparent hover:text-slate-200"
                      onClick={() => setOpen({ type: "details", id: next.id })}
                    >
                      Ver atendimento <ChevronRight aria-hidden />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-fit px-0 text-white hover:bg-transparent hover:text-slate-200"
                      onClick={copyLink}
                    >
                      <Copy aria-hidden /> Copiar link da agenda
                    </Button>
                  )}
                </section>
                <section
                  className={`${panelClass} grid grid-cols-2 divide-x divide-slate-200 px-2 py-5 lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:py-2`}
                >
                  <button
                    onClick={() => {
                      setDate(today)
                      setWeek(false)
                      setProfessional("")
                      setSection("agenda")
                    }}
                    className="min-w-0 cursor-pointer px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <p className="text-xs text-slate-600">Horários restantes</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {upcoming.length}
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setProfessional("")
                      setSection("cash")
                    }}
                    className="min-w-0 cursor-pointer px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <p className="text-xs text-slate-600">Recebido hoje</p>
                    <p className="mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl">
                      {money(receivedToday)}
                    </p>
                  </button>
                </section>
              </div>
              <section className={panelClass}>
                <header className="flex items-center justify-between gap-2 border-b border-slate-200 p-4 sm:px-5">
                  <h2 className="font-semibold">Agenda de hoje</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDate(today)
                      setWeek(false)
                      setProfessional("")
                      setSection("agenda")
                    }}
                  >
                    Ver agenda <ChevronRight aria-hidden />
                  </Button>
                </header>
                {bookedToday.length ? (
                  <BookingRows
                    appointments={bookedToday}
                    select={(id) => setOpen({ type: "details", id })}
                  />
                ) : (
                  <Empty
                    title="Nenhum atendimento para hoje"
                    detail="Registre quem marcou direto com você ou envie o endereço da agenda."
                  />
                )}
              </section>
            </>
          ) : null}

          {section === "agenda" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex max-w-full items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Dia anterior"
                    onClick={() => setDate(shiftDate(date, week ? -7 : -1))}
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Input
                    type="date"
                    aria-label="Data da agenda"
                    value={date}
                    className="h-10 min-w-0 bg-white"
                    onChange={(event) => {
                      if (event.target.value) setDate(event.target.value)
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Próximo dia"
                    onClick={() => setDate(shiftDate(date, week ? 7 : 1))}
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDate(today)
                    setWeek(false)
                  }}
                >
                  Hoje
                </Button>
                <Button
                  variant={week ? "default" : "outline"}
                  aria-pressed={week}
                  onClick={() => setWeek(!week)}
                >
                  7 dias
                </Button>
                {professionalFilter}
              </div>
              <section className={panelClass}>
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4 sm:px-5">
                  <h2 className="font-semibold first-letter:uppercase">
                    {week
                      ? `${displayDate(date)} a ${displayDate(shiftDate(date, 6))}`
                      : displayDate(date, true)}
                  </h2>
                  <span className="text-xs text-slate-600">
                    {filteredAppointments.length} atendimentos
                  </span>
                </header>
                {filteredAppointments.length ? (
                  <BookingRows
                    appointments={filteredAppointments}
                    showDate={week}
                    select={(id) => setOpen({ type: "details", id })}
                  />
                ) : (
                  <Empty
                    title="Agenda vazia nesse período"
                    detail="Selecione outra data ou registre um atendimento."
                  />
                )}
              </section>
              {shownBlocks.length ? (
                <section className={panelClass}>
                  <h2 className="border-b border-slate-200 p-4 font-semibold sm:px-5">
                    Horários bloqueados
                  </h2>
                  <ul className="divide-y divide-slate-100">
                    {shownBlocks.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm sm:px-5"
                      >
                        <div>
                          <p className="font-medium">
                            {displayDate(b.block_date)} ·{" "}
                            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                          </p>
                          <p className="text-xs text-slate-600">
                            {barbers.find((p) => p.id === b.barber_id)?.name ||
                              "Toda a equipe"}
                            {b.reason ? ` · ${b.reason}` : ""}
                          </p>
                        </div>
                        {owner ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => removeBlock(b.id)}
                          >
                            Liberar horário
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}

          {section === "cash" ? (
            <CashView
              shopId={shop.id}
              shopTotals={owner && !professional}
              professional={professional}
              professionalFilter={professionalFilter}
              payments={payments}
              expenses={expenses}
              unpaid={unpaid}
              appointments={appointments}
              loadErrors={failedSections}
              recordReceipt={(id) => setOpen({ type: "receipt", id })}
            />
          ) : null}

          {section === "settings" ? (
            <>
              {owner ? (
                <nav
                  aria-label="Configurações da barbearia"
                  className="grid grid-cols-2 gap-2 lg:grid-cols-4"
                >
                  {(
                    [
                      {
                        value: "services",
                        label: "Serviços",
                        detail: "Catálogo e preços",
                        Icon: BriefcaseBusiness,
                      },
                      {
                        value: "hours",
                        label: "Horários",
                        detail: "Expediente e pausas",
                        Icon: Clock3,
                      },
                      {
                        value: "team",
                        label: "Equipe",
                        detail: "Profissionais",
                        Icon: Users,
                      },
                      {
                        value: "page",
                        label: "Página pública",
                        detail: "Marca e contato",
                        Icon: Globe,
                      },
                    ] as const
                  ).map(({ value, label, detail, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={setup === value}
                      onClick={() => setSetup(value)}
                      className={`flex min-w-0 cursor-pointer items-start gap-2 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 sm:items-center sm:gap-3 sm:px-4 ${setup === value ? "border-[#16243b] bg-[#16243b] text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"}`}
                    >
                      <Icon
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 sm:mt-0"
                      />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold">
                          {label}
                        </span>
                        <span
                          className={`mt-0.5 block text-xs ${setup === value ? "text-slate-200" : "text-slate-600"}`}
                        >
                          {detail}
                        </span>
                      </span>
                    </button>
                  ))}
                </nav>
              ) : null}
              <div className="[&_[data-slot=card]]:shadow-none">
                {owner && setup === "services" ? (
                  <ServiceManagement
                    barbershopId={shop.id}
                    services={services}
                    canManageShop={canManageShop}
                  />
                ) : null}
                {owner && setup === "hours" ? (
                  <AvailabilityManagement
                    barbershopId={shop.id}
                    availability={availability}
                    canManageShop={canManageShop}
                  />
                ) : null}
                {!owner || setup === "team" ? (
                  <ProfileManagement
                    barbershopId={shop.id}
                    barbers={barbers}
                    canManageShop={canManageShop}
                    myBarberId={barberId}
                  />
                ) : null}
                {owner && setup === "page" ? (
                  <PublicPageSettings shop={shop} />
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </main>

      {open?.type === "new" || (open?.type === "move" && appointment) ? (
        <BookingEditor
          key={open.type + (appointment?.id || "")}
          shopId={shop.id}
          barbers={barbers}
          services={services}
          initialDate={section === "today" || date < today ? today : date}
          appointment={open.type === "move" ? appointment : undefined}
          finish={finish}
          close={close}
        />
      ) : null}
      {open?.type === "block" && owner ? (
        <BlockEditor
          shopId={shop.id}
          barbers={barbers}
          date={date}
          finish={finish}
          close={close}
        />
      ) : null}
      {open?.type === "receipt" &&
      appointment &&
      !paidIds.has(appointment.id) ? (
        <ReceiptEditor
          shopId={shop.id}
          appointment={appointment}
          finish={finish}
          close={close}
        />
      ) : null}
      {open?.type === "details" && appointment ? (
        <BarberSheet
          title={appointment.clients?.name || "Atendimento"}
          description={`${appointment.services?.name || "Serviço"} · ${displayDate(appointment.appointment_date)} às ${appointment.appointment_time.slice(0, 5)}`}
          close={() => {
            if (!busy) close()
          }}
        >
          <div className="space-y-2 rounded-lg bg-slate-100 p-4 text-sm">
            <Status appointment={appointment} />
            <p>
              {appointment.barbers?.name || "Profissional"} ·{" "}
              {appointment.service_duration_at_booking ?? 30} min ·{" "}
              {money(appointment.service_price_at_booking)}
            </p>
            <p className="text-slate-600">
              {sources[appointment.booking_source || "site"]}
              {appointment.notes ? ` · ${appointment.notes}` : ""}
            </p>
            {paidIds.has(appointment.id) ? (
              <p className="font-medium text-emerald-800">
                Recebimento registrado
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {/^\d{10,11}$/.test(phone) ? (
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/55${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden /> WhatsApp
                </a>
              </Button>
            ) : null}
            {activeAppointment(appointment) ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setConfirm(undefined)
                  setOpen({ type: "move", id: appointment.id })
                }}
              >
                Remarcar
              </Button>
            ) : null}
            {appointment.status === "pending" ? (
              <Button disabled={busy} onClick={() => updateStatus("confirmed")}>
                Confirmar atendimento
              </Button>
            ) : null}
            {appointment.status === "confirmed" && pastStart ? (
              <Button
                className={primaryClass}
                disabled={busy}
                onClick={() => updateStatus("completed")}
              >
                Concluir atendimento
              </Button>
            ) : null}
            {appointment.status === "completed" &&
            !paidIds.has(appointment.id) ? (
              <Button
                className={primaryClass}
                onClick={() => setOpen({ type: "receipt", id: appointment.id })}
              >
                Registrar recebimento
              </Button>
            ) : null}
          </div>
          {activeAppointment(appointment) ? (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              {confirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    {confirm === "cancelled"
                      ? "Cancelar este atendimento e liberar o horário?"
                      : "Registrar que o cliente não compareceu?"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => updateStatus(confirm)}
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirm(undefined)}
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className="text-red-700"
                    disabled={busy}
                    onClick={() => setConfirm("cancelled")}
                  >
                    Cancelar atendimento
                  </Button>
                  {pastStart ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirm("no_show")}
                    >
                      Não compareceu
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
          <FormError error={actionError} />
        </BarberSheet>
      ) : null}
    </div>
  )
}
