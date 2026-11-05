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
  type LucideIcon,
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
  panelClass,
  primaryClass,
} from "./forms"

const sections = [
  {
    value: "today",
    name: "Hoje",
    detail: "Acompanhe os atendimentos do dia.",
    Icon: LayoutDashboard,
  },
  {
    value: "agenda",
    name: "Agenda",
    detail: "Organize reservas e horários bloqueados.",
    Icon: CalendarDays,
  },
  {
    value: "cash",
    name: "Caixa",
    detail: "Confira recebimentos, despesas e valores a receber.",
    Icon: Wallet,
  },
  {
    value: "settings",
    name: "Configurações",
    detail: "Gerencie a equipe e a página de agendamento.",
    Icon: Settings,
  },
] as const
type Section = (typeof sections)[number]["value"]
type Setup = "services" | "hours" | "team" | "page"
type OpenPanel =
  | { type: "new" | "block" }
  | { type: "details" | "move" | "receipt"; id: string }
type Props = {
  shop: BarbershopSettings & { slug: string }
  role: "owner" | "staff"
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
const outlineClass = "min-h-11 rounded-xl border-slate-200 bg-white shadow-none hover:bg-slate-50 hover:text-slate-950"
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
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[appointment.status] ?? statusStyles.pending}`}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current opacity-75" />
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
    <div className="space-y-2 px-5 py-9 text-center sm:py-12">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-600">
        <CalendarDays aria-hidden className="size-5" />
      </div>
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

function TodayMetric({
  Icon,
  label,
  value,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  value: number | string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${panelClass} flex min-h-22 cursor-pointer flex-col gap-2.5 p-3.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 min-[390px]:flex-row min-[390px]:items-center sm:p-4`}
    >
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eef2f7] text-[#283b55]">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-slate-600">{label}</span>
        <span className="mt-0.5 block break-words text-lg font-semibold tracking-tight tabular-nums sm:text-xl">{value}</span>
      </span>
      <ChevronRight aria-hidden className="hidden size-4 shrink-0 text-slate-500 xl:block" />
    </button>
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
      {appointments.map((a) => {
        const time = a.appointment_time.slice(0, 5)
        const end = endOfService(a.appointment_time, a.service_duration_at_booking)
        const client = a.clients?.name || "Cliente"
        const service = a.services?.name || "Serviço"
        const barber = a.barbers?.name
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => select(a.id)}
              aria-label={`Detalhes de ${client}${showDate ? ` em ${displayDate(a.appointment_date)}` : ""}, das ${time} às ${end}. ${service}${barber ? ` com ${barber}` : ""}. ${statusLabels[a.status]}.`}
              className="group grid w-full cursor-pointer grid-cols-[3.5rem_minmax(0,1fr)_1rem] items-center gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-700 sm:grid-cols-[4.5rem_minmax(0,1fr)_1.25rem] sm:gap-4 sm:px-5"
            >
              <span className="rounded-xl bg-slate-100 px-1 py-2 text-center tabular-nums sm:px-1.5">
                {showDate ? <span className="block text-xs text-slate-600">{displayDate(a.appointment_date)}</span> : null}
                <span className="block text-sm font-semibold text-slate-950 sm:text-base">{time}</span>
                <span className="block whitespace-nowrap text-[10px] text-slate-600 sm:text-[11px]">
                  até {end}
                </span>
              </span>
              <span className="flex min-w-0 flex-col items-start gap-1.5 md:flex-row md:items-center md:justify-between md:gap-4">
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold">{client}</span>
                  <span className="mt-0.5 block break-words text-xs leading-relaxed text-slate-600">
                    {service}
                    {barber ? ` · ${barber}` : ""}
                  </span>
                </span>
                <Status appointment={a} />
              </span>
              <ChevronRight aria-hidden className="size-4 text-slate-500 group-hover:text-slate-950" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function BarberWorkspace({
  shop,
  role,
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
    role === "owner" ? "services" : "team",
  )
  const [date, setDate] = useState(shopDate)
  const [week, setWeek] = useState(false)
  const [professional, setProfessional] = useState("")
  const [open, setOpen] = useState<OpenPanel>()
  const [message, setMessage] = useState("")
  const [actionError, setActionError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<"cancelled" | "no_show">()
  const owner = role === "owner"
  const currentSection = sections.find((item) => item.value === section) ?? sections[0]
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
      navigate("agenda")
      setProfessional("")
    }
    setMessage(text)
    router.refresh()
  }

  function navigate(nextSection: Section) {
    if (nextSection !== section) window.scrollTo(0, 0)
    setSection(nextSection)
  }

  function openTodayAgenda() {
    setDate(today)
    setWeek(false)
    setProfessional("")
    navigate("agenda")
  }

  function showSetup(tab: Setup) {
    navigate("settings")
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
    <div className="min-h-dvh bg-[#f5f7fa] text-slate-950 lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white lg:flex lg:h-dvh lg:flex-col lg:border-0 lg:bg-[#121c2e] lg:text-white">
        <div className="flex items-center gap-2.5 px-4 py-2.5 sm:px-6 lg:px-5 lg:py-6">
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#c92037] text-white ring-1 ring-white/15">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Scissors aria-hidden className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{shop.name}</p>
            <p className="truncate text-xs text-slate-600 lg:text-slate-300">
              {owner ? "Painel da barbearia" : "Painel do profissional"}
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950 lg:hidden"
          >
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir página de agendamento">
              <ArrowUpRight aria-hidden className="size-5" />
            </a>
          </Button>
          <form action="/auth/logout" method="post" className="lg:hidden">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Sair"
              className="size-11 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              <LogOut aria-hidden className="size-5" />
            </Button>
          </form>
        </div>
        <nav
          aria-label="Painel do Barbeiro"
          className="fixed inset-x-0 bottom-0 grid grid-cols-4 gap-1 border-t border-slate-200 bg-white px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_#0f172a08] lg:static lg:mt-3 lg:grid-cols-1 lg:border-0 lg:bg-transparent lg:px-3 lg:py-0 lg:shadow-none"
        >
          {sections.map(({ value, name, Icon }) => (
            <button
              key={value}
              type="button"
              aria-current={section === value ? "page" : undefined}
              onClick={() => {
                navigate(value)
                setActionError("")
                setMessage("")
              }}
              className={`relative flex min-h-12 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-700 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5 lg:text-sm lg:focus-visible:outline-white ${section === value ? "bg-slate-100 text-slate-950 lg:bg-white/10 lg:text-white" : "text-slate-600 hover:bg-slate-50 lg:text-slate-300 lg:hover:bg-white/5"}`}
            >
              {section === value ? (
                <span aria-hidden className="absolute top-0 h-0.5 w-4 rounded-full bg-[#c92037] lg:top-auto lg:left-0 lg:h-5 lg:w-0.5 lg:bg-[#ff5266]" />
              ) : null}
              <Icon aria-hidden className="size-5 shrink-0 lg:size-4" />
              {value === "settings" ? (
                <>
                  <span className="lg:hidden">Ajustes</span>
                  <span className="hidden lg:inline">{name}</span>
                </>
              ) : name}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-1 border-t border-white/10 p-3 lg:block">
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-4 text-xs font-medium text-slate-300 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <ArrowUpRight aria-hidden className="size-4 shrink-0" /> Página de agendamento
          </a>
          <form action="/auth/logout" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="min-h-11 w-full justify-start gap-2.5 rounded-xl px-4 text-slate-300 hover:bg-white/8 hover:text-white"
            >
              <LogOut aria-hidden /> Sair
            </Button>
          </form>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto max-w-6xl space-y-5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:px-6 sm:pt-7 lg:px-8 lg:pt-8 lg:pb-10">
          <header className="flex flex-wrap items-end justify-between gap-3.5 sm:gap-4">
            <div className="min-w-0">
              {section === "today" ? (
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <CalendarDays aria-hidden className="size-3.5" />
                  <span className="first-letter:uppercase">{displayDate(today, true)}</span>
                </p>
              ) : null}
              <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight sm:text-4xl">
                {currentSection.name}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {section === "settings" && !owner ? "Atualize seus dados profissionais." : currentSection.detail}
              </p>
            </div>
            {section === "today" || section === "agenda" ? (
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button
                  className={`${primaryClass} grow sm:grow-0`}
                  onClick={() => setOpen({ type: "new" })}
                  disabled={!canBook}
                >
                  <Plus aria-hidden /> Novo agendamento
                </Button>
                {section === "agenda" && owner ? (
                  <Button
                    variant="outline"
                    className={`${outlineClass} grow sm:grow-0`}
                    onClick={() => setOpen({ type: "block" })}
                  >
                    <Clock3 aria-hidden /> Bloquear período
                  </Button>
                ) : null}
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:px-5"
                >
                  <div>
                    <h2 className="font-semibold text-amber-950">Prepare sua agenda</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Cadastre um profissional, um serviço ativo e os horários
                      de atendimento.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className={outlineClass}
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
              <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4">
                <section className="relative isolate flex min-w-0 flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-[#16243b] bg-[radial-gradient(ellipse_at_top_right,#364f72,transparent_70%)] p-5 text-white shadow-sm sm:p-6">
                  <span aria-hidden className="pointer-events-none absolute -top-24 -right-12 -z-10 size-64 rounded-full border border-white/10 ring-28 ring-white/4" />
                  <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-white/10">
                        <Clock3 className="size-4" />
                      </span>
                      Próximo atendimento
                    </h2>
                    {next ? <Status appointment={next} /> : null}
                  </div>
                  {next ? (
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-[2.75rem]">
                          {next.appointment_time.slice(0, 5)}
                        </p>
                        <p className="min-w-0 break-words text-lg font-semibold sm:text-xl">
                          {next.clients?.name || "Cliente"}
                        </p>
                      </div>
                      <p className="break-words text-sm leading-relaxed text-slate-200">
                        {next.services?.name || "Serviço"} · {next.service_duration_at_booking ?? 30} min
                        {next.barbers?.name ? ` · ${next.barbers.name}` : ""}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Sem próximos atendimentos
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-200">
                        Compartilhe o link para receber novos agendamentos.
                      </p>
                    </div>
                  )}
                  {next ? (
                    <Button
                      variant="ghost"
                      className="min-h-11 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white/70"
                      onClick={() => setOpen({ type: "details", id: next.id })}
                    >
                      Ver atendimento <ChevronRight aria-hidden />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="min-h-11 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white/70"
                      onClick={copyLink}
                    >
                      <Copy aria-hidden /> Copiar link da agenda
                    </Button>
                  )}
                </section>
                <section aria-label="Resumo de hoje" className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <TodayMetric
                    Icon={CalendarDays}
                    label="Atendimentos a seguir"
                    value={upcoming.length}
                    onClick={openTodayAgenda}
                  />
                  <TodayMetric
                    Icon={Wallet}
                    label="Recebido hoje"
                    value={money(receivedToday)}
                    onClick={() => {
                      setProfessional("")
                      navigate("cash")
                    }}
                  />
                </section>
              </div>
              <section className={panelClass}>
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="font-semibold">Agenda de hoje</h2>
                    <p className="mt-0.5 text-xs text-slate-600">{bookedToday.length} {bookedToday.length === 1 ? "atendimento" : "atendimentos"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="min-h-11 rounded-xl text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    onClick={openTodayAgenda}
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
              <section aria-label="Filtros da agenda" className={`${panelClass} flex flex-wrap items-center gap-2.5 p-3 sm:gap-3 sm:p-4`}>
                <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:w-auto sm:grid-cols-[auto_10rem_auto]">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`${outlineClass} size-11`}
                    aria-label={week ? "Semana anterior" : "Dia anterior"}
                    onClick={() => setDate(shiftDate(date, week ? -7 : -1))}
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Input
                    type="date"
                    aria-label="Data da agenda"
                    value={date}
                    className="h-11 min-w-0 rounded-xl border-slate-200 bg-white shadow-none"
                    onChange={(event) => {
                      if (event.target.value) setDate(event.target.value)
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className={`${outlineClass} size-11`}
                    aria-label={week ? "Próxima semana" : "Próximo dia"}
                    onClick={() => setDate(shiftDate(date, week ? 7 : 1))}
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="outline"
                    className={outlineClass}
                    onClick={() => {
                      setDate(today)
                      setWeek(false)
                    }}
                  >
                    Hoje
                  </Button>
                  <div role="group" aria-label="Período da agenda" className="inline-flex gap-0.5 rounded-xl bg-slate-100 p-0.5">
                    {[{ label: "Dia", week: false }, { label: "7 dias", week: true }].map((view) => (
                      <Button
                        key={view.label}
                        variant="ghost"
                        aria-pressed={week === view.week}
                        className={`min-h-10 rounded-[0.625rem] text-xs ${week === view.week ? "bg-white font-semibold text-slate-950 shadow-xs hover:bg-white" : "text-slate-600 hover:bg-slate-200"} hover:text-slate-950`}
                        onClick={() => setWeek(view.week)}
                      >
                        {view.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {professionalFilter}
              </section>
              <section className={panelClass}>
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4 sm:px-5">
                  <h2 className="font-semibold first-letter:uppercase">
                    {week
                      ? `${displayDate(date)} a ${displayDate(shiftDate(date, 6))}`
                      : displayDate(date, true)}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {filteredAppointments.length} {filteredAppointments.length === 1 ? "atendimento" : "atendimentos"}
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
                  className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3"
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
                      className={`${panelClass} flex cursor-pointer flex-col items-start gap-2 p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 aria-pressed:border-slate-500 aria-pressed:bg-[#edf2f8] aria-pressed:ring-1 aria-pressed:ring-slate-500 sm:flex-row sm:items-center sm:gap-2.5 lg:flex-col lg:items-start xl:flex-row xl:items-center`}
                    >
                      <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-lg ${setup === value ? "bg-[#16243b] text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          {detail}
                        </span>
                      </span>
                    </button>
                  ))}
                </nav>
              ) : null}
              <div className="[&_[data-slot=card]]:border-slate-200 [&_[data-slot=card]]:shadow-xs">
                {owner && setup === "services" ? (
                  <ServiceManagement
                    barbershopId={shop.id}
                    services={services}
                    role={role}
                  />
                ) : null}
                {owner && setup === "hours" ? (
                  <AvailabilityManagement
                    barbershopId={shop.id}
                    availability={availability}
                    role={role}
                  />
                ) : null}
                {!owner || setup === "team" ? (
                  <ProfileManagement
                    barbershopId={shop.id}
                    barbers={barbers}
                    role={role}
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
