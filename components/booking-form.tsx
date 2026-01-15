"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock } from "lucide-react"
import { format, addMinutes, parse, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Service, Barber } from "@/lib/types"

interface BookingFormProps {
  services: Service[]
  barbers: Barber[]
}

const allTimeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
]

// ✅ margem de segurança para “agendar em cima da hora”
const MINUTES_CUTOFF = 5

export function BookingForm({ services, barbers }: BookingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedService, setSelectedService] = useState<string>("")
  const [selectedBarber, setSelectedBarber] = useState<string>(barbers.length === 1 ? barbers[0].id : "")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(allTimeSlots)

  const { toast } = useToast()

  const selectedServiceData = services.find((s) => s.id === selectedService)

  useEffect(() => {
    if (barbers.length === 1 && selectedBarber !== barbers[0].id) {
      setSelectedBarber(barbers[0].id)
    }
  }, [barbers, selectedBarber])

  const calculateAvailableTimeSlots = async (serviceId: string, barberId: string, date: Date) => {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return allTimeSlots

    const supabase = createClient()
    const dateStr = format(date, "yyyy-MM-dd")
    const dayOfWeek = date.getDay()

    // Fetch availability for the selected day
    const { data: availability } = await supabase.from("availability").select("*").eq("day_of_week", dayOfWeek).single()

    if (!availability || !availability.is_active) {
      setAvailableTimeSlots([])
      return
    }

    // Generate slots based on availability
    const slots: string[] = []
    let current = parse(availability.start_time.slice(0, 5), "HH:mm", new Date())
    const end = parse(availability.end_time.slice(0, 5), "HH:mm", new Date())

    while (current < end) {
      slots.push(format(current, "HH:mm"))
      current = addMinutes(current, 30)
    }

    // Get existing appointments for the selected barber and date
    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("appointment_time, service_duration_at_booking")
      .eq("barber_id", barberId)
      .eq("appointment_date", dateStr)
      .in("status", ["pending", "confirmed"])

    const occupiedSlots = new Set<string>()

    // Mark all occupied time slots based on appointment duration
    existingAppointments?.forEach((apt: { appointment_time: string; service_duration_at_booking: number }) => {
      const startTime = parse(apt.appointment_time.slice(0, 5), "HH:mm", new Date())
      const duration = apt.service_duration_at_booking || 30
      const endTime = addMinutes(startTime, duration)

      slots.forEach((slot) => {
        const slotTime = parse(slot, "HH:mm", new Date())
        const slotEndTime = addMinutes(slotTime, service.duration)

        // Check if slots overlap
        if (
          (slotTime >= startTime && slotTime < endTime) ||
          (slotEndTime > startTime && slotEndTime <= endTime) ||
          (slotTime <= startTime && slotEndTime >= endTime)
        ) {
          occupiedSlots.add(slot)
        }
      })
    })

    // Mark slots occupied by breaks
    if (availability.breaks) {
      availability.breaks.forEach((brk: { start: string; end: string }) => {
        const startStr = brk.start ? brk.start.slice(0, 5) : ""
        const endStr = brk.end ? brk.end.slice(0, 5) : ""

        if (!startStr || !endStr) return

        const breakStart = parse(startStr, "HH:mm", new Date())
        const breakEnd = parse(endStr, "HH:mm", new Date())

        slots.forEach((slot) => {
          const slotTime = parse(slot, "HH:mm", new Date())
          const slotEndTime = addMinutes(slotTime, service.duration)

          // Check if slot overlaps with break
          if (
            (slotTime >= breakStart && slotTime < breakEnd) ||
            (slotEndTime > breakStart && slotEndTime <= breakEnd) ||
            (slotTime <= breakStart && slotEndTime >= breakEnd)
          ) {
            occupiedSlots.add(slot)
          }
        })
      })
    }

    // Use availability.end_time as closing time
    const closingTime = parse(availability.end_time.slice(0, 5), "HH:mm", new Date())

    const now = new Date()
    const cutoffNow = addMinutes(now, MINUTES_CUTOFF) // ✅ margem

    const available = slots.filter((slot) => {
      if (occupiedSlots.has(slot)) return false

      // Checa se o serviço cabe até o fechamento
      const slotTime = parse(slot, "HH:mm", new Date())
      const endTime = addMinutes(slotTime, service.duration)
      if (endTime > closingTime) return false

      // ✅ se for HOJE, remove horários que já passaram (com margem)
      if (isSameDay(date, now)) {
        const slotDateTime = new Date(date)
        const [hh, mm] = slot.split(":").map((n) => Number(n))
        slotDateTime.setHours(hh, mm, 0, 0)

        if (slotDateTime <= cutoffNow) return false
      }

      return true
    })

    setAvailableTimeSlots(available)

    // ✅ se o horário selecionado ficou inválido após recalcular, limpa seleção
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
      setAvailableTimeSlots(allTimeSlots)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      // First, create or get the client
      const { data: existingClient } = await supabase.from("clients").select("*").eq("phone", clientPhone).single()

      let clientId = existingClient?.id

      if (!existingClient) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
          })
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      const { error: appointmentError } = await supabase.from("appointments").insert({
        client_id: clientId,
        barber_id: selectedBarber,
        service_id: selectedService,
        appointment_date: format(selectedDate!, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        status: "pending",
        notes: notes || null,
        service_price_at_booking: selectedServiceData!.price,
        service_duration_at_booking: selectedServiceData!.duration,
      })

      if (appointmentError) throw appointmentError

      toast({
        title: "Agendamento realizado com sucesso!",
        description: "Volte sempre.",
      })

      // Reset form
      setSelectedDate(undefined)
      setSelectedService("")
      setSelectedBarber("")
      setSelectedTime("")
      setClientName("")
      setClientPhone("")
      setClientEmail("")
      setNotes("")
      setAvailableTimeSlots(allTimeSlots)
    } catch (error) {
      console.error("[v0] Booking error:", error)
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
        // ✅ GLASSMORPHISM (vidro)
        "border-white/15 bg-background/40 backdrop-blur-xl shadow-xl",
        "supports-backdrop-filter:bg-background/30",
        "dark:border-white/10 dark:bg-background/30",
        // ✅ estética premium
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
                placeholder="(11) 98765-4321"
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
              placeholder="seu@email.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
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
                    <div className="flex flex-col">
                      <span>{barber.name}</span>
                      {barber.specialty && <span className="text-xs text-muted-foreground">{barber.specialty}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {selectedServiceData && <p className="text-sm text-muted-foreground">{selectedServiceData.description}</p>}
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
                    {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    locale={ptBR}
                  />
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
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {time}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum horário disponível</div>
                  )}
                </SelectContent>
              </Select>
              {selectedService && selectedBarber && selectedDate && availableTimeSlots.length === 0 && (
                <p className="text-sm text-destructive">Não há horários disponíveis para esta data</p>
              )}
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
            {isLoading ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
