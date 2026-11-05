"use client"

import { useEffect, useMemo, useState } from "react"
import { createPublicBooking } from "@/lib/barber/actions"
import {
  endOfService,
  money,
  normalizePhone,
  shopDate,
} from "@/lib/barber/time"
import { useBookingTimes } from "./use-booking-times"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { useToast } from "@/hooks/use-toast"

import { Calendar as CalendarIcon, RefreshCcw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import type { Service, Barber } from "@/lib/types"

interface BookingFormProps {
  services: Service[]
  barbers: Pick<Barber, "id" | "name" | "specialty">[]
  barbershopId: string
  whatsappPhone?: string | null
}

export function BookingForm({
  services,
  barbers,
  barbershopId,
  whatsappPhone,
}: BookingFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedService, setSelectedService] = useState("")
  const [selectedBarber, setSelectedBarber] = useState(
    barbers.length === 1 ? barbers[0].id : "",
  )
  const [selectedTime, setSelectedTime] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [confirmed, setConfirmed] = useState<{
    when: string
    link: string | null
  }>()
  const selectedServiceData = useMemo(
    () => services.find((service) => service.id === selectedService),
    [services, selectedService],
  )
  const date = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
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
    if (!loading && !availableTimeSlots.includes(selectedTime))
      setSelectedTime("")
  }, [availableTimeSlots, selectedTime, loading])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !selectedDate ||
      !selectedServiceData ||
      !availableTimeSlots.includes(selectedTime)
    ) {
      toast({ title: "Escolha um horário disponível", variant: "destructive" })
      return
    }
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
        toast({ title: result.error, variant: "destructive" })
        setSelectedTime("")
        refresh()
        return
      }
      const when = `${format(selectedDate, "dd/MM/yyyy")} às ${selectedTime}`
      const phone = normalizePhone(whatsappPhone || "")
      const message = [
        "Olá! Fiz um agendamento pelo site.",
        `Cliente: ${clientName}`,
        `Serviço: ${selectedServiceData.name}`,
        `Barbeiro: ${barbers.find((b) => b.id === selectedBarber)?.name ?? "Barbeiro"}`,
        `Data e horário: ${when}`,
      ].join("\n")
      setConfirmed({
        when,
        link: /^\d{10,11}$/.test(phone)
          ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
          : null,
      })
      toast({ title: "Agendamento confirmado" })
    } catch {
      toast({
        title:
          "Não foi possível concluir. Atualize os horários antes de tentar novamente.",
        variant: "destructive",
      })
      setSelectedTime("")
      refresh()
    } finally {
      setIsLoading(false)
    }
  }

  if (confirmed) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="space-y-4 p-6 text-center sm:p-8">
          <h3 className="text-xl font-semibold">Agendamento confirmado</h3>
          <p className="text-muted-foreground">
            {confirmed.when} · {selectedServiceData?.name}
          </p>
          {confirmed.link ? (
            <Button asChild>
              <a
                href={confirmed.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar com a barbearia no WhatsApp
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={[
        "border-white/15 bg-background/40 backdrop-blur-xl shadow-xl",
        "supports-backdrop-filter:bg-background/30",
        "dark:border-white/10 dark:bg-background/30",
        "rounded-2xl overflow-hidden",
      ].join(" ")}
    >
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(81) 98765-4321"
                type="tel"
                autoComplete="tel-national"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Serviço</Label>
            <Select
              value={selectedService}
              onValueChange={(value) => {
                setSelectedService(value)
                setSelectedTime("")
              }}
              required
            >
              <SelectTrigger id="service">
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">
                        {money(service.price)} · {service.duration} min
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barber">Barbeiro</Label>
            <Select
              value={selectedBarber}
              onValueChange={(value) => {
                setSelectedBarber(value)
                setSelectedTime("")
              }}
              required
            >
              <SelectTrigger id="barber">
                <SelectValue placeholder="Selecione um barbeiro" />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-transparent"
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "PPP", { locale: ptBR })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(value) => {
                      setSelectedDate(value)
                      setSelectedTime("")
                    }}
                    disabled={(value) =>
                      format(value, "yyyy-MM-dd") < shopDate()
                    }
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedTime}
                    onValueChange={setSelectedTime}
                    required
                    disabled={
                      !selectedService ||
                      !selectedBarber ||
                      !selectedDate ||
                      loading ||
                      !availableTimeSlots.length ||
                      isLoading
                    }
                  >
                    <SelectTrigger id="time">
                      <SelectValue
                        placeholder={
                          loading
                            ? "Consultando horários…"
                            : "Selecione o horário"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.length > 0 ? (
                        availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Nenhum horário disponível
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* recalcula quando tiver tudo selecionado */}
                {selectedService && selectedBarber && selectedDate ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      setSelectedTime("")
                      refresh()
                    }}
                    aria-label="Atualizar horários"
                    title="Atualizar horários"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {!error &&
          !loading &&
          selectedService &&
          selectedBarber &&
          selectedDate &&
          !availableTimeSlots.length ? (
            <p role="status" className="text-sm text-muted-foreground">
              Nenhum horário disponível para esse serviço nessa data.
            </p>
          ) : null}
          {selectedTime && selectedServiceData ? (
            <p className="rounded-md bg-muted p-3 text-sm">
              {selectedServiceData.name} · {selectedServiceData.duration} min ·{" "}
              {selectedTime}–
              {endOfService(selectedTime, selectedServiceData.duration)}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Alguma observação ou preferência especial?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={
              isLoading || loading || !availableTimeSlots.includes(selectedTime)
            }
          >
            {isLoading ? "Agendando..." : "Confirmar agendamento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
