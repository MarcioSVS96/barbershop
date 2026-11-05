"use client"

import { useState, type ReactNode, type FormEvent } from "react"
import { AlertCircle, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  createManualBooking,
  recordBookingReceipt,
  rescheduleBooking,
  setBookingBlock,
} from "@/lib/barber/actions"
import { endOfService, shopDate } from "@/lib/barber/time"
import type { Appointment, Barber, Service } from "@/lib/types"
import { useBookingTimes } from "../use-booking-times"

export const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
export const primaryClass = "bg-[#16243b] text-white hover:bg-[#253753]"

export function BarberSheet({
  title,
  description,
  close,
  children,
}: {
  title: string
  description: string
  close: () => void
  children: ReactNode
}) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto bg-white sm:max-w-lg">
        <SheetHeader className="border-b border-slate-200 px-6 py-6 pr-12">
          <SheetTitle className="text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </SheetTitle>
          <SheetDescription className="text-slate-600">
            {description}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 p-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export function FormError({ error }: { error?: string }) {
  return error ? (
    <p
      role="alert"
      className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {error}
    </p>
  ) : null
}

export function BookingEditor({
  shopId,
  barbers,
  services,
  initialDate,
  appointment,
  finish,
  close,
}: {
  shopId: string
  barbers: Barber[]
  services: Service[]
  initialDate: string
  appointment?: Appointment
  finish: (message: string, date?: string) => void
  close: () => void
}) {
  const activeServices = services.filter((s) => s.is_active)
  const [serviceId, setService] = useState(
    appointment?.service_id ||
      (activeServices.length === 1 ? activeServices[0].id : ""),
  )
  const [barberId, setBarber] = useState(
    appointment?.barber_id || (barbers.length === 1 ? barbers[0].id : ""),
  )
  const [date, setDate] = useState(appointment?.appointment_date || initialDate)
  const [time, setTime] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const {
    times,
    loading,
    error: timeError,
    refresh,
  } = useBookingTimes({
    shopId,
    barberId,
    serviceId,
    date,
    panel: true,
    appointmentId: appointment?.id,
  })
  const service = services.find((s) => s.id === serviceId)
  const duration = appointment
    ? (appointment.service_duration_at_booking ?? 30)
    : service?.duration

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!times.includes(time)) return
    const form = new FormData(event.currentTarget)
    setError("")
    setBusy(true)
    try {
      const key = { shopId, barberId, serviceId, date, time }
      const result = appointment
        ? await rescheduleBooking({ ...key, appointmentId: appointment.id })
        : await createManualBooking({
            ...key,
            name: form.get("name"),
            phone: form.get("phone"),
            notes: form.get("notes"),
            source: form.get("source"),
          })
      if (!result.ok) {
        setError(result.error)
        refresh()
        setTime("")
        return
      }
      finish(
        appointment ? "Atendimento remarcado." : "Agendamento confirmado.",
        date,
      )
    } catch {
      setError(
        "Não foi possível salvar. Atualize os horários antes de tentar novamente.",
      )
      refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <BarberSheet
      title={appointment ? "Remarcar atendimento" : "Novo agendamento"}
      description={
        appointment
          ? "Escolha outro horário disponível para este serviço."
          : "Registre um horário combinado com o cliente."
      }
      close={() => {
        if (!busy) close()
      }}
    >
      <form onSubmit={save}>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          {appointment ? (
            <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
              <p className="font-semibold">
                {appointment.clients?.name || "Cliente"}
              </p>
              <p className="text-slate-600">
                {appointment.services?.name || "Serviço"} · {duration} min
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-name">Nome do cliente</Label>
                <Input
                  id="manual-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-phone">Telefone com DDD</Label>
                  <Input
                    id="manual-phone"
                    name="phone"
                    type="tel"
                    placeholder="(81) 98765-4321"
                    required
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-source">Origem</Label>
                  <select
                    id="manual-source"
                    name="source"
                    className={fieldClass}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="balcao">Balcão</option>
                    <option value="telefone">Telefone</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-service">Serviço</Label>
                <select
                  id="manual-service"
                  className={fieldClass}
                  value={serviceId}
                  required
                  onChange={(event) => {
                    setService(event.target.value)
                    setTime("")
                  }}
                >
                  <option value="" disabled>
                    Selecione o serviço
                  </option>
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.duration} min
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="manual-barber">Profissional</Label>
            <select
              id="manual-barber"
              className={fieldClass}
              value={barberId}
              required
              onChange={(event) => {
                setBarber(event.target.value)
                setTime("")
              }}
            >
              <option value="" disabled>
                Selecione o profissional
              </option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-date">Data</Label>
              <Input
                id="manual-date"
                type="date"
                min={shopDate()}
                value={date}
                required
                onChange={(event) => {
                  setDate(event.target.value)
                  setTime("")
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-time">Horário</Label>
              <select
                id="manual-time"
                className={fieldClass}
                value={time}
                required
                disabled={loading || !times.length}
                onChange={(event) => setTime(event.target.value)}
              >
                <option value="" disabled>
                  {loading ? "Consultando…" : "Selecione"}
                </option>
                {times.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          {time && duration ? (
            <p className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              <Clock3 aria-hidden className="size-4" /> {time}–
              {endOfService(time, duration)} · {duration} min
            </p>
          ) : null}
          {!loading &&
          !timeError &&
          barberId &&
          serviceId &&
          date &&
          !times.length ? (
            <p className="text-sm text-slate-600">
              Nenhum horário disponível nessa data para esse serviço.
            </p>
          ) : null}
          {timeError ? (
            <Button type="button" variant="outline" onClick={refresh}>
              Consultar novamente
            </Button>
          ) : null}
          {!appointment ? (
            <div className="space-y-2">
              <Label htmlFor="manual-notes">Observações</Label>
              <Textarea
                id="manual-notes"
                name="notes"
                rows={2}
                maxLength={500}
              />
            </div>
          ) : null}
          <FormError error={error || timeError} />
          <Button
            className={primaryClass}
            type="submit"
            disabled={!times.includes(time) || loading}
          >
            {busy
              ? "Salvando…"
              : appointment
                ? "Salvar novo horário"
                : "Confirmar agendamento"}
          </Button>
        </fieldset>
      </form>
    </BarberSheet>
  )
}

export function ReceiptEditor({
  appointment,
  shopId,
  finish,
  close,
}: {
  appointment: Appointment
  shopId: string
  finish: (message: string) => void
  close: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      const result = await recordBookingReceipt({
        shopId,
        appointmentId: appointment.id,
        method: data.get("method"),
        amount: Number(data.get("amount")),
      })
      if (!result.ok) setError(result.error)
      else finish("Recebimento lançado no caixa.")
    } catch {
      setError(
        "Não foi possível confirmar o lançamento. Confira o caixa antes de tentar novamente.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <BarberSheet
      title="Registrar recebimento"
      description={`${appointment.clients?.name || "Cliente"} · ${appointment.services?.name || "Serviço"}`}
      close={() => {
        if (!busy) close()
      }}
    >
      <form onSubmit={save}>
        <fieldset className="min-w-0 space-y-4" disabled={busy}>
          <div className="space-y-2">
            <Label htmlFor="receipt-amount">Valor recebido (R$)</Label>
            <Input
              id="receipt-amount"
              name="amount"
              type="number"
              min="0.01"
              max="999999.99"
              step="0.01"
              inputMode="decimal"
              defaultValue={appointment.service_price_at_booking || ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receipt-method">Forma de recebimento</Label>
            <select
              id="receipt-method"
              name="method"
              className={fieldClass}
              defaultValue="pix"
            >
              <option value="pix">Pix</option>
              <option value="card">Cartão</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>
          <p className="text-sm text-slate-600">
            O valor entra no caixa na data do registro.
          </p>
          <FormError error={error} />
          <Button type="submit" className={primaryClass}>
            {busy ? "Registrando…" : "Registrar recebimento"}
          </Button>
        </fieldset>
      </form>
    </BarberSheet>
  )
}

export function BlockEditor({
  shopId,
  barbers,
  date,
  close,
  finish,
}: {
  shopId: string
  barbers: Barber[]
  date: string
  close: () => void
  finish: (message: string, date?: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const chosenDate = String(data.get("date"))
    setBusy(true)
    setError("")
    try {
      const result = await setBookingBlock({
        shopId,
        barberId: data.get("barber") || null,
        date: chosenDate,
        start: data.get("start"),
        end: data.get("end"),
        reason: data.get("reason"),
      })
      if (!result.ok) setError(result.error)
      else finish("Período bloqueado.", chosenDate)
    } catch {
      setError("Não foi possível salvar o bloqueio. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <BarberSheet
      title="Bloquear período"
      description="Retire uma faixa de horário da agenda pública e do painel."
      close={() => {
        if (!busy) close()
      }}
    >
      <form onSubmit={save}>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="block-barber">Profissional</Label>
            <select id="block-barber" name="barber" className={fieldClass}>
              <option value="">Toda a equipe</option>
              {barbers.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-date">Data</Label>
            <Input
              id="block-date"
              type="date"
              name="date"
              min={shopDate()}
              defaultValue={date < shopDate() ? shopDate() : date}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="block-start">Início</Label>
              <Input
                id="block-start"
                type="time"
                name="start"
                defaultValue="09:00"
                required
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="block-end">Fim</Label>
              <Input
                id="block-end"
                type="time"
                name="end"
                defaultValue="19:00"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Input
              id="block-reason"
              name="reason"
              placeholder="Ex. Folga"
              maxLength={120}
            />
          </div>
          <FormError error={error} />
          <Button type="submit" className={primaryClass}>
            {busy ? "Salvando…" : "Bloquear horário"}
          </Button>
        </fieldset>
      </form>
    </BarberSheet>
  )
}
