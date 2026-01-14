"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Appointment } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Check, X, DollarSign } from "lucide-react"

interface AppointmentsListProps {
  appointments: Appointment[]
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

export function AppointmentsList({ appointments: initialAppointments }: AppointmentsListProps) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "pix">("cash")
  const [paymentAmount, setPaymentAmount] = useState("")

  const { toast } = useToast()
  const supabase = createClient()

  const updateStatus = async (appointmentId: string, newStatus: "confirmed" | "completed" | "cancelled") => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", appointmentId)

      if (error) throw error

      setAppointments((prev) => prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: newStatus } : apt)))

      toast({
        title: "Status atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      })
    } catch (error) {
      console.error("[v0] Update status error:", error)
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addPayment = async (appointmentId: string) => {
    setIsLoading(true)
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId)
      if (!appointment) throw new Error("Agendamento não encontrado")

      const amount = paymentAmount ? Number.parseFloat(paymentAmount) : appointment.service_price_at_booking
      const barberCommission = amount * 0.6
      const barbershopRevenue = amount * 0.4

      const { error } = await supabase.from("payments").insert({
        appointment_id: appointmentId,
        amount,
        payment_method: paymentMethod,
        barber_commission: barberCommission,
        barbershop_revenue: barbershopRevenue,
        payment_date: appointment.appointment_date,
      })

      if (error) throw error

      // Update appointment status to completed
      await updateStatus(appointmentId, "completed")

      toast({
        title: "Pagamento registrado",
        description: `Pagamento de R$ ${amount.toFixed(2)} registrado com sucesso.`,
      })

      setPaymentDialog(null)
      setPaymentAmount("")
      window.location.reload()
    } catch (error) {
      console.error("[v0] Payment error:", error)
      toast({
        title: "Erro ao registrar pagamento",
        description: "Não foi possível registrar o pagamento.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Group appointments by date
  const appointmentsByDate = appointments.reduce(
    (acc, apt) => {
      const date = apt.appointment_date
      if (!acc[date]) acc[date] = []
      acc[date].push(apt)
      return acc
    },
    {} as Record<string, Appointment[]>,
  )

  return (
    <div className="space-y-6">
      {Object.entries(appointmentsByDate).map(([date, dateAppointments]) => (
        <Card key={date}>
          <CardHeader>
            <CardTitle>{format(new Date(date + "T00:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}</CardTitle>
            <CardDescription>{dateAppointments.length} agendamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dateAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{appointment.appointment_time}</p>
                      <Badge variant="outline" className={statusColors[appointment.status]}>
                        {statusLabels[appointment.status]}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{appointment.clients?.name}</span> • {appointment.clients?.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.services?.name} com {appointment.barbers?.name}
                    </p>
                    <p className="text-sm font-medium">R$ {appointment.service_price_at_booking.toFixed(2)}</p>
                    {appointment.notes && <p className="text-sm text-muted-foreground">Obs: {appointment.notes}</p>}
                  </div>

                  <div className="flex gap-2">
                    {appointment.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(appointment.id, "confirmed")}
                        disabled={isLoading}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {appointment.status === "confirmed" && (
                      <Dialog
                        open={paymentDialog === appointment.id}
                        onOpenChange={(open) => setPaymentDialog(open ? appointment.id : null)}
                      >
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
                                placeholder={`R$ ${appointment.service_price_at_booking.toFixed(2)}`}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Deixe em branco para usar o valor do agendamento
                              </p>
                            </div>
                          </div>
                          <Button onClick={() => addPayment(appointment.id)} disabled={isLoading} className="w-full">
                            {isLoading ? "Processando..." : "Confirmar Pagamento"}
                          </Button>
                        </DialogContent>
                      </Dialog>
                    )}
                    {(appointment.status === "pending" || appointment.status === "confirmed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(appointment.id, "cancelled")}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(appointmentsByDate).length === 0 && (
        <Card>
          <CardContent className="flex min-h-50 items-center justify-center">
            <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
