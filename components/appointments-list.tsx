"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, addDays, isWithinInterval } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Appointment } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, X, DollarSign, Calendar as CalendarIcon } from "lucide-react"

interface AppointmentsListProps {
  appointments: Appointment[]
  barbershopId: string
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
}

const statusLabels = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
}

type QuickFilter = "today" | "tomorrow" | "next7" | "all" | "date"

export function AppointmentsList({ appointments: initialAppointments, barbershopId }: AppointmentsListProps) {
  const router = useRouter()

  const [appointments, setAppointments] = useState(initialAppointments)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "pix">("cash")
  const [paymentAmount, setPaymentAmount] = useState("")

  // ✅ filtros
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("today")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const { toast } = useToast()
  const supabase = createClient()

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const tomorrowStr = useMemo(() => format(addDays(new Date(), 1), "yyyy-MM-dd"), [])

  const updateStatus = async (appointmentId: string, newStatus: "confirmed" | "completed" | "cancelled") => {
    if (!barbershopId) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId)
        .eq("barbershop_id", barbershopId)

      if (error) throw error

      setAppointments((prev) => prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: newStatus } : apt)))

      toast({ title: "Status atualizado", description: "O agendamento foi atualizado com sucesso." })
      router.refresh()
    } catch (error: any) {
      console.error("[AppointmentsList] Update status error:", error)
      toast({
        title: "Erro ao atualizar",
        description: error?.message || "Não foi possível atualizar o status.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addPayment = async (appointmentId: string) => {
    if (!barbershopId) return

    setIsLoading(true)
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId)
      if (!appointment) throw new Error("Agendamento não encontrado")

      const base = Number(appointment.service_price_at_booking || 0)
      const amount = paymentAmount ? Number.parseFloat(paymentAmount) : base
      if (Number.isNaN(amount) || amount <= 0) throw new Error("Valor inválido")

      const barberCommission = Number((amount * 0.6).toFixed(2))
      const barbershopRevenue = Number((amount * 0.4).toFixed(2))

      const { error } = await supabase.from("payments").insert({
        barbershop_id: barbershopId,
        appointment_id: appointmentId,
        amount,
        payment_method: paymentMethod,
        barber_commission: barberCommission,
        barbershop_revenue: barbershopRevenue,
        // deixe o banco preencher, ou use timestamp real:
        // payment_date: new Date().toISOString(),
      })

      if (error) throw error

      await updateStatus(appointmentId, "completed")

      toast({
        title: "Pagamento registrado",
        description: `Pagamento de R$ ${amount.toFixed(2)} registrado com sucesso.`,
      })

      setPaymentDialog(null)
      setPaymentAmount("")
      router.refresh()
    } catch (error: any) {
      console.error("[AppointmentsList] Payment error:", error)
      toast({
        title: "Erro ao registrar pagamento",
        description: error?.message || "Não foi possível registrar o pagamento.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAppointments = useMemo(() => {
    if (quickFilter === "all") return appointments

    if (quickFilter === "today") return appointments.filter((apt) => apt.appointment_date === todayStr)
    if (quickFilter === "tomorrow") return appointments.filter((apt) => apt.appointment_date === tomorrowStr)

    if (quickFilter === "date") {
      if (!selectedDate) return []
      const dStr = format(selectedDate, "yyyy-MM-dd")
      return appointments.filter((apt) => apt.appointment_date === dStr)
    }

    // next7
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = addDays(start, 6)
    end.setHours(23, 59, 59, 999)

    return appointments.filter((apt) => {
      const d = new Date(apt.appointment_date + "T00:00:00")
      return isWithinInterval(d, { start, end })
    })
  }, [appointments, quickFilter, selectedDate, todayStr, tomorrowStr])

  const appointmentsByDate = useMemo(() => {
    const grouped = filteredAppointments.reduce((acc, apt) => {
      const date = apt.appointment_date
      if (!acc[date]) acc[date] = []
      acc[date].push(apt)
      return acc
    }, {} as Record<string, Appointment[]>)

    for (const dateKey of Object.keys(grouped)) {
      grouped[dateKey].sort((a, b) => (a.appointment_time || "").localeCompare(b.appointment_time || ""))
    }

    return grouped
  }, [filteredAppointments])

  const orderedDates = useMemo(() => {
    const dates = Object.keys(appointmentsByDate)
    dates.sort((a, b) => {
      const aIsToday = a === todayStr
      const bIsToday = b === todayStr
      if (aIsToday && !bIsToday) return -1
      if (!aIsToday && bIsToday) return 1
      return a.localeCompare(b)
    })
    return dates
  }, [appointmentsByDate, todayStr])

  const totalFiltered = filteredAppointments.length

  const filterLabel = useMemo(() => {
    if (quickFilter === "all") return "Todos"
    if (quickFilter === "today") return "Hoje"
    if (quickFilter === "tomorrow") return "Amanhã"
    if (quickFilter === "next7") return "Próximos 7 dias"
    if (quickFilter === "date") return selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Data"
    return "Filtro"
  }, [quickFilter, selectedDate])

  return (
    <div className="space-y-6">
      <Card className="border-muted/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Agendamentos</CardTitle>
              <CardDescription>
                Filtro: <span className="font-medium">{filterLabel}</span> • {totalFiltered} agendamentos
              </CardDescription>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={quickFilter === "today" ? "default" : "outline"} onClick={() => setQuickFilter("today")}>
                  Hoje
                </Button>
                <Button type="button" size="sm" variant={quickFilter === "tomorrow" ? "default" : "outline"} onClick={() => setQuickFilter("tomorrow")}>
                  Amanhã
                </Button>
                <Button type="button" size="sm" variant={quickFilter === "next7" ? "default" : "outline"} onClick={() => setQuickFilter("next7")}>
                  Próx. 7 dias
                </Button>
                <Button type="button" size="sm" variant={quickFilter === "all" ? "default" : "outline"} onClick={() => setQuickFilter("all")}>
                  Todos
                </Button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant={quickFilter === "date" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setQuickFilter("date")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {quickFilter === "date" && selectedDate ? format(selectedDate, "dd/MM") : "Escolher dia"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      setSelectedDate(d)
                      setQuickFilter("date")
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      </Card>

      {orderedDates.map((date) => {
        const dateAppointments = appointmentsByDate[date]
        const isToday = date === todayStr

        return (
          <Card key={date} className={isToday ? "border-muted/60 shadow-sm" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  {format(new Date(date + "T00:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  {isToday && (
                    <Badge className="ml-1" variant="default">
                      Hoje
                    </Badge>
                  )}
                </CardTitle>
              </div>
              <CardDescription>{dateAppointments.length} agendamentos</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {dateAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-start justify-between rounded-lg border p-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{appointment.appointment_time}</p>
                        <Badge variant="outline" className={statusColors[appointment.status as keyof typeof statusColors]}>
                          {statusLabels[appointment.status as keyof typeof statusLabels] ?? appointment.status}
                        </Badge>
                      </div>

                      <p className="text-sm">
                        <span className="font-medium">{appointment.clients?.name}</span> • {appointment.clients?.phone}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {appointment.services?.name} com {appointment.barbers?.name}
                      </p>

                      <p className="text-sm font-medium">R$ {Number(appointment.service_price_at_booking || 0).toFixed(2)}</p>

                      {appointment.notes && <p className="text-sm text-muted-foreground">Obs: {appointment.notes}</p>}
                    </div>

                    <div className="flex gap-2">
                      {appointment.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(appointment.id, "confirmed")} disabled={isLoading}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}

                      {appointment.status === "confirmed" && (
                        <Dialog open={paymentDialog === appointment.id} onOpenChange={(open) => setPaymentDialog(open ? appointment.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="default" disabled={isLoading}>
                              <DollarSign className="mr-1 h-4 w-4" />
                              Pagamento
                            </Button>
                          </DialogTrigger>

                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Registrar Pagamento</DialogTitle>
                              <DialogDescription>Registre o pagamento de {appointment.clients?.name}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Método de Pagamento</Label>
                                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                    <SelectItem value="card">Cartão</SelectItem>
                                    <SelectItem value="pix">PIX</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Valor (opcional)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder={`R$ ${Number(appointment.service_price_at_booking || 0).toFixed(2)}`}
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Deixe em branco para usar o valor do agendamento</p>
                              </div>
                            </div>

                            <Button onClick={() => addPayment(appointment.id)} disabled={isLoading} className="w-full">
                              {isLoading ? "Processando..." : "Confirmar Pagamento"}
                            </Button>
                          </DialogContent>
                        </Dialog>
                      )}

                      {(appointment.status === "pending" || appointment.status === "confirmed") && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(appointment.id, "cancelled")} disabled={isLoading}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {orderedDates.length === 0 && (
        <Card>
          <CardContent className="flex min-h-50 items-center justify-center">
            <p className="text-muted-foreground">Nenhum agendamento encontrado para esse filtro</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
