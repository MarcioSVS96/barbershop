"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { createClient } from "@/lib/supabase/client"

import { TrendingUp, DollarSign, Calendar as CalendarIcon } from "lucide-react"

import { isSameWeek, isSameMonth, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"

import type { Barber } from "@/lib/types"

interface BarbershopManagementProps {
  barbershopId: string
  barbers: Barber[]
  payments: any[]
  today: string // "yyyy-MM-dd"
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
}

export function BarbershopManagement({
  barbershopId,
  barbers: initialBarbers,
  payments,
  today,
}: BarbershopManagementProps) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers)
  const [selectedBarberId, setSelectedBarberId] = useState<string>(initialBarbers.length > 0 ? initialBarbers[0].id : "")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // ✅ agendamentos do dia selecionado
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<any[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)

  const supabase = createClient()

  // Mantém a lista em sincronia se o server atualizar (router.refresh no page)
  useEffect(() => {
    setBarbers(initialBarbers)
    if (initialBarbers.length > 0 && !initialBarbers.some((b) => b.id === selectedBarberId)) {
      setSelectedBarberId(initialBarbers[0].id)
    }
    if (initialBarbers.length === 0) {
      setSelectedBarberId("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBarbers])

  const selectedBarberPayments = useMemo(
    () => payments.filter((p) => p.appointments?.barber_id === selectedBarberId),
    [payments, selectedBarberId],
  )

  const todayDate = new Date(today)
  const currentYear = todayDate.getFullYear()

  const stats = {
    today: selectedBarberPayments
      .filter((p) => p.appointments?.appointment_date === today)
      .reduce((acc, curr) => acc + Number(curr.amount), 0),

    week: selectedBarberPayments
      .filter((p) => p.appointments?.appointment_date && isSameWeek(new Date(p.appointments.appointment_date), todayDate))
      .reduce((acc, curr) => acc + Number(curr.amount), 0),

    month: selectedBarberPayments
      .filter((p) => p.appointments?.appointment_date && isSameMonth(new Date(p.appointments.appointment_date), todayDate))
      .reduce((acc, curr) => acc + Number(curr.amount), 0),
  }

  const selectedDateStr = useMemo(() => (selectedDate ? format(selectedDate, "yyyy-MM-dd") : null), [selectedDate])

  const selectedDateRevenue = selectedDateStr
    ? selectedBarberPayments
        .filter((p) => p.appointments?.appointment_date === selectedDateStr)
        .reduce((acc, curr) => acc + Number(curr.amount), 0)
    : 0

  // buscar agendamentos do dia selecionado (do barbeiro selecionado)
  useEffect(() => {
    const run = async () => {
      if (!barbershopId || !selectedBarberId || !selectedDateStr) {
        setSelectedDateAppointments([])
        return
      }

      setIsLoadingAppointments(true)
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            *,
            clients(*),
            services(*)
          `,
          )
          .eq("barbershop_id", barbershopId) // ✅ multi-tenant
          .eq("barber_id", selectedBarberId)
          .eq("appointment_date", selectedDateStr)
          .order("appointment_time", { ascending: true })

        if (error) throw error
        setSelectedDateAppointments(data || [])
      } catch (e) {
        console.error("Error fetching selected day appointments:", e)
        setSelectedDateAppointments([])
      } finally {
        setIsLoadingAppointments(false)
      }
    }

    run()
  }, [supabase, barbershopId, selectedBarberId, selectedDateStr])

  // MONTHLY REVENUE (CURRENT YEAR ONLY, ALL MONTHS)
  const monthlyRevenueData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

    const totals = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthLabel: months[i],
      revenue: 0,
    }))

    for (const p of selectedBarberPayments) {
      const dateStr = p?.appointments?.appointment_date
      if (!dateStr) continue

      const d = new Date(dateStr)
      if (Number.isNaN(d.getTime())) continue
      if (d.getFullYear() !== currentYear) continue

      const month = d.getMonth()
      totals[month].revenue += Number(p.amount || 0)
    }

    return totals
  }, [selectedBarberPayments, currentYear])

  const totalYearRevenue = useMemo(
    () => monthlyRevenueData.reduce((acc, item) => acc + Number(item.revenue || 0), 0),
    [monthlyRevenueData],
  )

  const maxMonthlyRevenue = useMemo(() => {
    const max = Math.max(...monthlyRevenueData.map((m) => Number(m.revenue || 0)))
    return max > 0 ? max : 1
  }, [monthlyRevenueData])

  const BAR_MAX_PX = 160

  return (
    <div className="space-y-6">
      <Card className="border-muted/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg sm:text-xl">Relatório Financeiro por Barbeiro</CardTitle>
              <CardDescription>Visualize o desempenho individual e o faturamento por data</CardDescription>
            </div>

            <div className="w-full sm:w-64">
              <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                <SelectTrigger>
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
          </div>
        </CardHeader>

        <CardContent>
          {selectedBarberId ? (
            <div className="space-y-6">
              {/* stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-muted/60 bg-muted/10 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Hoje</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">R$ {stats.today.toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card className="border-muted/60 bg-muted/10 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Esta semana</CardTitle>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">R$ {stats.week.toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card className="border-muted/60 bg-muted/10 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Este mês</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">R$ {stats.month.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* calendar + revenue */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-muted/60 bg-muted/10 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      Selecione uma data
                    </CardTitle>
                    <CardDescription>Veja o faturamento e os agendamentos no dia escolhido</CardDescription>
                  </CardHeader>

                  <CardContent className="flex justify-center">
                    <div className="rounded-lg border bg-background p-2">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ptBR} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted/60 shadow-sm">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-base">
                      Faturamento em {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "-"}
                    </CardTitle>
                    <CardDescription>Somatório de pagamentos e lista de agendamentos do dia</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="rounded-xl border bg-muted/10 p-6">
                      <div className="text-sm text-muted-foreground mb-2">Total</div>
                      <div className="text-4xl font-semibold tracking-tight">R$ {selectedDateRevenue.toFixed(2)}</div>

                      <div className="mt-5 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">Agendamentos do dia</div>
                          <Badge variant="outline">{selectedDateAppointments.length}</Badge>
                        </div>

                        {isLoadingAppointments ? (
                          <p className="mt-3 text-sm text-muted-foreground">Carregando agendamentos...</p>
                        ) : selectedDateAppointments.length === 0 ? (
                          <p className="mt-3 text-sm text-muted-foreground">Nenhum agendamento encontrado nessa data.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {selectedDateAppointments.map((apt) => (
                              <div key={apt.id} className="rounded-lg border bg-background p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium">{apt.appointment_time}</div>
                                  <Badge variant="outline" className={statusColors[apt.status] || ""}>
                                    {statusLabels[apt.status] || apt.status}
                                  </Badge>
                                </div>

                                <div className="mt-1 text-sm">
                                  <span className="font-medium">{apt.clients?.name ?? "Cliente"}</span>
                                  {apt.clients?.phone ? (
                                    <span className="text-muted-foreground"> • {apt.clients.phone}</span>
                                  ) : null}
                                </div>

                                <div className="mt-1 text-sm text-muted-foreground">
                                  {apt.services?.name ?? "Serviço"} • R${" "}
                                  {Number(apt.service_price_at_booking || 0).toFixed(2)}
                                </div>

                                {apt.notes ? (
                                  <div className="mt-1 text-xs text-muted-foreground">Obs: {apt.notes}</div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* GRÁFICO */}
              <Card className="border-muted/60 shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Lucro mensal ({currentYear})</CardTitle>
                  <CardDescription>
                    Mostra todos os meses (Jan–Dez) e o total do ano para o barbeiro selecionado
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-4 rounded-xl border bg-muted/10 p-4">
                    <div className="text-sm text-muted-foreground">Total no ano</div>
                    <div className="text-2xl font-semibold">R$ {totalYearRevenue.toFixed(2)}</div>
                  </div>

                  <div className="rounded-xl border bg-muted/10 p-4">
                    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
                      <div
                        className="flex min-w-180 items-end gap-4 md:grid md:min-w-0 md:grid-cols-12 md:gap-5"
                        style={{ height: BAR_MAX_PX + 60 }}
                      >
                        {monthlyRevenueData.map((m) => {
                          const revenue = Number(m.revenue || 0)
                          const barHeightPx = Math.round((revenue / maxMonthlyRevenue) * BAR_MAX_PX)
                          const safeHeight = Math.max(2, barHeightPx)

                          return (
                            <div key={m.monthIndex} className="flex flex-col items-center justify-end">
                              <div className="mb-2 text-[11px] text-muted-foreground tabular-nums">
                                {revenue > 0 ? `R$ ${revenue.toFixed(0)}` : "—"}
                              </div>

                              <div className="flex w-10 items-end justify-center" style={{ height: BAR_MAX_PX }}>
                                <div
                                  className="w-full rounded-lg border bg-background"
                                  title={`${m.monthLabel}/${currentYear}: R$ ${revenue.toFixed(2)}`}
                                  style={{
                                    height: `${revenue > 0 ? safeHeight : 2}px`,
                                    transition: "height 200ms ease",
                                  }}
                                />
                              </div>

                              <div className="mt-2 text-xs text-muted-foreground">{m.monthLabel}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground md:hidden">
                      No celular, deslize para o lado para ver todos os meses.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground">Selecione um barbeiro para ver os dados</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
