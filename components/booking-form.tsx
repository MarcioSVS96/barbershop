"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MessageCircle, RefreshCcw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createPublicBooking } from "@/lib/barber/actions"
import { endOfService, money, normalizePhone, shopDate } from "@/lib/barber/time"
import type { Service, Barber } from "@/lib/types"
import { useBookingTimes } from "./use-booking-times"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface BookingFormProps {
  services: Service[]
  barbers: Pick<Barber, "id" | "name" | "specialty">[]
  barbershopId: string
  whatsappPhone?: string | null
}

const surface = "min-w-0 rounded-2xl border border-[#e7e3db] bg-white shadow-[0_6px_26px_#18223308] lg:rounded-3xl"
const control = "w-full min-w-0 rounded-xl border-[#dcdedc] bg-white shadow-none focus-visible:border-[#334663] focus-visible:ring-[#334663]/25"
const selectTrigger = `${control} data-[size=default]:h-12 text-base sm:text-sm`
const popover = "rounded-xl border-[#e7e3db] bg-white shadow-lg"
const primary = "min-h-12 rounded-xl bg-[#172134] font-semibold text-white hover:bg-[#2c3b54] focus-visible:ring-[#334663]/40"

export function BookingForm({
  services,
  barbers,
  barbershopId,
  whatsappPhone,
}: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedService, setSelectedService] = useState("")
  const [selectedBarber, setSelectedBarber] = useState(
    barbers.length === 1 ? barbers[0].id : "",
  )
  const [selectedTime, setSelectedTime] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [confirmed, setConfirmed] = useState<{
    when: string
    service: string
    barber: string
    link: string | null
  }>()
  const confirmationHeading = useRef<HTMLHeadingElement>(null)
  const selectedServiceData = services.find((service) => service.id === selectedService)
  const date = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
  const canCheckTimes = Boolean(selectedService && selectedBarber && date)
  const {
    times: availableTimeSlots,
    error,
    loading,
    refresh,
  } = useBookingTimes({
    shopId: barbershopId,
    barberId: selectedBarber,
    serviceId: selectedService,
    date,
  })

  useEffect(() => {
    if (confirmed) confirmationHeading.current?.focus()
  }, [confirmed])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    if (
      !selectedDate ||
      !selectedServiceData ||
      !availableTimeSlots.includes(selectedTime)
    ) {
      setSubmitError("Escolha um horário disponível.")
      return
    }

    setSubmitError("")
    setIsLoading(true)
    try {
      const result = await createPublicBooking({
        shopId: barbershopId,
        barberId: selectedBarber,
        serviceId: selectedService,
        date,
        time: selectedTime,
        name: clientName,
        phone: clientPhone,
        notes,
      })
      if (!result.ok) {
        setSubmitError(result.error)
        setSelectedTime("")
        refresh()
        return
      }

      const when = `${format(selectedDate, "dd/MM/yyyy")} às ${selectedTime}`
      const barber = barbers.find((item) => item.id === selectedBarber)?.name || "Barbeiro"
      const phone = normalizePhone(whatsappPhone || "")
      const message = [
        "Olá! Fiz um agendamento pelo site.",
        `Cliente: ${clientName}`,
        `Serviço: ${selectedServiceData.name}`,
        `Barbeiro: ${barber}`,
        `Data e horário: ${when}`,
      ].join("\n")

      setConfirmed({
        when,
        service: selectedServiceData.name,
        barber,
        link: /^\d{10,11}$/.test(phone)
          ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
          : null,
      })
    } catch {
      setSubmitError("Não foi possível concluir. Escolha um horário e tente novamente.")
      setSelectedTime("")
      refresh()
    } finally {
      setIsLoading(false)
    }
  }

  if (confirmed) {
    return (
      <section className={`${surface} p-5 sm:p-7`} aria-labelledby="booking-confirmed">
        <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Check className="size-6" />
        </span>
        <h2 id="booking-confirmed" ref={confirmationHeading} tabIndex={-1} className="mt-4 text-xl font-semibold tracking-tight focus:outline-none sm:text-2xl">
          Agendamento confirmado
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">Confira os dados do seu atendimento.</p>
        <dl className="mt-5 divide-y divide-[#e7e3db] rounded-xl bg-[#f6f4f0] px-4 py-1 text-sm">
          {[
            { label: "Data e horário", value: confirmed.when },
            { label: "Serviço", value: confirmed.service },
            { label: "Barbeiro", value: confirmed.barber },
          ].map(({ label, value }) => (
            <div key={label} className="grid gap-0.5 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
              <dt className="text-slate-600">{label}</dt>
              <dd className="break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {confirmed.link ? (
          <Button asChild className={`${primary} mt-5 h-auto w-full whitespace-normal sm:w-auto`}>
            <a href={confirmed.link} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden /> Falar com a barbearia no WhatsApp
            </a>
          </Button>
        ) : null}
      </section>
    )
  }

  if (!services.length || !barbers.length) {
    return (
      <section className={`${surface} p-5 sm:p-7`} aria-labelledby="booking-unavailable">
        <h2 id="booking-unavailable" className="text-lg font-semibold">Agenda indisponível no momento</h2>
        <p className="mt-2 text-sm text-slate-600">Volte mais tarde para consultar os agendamentos.</p>
      </section>
    )
  }

  return (
    <section className={surface} aria-labelledby="booking-form-heading">
      <header className="flex items-start gap-3 border-b border-[#edeae4] px-4 py-4 sm:px-6 sm:py-5">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f5ede3] text-[#765331]">
          <CalendarDays className="size-5" />
        </span>
        <div>
          <h2 id="booking-form-heading" className="text-lg font-semibold tracking-tight sm:text-xl">Faça sua reserva</h2>
          <p className="mt-0.5 text-sm text-slate-600">Escolha o atendimento e confirme seus dados.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={isLoading} className="min-w-0 divide-y divide-[#edeae4]">
          <section aria-labelledby="appointment-heading" className="space-y-4 px-4 py-5 sm:px-6">
            <h3 id="appointment-heading" className="flex items-center gap-2.5 font-semibold">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-[#172134] text-xs text-white">1</span>
              Atendimento
            </h3>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="service">Serviço</Label>
                <Select
                  value={selectedService}
                  onValueChange={(value) => {
                    setSelectedService(value)
                    setSelectedTime("")
                  }}
                  required
                >
                  <SelectTrigger id="service" className={selectTrigger}>
                    <SelectValue placeholder="Selecione o serviço">{selectedServiceData?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className={`${popover} max-w-[calc(100vw-1.5rem)]`}>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id} className="rounded-lg px-3 py-2.5 pr-8 focus:bg-[#f4f2ee] focus:text-[#172134]">
                        <span className="grid min-w-0 gap-0.5">
                          <span className="break-words font-medium">{service.name}</span>
                          <span className="text-xs text-slate-600">{money(service.price)} · {service.duration} min</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="barber">Barbeiro</Label>
                <Select
                  value={selectedBarber}
                  onValueChange={(value) => {
                    setSelectedBarber(value)
                    setSelectedTime("")
                  }}
                  required
                >
                  <SelectTrigger id="barber" className={selectTrigger}>
                    <SelectValue placeholder="Selecione o barbeiro" />
                  </SelectTrigger>
                  <SelectContent className={`${popover} max-w-[calc(100vw-1.5rem)]`}>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id} className="rounded-lg px-3 py-2.5 pr-8 focus:bg-[#f4f2ee] focus:text-[#172134]">
                        <span className="min-w-0 break-words">{barber.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-1.5 sm:col-span-2">
                <Label id="booking-date-label" htmlFor="booking-date">Data</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="booking-date"
                      aria-labelledby="booking-date-label booking-date-value"
                      type="button"
                      variant="outline"
                      className={`${control} h-12 justify-start font-normal hover:bg-[#f6f4f0] hover:text-[#172134] ${selectedDate ? "" : "text-slate-600"}`}
                    >
                      <CalendarDays aria-hidden className="text-slate-600" />
                      <span id="booking-date-value" className="min-w-0 truncate">
                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                      </span>
                      <ChevronDown aria-hidden className="ml-auto text-slate-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" collisionPadding={12} className={`${popover} w-auto p-0`}>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(value) => {
                        setSelectedDate(value)
                        setSelectedTime("")
                        setDateOpen(false)
                      }}
                      disabled={(value) => format(value, "yyyy-MM-dd") < shopDate()}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="rounded-xl bg-[#f6f4f0] px-3.5 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p id="booking-times" className="flex items-center gap-2 text-sm font-semibold">
                  <Clock3 aria-hidden className="size-4 shrink-0 text-slate-600" /> Horários disponíveis
                </p>
                {canCheckTimes ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-lg text-slate-600 hover:bg-[#ebe7df] hover:text-[#172134]"
                    onClick={() => {
                      setSelectedTime("")
                      refresh()
                    }}
                    disabled={loading}
                    aria-label="Atualizar horários"
                    title="Atualizar horários"
                  >
                    <RefreshCcw aria-hidden />
                  </Button>
                ) : null}
              </div>

              {!canCheckTimes ? (
                <p className="pb-1 text-sm text-slate-600">Escolha o serviço, o barbeiro e a data para ver os horários.</p>
              ) : loading ? (
                <p role="status" className="pb-1 text-sm text-slate-600">Consultando horários…</p>
              ) : error ? (
                <p role="alert" className="pb-1 text-sm text-red-800">{error}</p>
              ) : availableTimeSlots.length === 0 ? (
                <p role="status" className="pb-1 text-sm text-slate-600">Não há horários livres nessa data. Escolha outro dia.</p>
              ) : (
                <div role="radiogroup" aria-labelledby="booking-times" className="grid grid-cols-3 gap-2 min-[375px]:grid-cols-4 sm:grid-cols-5">
                  {availableTimeSlots.map((time) => (
                    <label key={time} className="min-w-0 cursor-pointer">
                      <input
                        type="radio"
                        name="booking-time"
                        value={time}
                        checked={selectedTime === time}
                        onChange={() => {
                          setSelectedTime(time)
                          setSubmitError("")
                        }}
                        className="peer sr-only"
                      />
                      <span className="grid min-h-11 place-items-center rounded-lg border border-[#dcdedc] bg-white px-1 text-sm font-medium tabular-nums transition-colors hover:border-[#475872] peer-checked:border-[#172134] peer-checked:bg-[#172134] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#334663]">
                        {time}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="customer-heading" className="space-y-4 px-4 py-5 sm:px-6">
            <h3 id="customer-heading" className="flex items-center gap-2.5 font-semibold">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-[#172134] text-xs text-white">2</span>
              Seus dados
            </h3>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  className={`${control} h-12`}
                  placeholder="Seu nome"
                  autoComplete="name"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  className={`${control} h-12`}
                  placeholder="(81) 98765-4321"
                  type="tel"
                  autoComplete="tel-national"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  maxLength={30}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações <span className="font-normal text-slate-600">(opcional)</span></Label>
              <Textarea
                id="notes"
                className={`${control} min-h-16`}
                placeholder="Alguma observação sobre o atendimento?"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>
          </section>
        </fieldset>

        <div className="space-y-3 rounded-b-2xl border-t border-[#edeae4] bg-[#fcfbf8] px-4 py-4 sm:px-6 lg:rounded-b-3xl">
          {submitError ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{submitError}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-600">Resumo da reserva</p>
              {selectedServiceData ? (
                <>
                  <p className="mt-0.5 break-words text-sm font-semibold">
                    {money(selectedServiceData.price)} · {selectedServiceData.duration} min
                  </p>
                  {selectedTime ? (
                    <p className="mt-0.5 text-xs tabular-nums text-slate-600">
                      {selectedTime}–{endOfService(selectedTime, selectedServiceData.duration)}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-0.5 text-sm text-slate-600">Selecione um serviço</p>
              )}
            </div>
            <Button
              type="submit"
              className={`${primary} w-full justify-between sm:w-auto`}
              disabled={isLoading || loading || !availableTimeSlots.includes(selectedTime)}
            >
              {isLoading ? "Agendando…" : "Confirmar agendamento"} <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
