"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { useToast } from "@/hooks/use-toast"

import { Calendar as CalendarIcon } from "lucide-react"
import { addMinutes, format, isSameDay, parse } from "date-fns"
import { ptBR } from "date-fns/locale"

import type { Service, Barber } from "@/lib/types"

interface BookingFormProps {
  services: Service[]
  barbers: Barber[]
  barbershopId: string
}

// ✅ margem de segurança para “agendar em cima da hora”
const MINUTES_CUTOFF = 5

export function BookingForm({ services, barbers, barbershopId }: BookingFormProps) {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedService, setSelectedService] = useState<string>("")
  const [selectedBarber, setSelectedBarber] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")

  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [notes, setNotes] = useState("")

  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])

  const selectedServiceData = useMemo(
    () => services.find((s) => s.id === selectedService),
    [services, selectedService],
  )

  // Se só existir 1 barbeiro, seleciona automaticamente
  useEffect(() => {
    if (barbers.length === 1 && selectedBarber !== barbers[0].id) {
      setSelectedBarber(barbers[0].id)
    }
  }, [barbers, selectedBarber])

  const calculateAvailableTimeSlots = async (serviceId: string, barberId: string, date: Date) => {
    const service = services.find((s) => s.id === serviceId)
    if (!service) {
      setAvailableTimeSlots([])
      return
    }

    const dateStr = format(date, "yyyy-MM-dd")
    const dayOfWeek = date.getDay()

    // ✅ availability por (shop, day_of_week)
    const { data: availability, error: availabilityError } = await supabase
      .from("availability")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle()

    if (availabilityError) {
      console.error("[BookingForm] availability error:", availabilityError)
    }

    if (!availability || !availability.is_active) {
      setAvailableTimeSlots([])
      return
    }

    // slots conforme abertura
    const slots: string[] = []
    let current = parse(String(availability.start_time).slice(0, 5), "HH:mm", new Date())
    const end = parse(String(availability.end_time).slice(0, 5), "HH:mm", new Date())

    while (current < end) {
      slots.push(format(current, "HH:mm"))
      current = addMinutes(current, 30)
    }

    // agendamentos existentes (do barbeiro + barbearia + dia)
    const { data: existingAppointments, error: apptError } = await supabase
      .from("appointments")
      .select("appointment_time, service_duration_at_booking")
      .eq("barbershop_id", barbershopId)
      .eq("barber_id", barberId)
      .eq("appointment_date", dateStr)
      .in("status", ["pending", "confirmed"])

    if (apptError) {
      console.error("[BookingForm] existing appointments error:", apptError)
    }

    const occupiedSlots = new Set<string>()

    // marca slots ocupados conforme duração de cada agendamento
    existingAppointments?.forEach((apt: { appointment_time: string; service_duration_at_booking: number | null }) => {
      const startTime = parse(String(apt.appointment_time).slice(0, 5), "HH:mm", new Date())
      const duration = apt.service_duration_at_booking ?? 30
      const endTime = addMinutes(startTime, duration)

      slots.forEach((slot) => {
        const slotTime = parse(slot, "HH:mm", new Date())
        const slotEndTime = addMinutes(slotTime, service.duration)

        const overlaps =
          (slotTime >= startTime && slotTime < endTime) ||
          (slotEndTime > startTime && slotEndTime <= endTime) ||
          (slotTime <= startTime && slotEndTime >= endTime)

        if (overlaps) occupiedSlots.add(slot)
      })
    })

    // breaks (jsonb)
    const breaksArr: any[] = Array.isArray((availability as any).breaks) ? (availability as any).breaks : []
    if (breaksArr.length > 0) {
      breaksArr.forEach((brk) => {
        const startStr = brk?.start ? String(brk.start).slice(0, 5) : ""
        const endStr = brk?.end ? String(brk.end).slice(0, 5) : ""
        if (!startStr || !endStr) return

        const breakStart = parse(startStr, "HH:mm", new Date())
        const breakEnd = parse(endStr, "HH:mm", new Date())

        slots.forEach((slot) => {
          const slotTime = parse(slot, "HH:mm", new Date())
          const slotEndTime = addMinutes(slotTime, service.duration)

          const overlaps =
            (slotTime >= breakStart && slotTime < breakEnd) ||
            (slotEndTime > breakStart && slotEndTime <= breakEnd) ||
            (slotTime <= breakStart && slotEndTime >= breakEnd)

          if (overlaps) occupiedSlots.add(slot)
        })
      })
    }

    const closingTime = parse(String(availability.end_time).slice(0, 5), "HH:mm", new Date())
    const now = new Date()
    const cutoffNow = addMinutes(now, MINUTES_CUTOFF)

    const available = slots.filter((slot) => {
      if (occupiedSlots.has(slot)) return false

      // serviço precisa caber até o fechamento
      const slotTime = parse(slot, "HH:mm", new Date())
      const endTime = addMinutes(slotTime, service.duration)
      if (endTime > closingTime) return false

      // se for HOJE, remove horários que já passaram (com margem)
      if (isSameDay(date, now)) {
        const slotDateTime = new Date(date)
        const [hh, mm] = slot.split(":").map((n) => Number(n))
        slotDateTime.setHours(hh, mm, 0, 0)
        if (slotDateTime <= cutoffNow) return false
      }

      return true
    })

    setAvailableTimeSlots(available)

    // se o horário selecionado ficou inválido após recalcular, limpa seleção
    if (selectedTime && !available.includes(selectedTime)) {
      setSelectedTime("")
    }
  }

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId)
    setSelectedTime("")
    if (serviceId && selectedBarber && selectedDate) {
      calculateAvailableTimeSlots(serviceId, selectedBarber, selectedDate)
    }
  }

  const handleBarberChange = (barberId: string) => {
    setSelectedBarber(barberId)
    setSelectedTime("")
    if (selectedService && barberId && selectedDate) {
      calculateAvailableTimeSlots(selectedService, barberId, selectedDate)
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedTime("")
    if (date && selectedService && selectedBarber) {
      calculateAvailableTimeSlots(selectedService, selectedBarber, date)
    } else {
      setAvailableTimeSlots([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!barbershopId) {
      toast({
        title: "Erro",
        description: "Barbearia inválida (barbershopId ausente).",
        variant: "destructive",
      })
      return
    }

    if (!selectedDate || !selectedService || !selectedBarber || !selectedTime) {
      toast({
        title: "Preencha todos os campos",
        description: "Selecione serviço, barbeiro, data e horário.",
        variant: "destructive",
      })
      return
    }

    const service = services.find((s) => s.id === selectedService)
    if (!service) {
      toast({ title: "Erro", description: "Serviço inválido.", variant: "destructive" })
      return
    }

    setIsLoading(true)

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")

      // 1) client por (shop, phone)
      const { data: existingClient, error: clientLookupError } = await supabase
        .from("clients")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("phone", clientPhone)
        .maybeSingle()

      if (clientLookupError) {
        console.error("[BookingForm] client lookup error:", clientLookupError)
      }

      let clientId = existingClient?.id

      // 2) cria client se não existe
      if (!clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            barbershop_id: barbershopId,
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
            notes: null,
          })
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // 3) cria agendamento (com snapshot de preço/duração)
      const { error: appointmentError } = await supabase.from("appointments").insert({
        barbershop_id: barbershopId,
        client_id: clientId,
        barber_id: selectedBarber,
        service_id: selectedService,
        appointment_date: dateStr,
        appointment_time: selectedTime,
        status: "confirmed",
        notes: notes || null,
        service_price_at_booking: service.price,
        service_duration_at_booking: service.duration,
      })

      if (appointmentError) throw appointmentError

      toast({
        title: "Agendamento realizado com sucesso!",
        description: "Volte sempre.",
      })

      // Reset form
      setSelectedDate(undefined)
      setSelectedService("")
      setSelectedBarber(barbers.length === 1 ? barbers[0].id : "")
      setSelectedTime("")
      setClientName("")
      setClientPhone("")
      setClientEmail("")
      setNotes("")
      setAvailableTimeSlots([])
    } catch (error) {
      console.error("[BookingForm] error:", error)
      toast({
        title: "Erro ao agendar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Serviço</Label>
            <Select value={selectedService} onValueChange={handleServiceChange} required>
              <SelectTrigger id="service">
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">
                        R$ {service.price.toFixed(2)} • {service.duration}min
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barber">Barbeiro</Label>
            <Select value={selectedBarber} onValueChange={handleBarberChange} required>
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
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent" type="button">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={handleDateChange} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
                required
                disabled={!selectedService || !selectedBarber || !selectedDate}
              >
                <SelectTrigger id="time">
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum horário disponível</div>
                  )}
                </SelectContent>
              </Select>

              {/* recalcula quando tiver tudo selecionado */}
              {selectedService && selectedBarber && selectedDate ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-0 text-sm underline text-muted-foreground hover:text-foreground"
                  onClick={() => calculateAvailableTimeSlots(selectedService, selectedBarber, selectedDate)}
                >
                  Atualizar horários
                </Button>
              ) : null}
            </div>
          </div>

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

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Agendando..." : "Confirmar agendamento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
