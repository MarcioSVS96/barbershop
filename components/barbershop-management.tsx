"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

import { Plus, Trash2, TrendingUp, DollarSign, Calendar as CalendarIcon, Edit, UserRound } from "lucide-react"

import { isSameWeek, isSameMonth, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"

import type { Barber } from "@/lib/types"

interface BarbershopManagementProps {
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

export function BarbershopManagement({ barbers: initialBarbers, payments, today }: BarbershopManagementProps) {
  const router = useRouter()

  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers)
  const [selectedBarberId, setSelectedBarberId] = useState<string>(initialBarbers.length > 0 ? initialBarbers[0].id : "")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [newBarberName, setNewBarberName] = useState("")
  const [newBarberSpecialty, setNewBarberSpecialty] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // ✅ NOVO: agendamentos do dia selecionado
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<any[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.id === selectedBarberId) || null,
    [barbers, selectedBarberId],
  )

  // =========================
  // CREATE / UPDATE BARBER
  // =========================
  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const barberData = {
        name: newBarberName,
        specialty: newBarberSpecialty || null,
      }

      if (editingBarber) {
        const { error } = await supabase.from("barbers").update(barberData).eq("id", editingBarber.id)
        if (error) throw error

        setBarbers((prev) => prev.map((b) => (b.id === editingBarber.id ? { ...b, ...barberData } : b)))

        toast({
          title: "Barbeiro atualizado",
          description: "As informações foram atualizadas com sucesso.",
        })
      } else {
        const { data, error } = await supabase.from("barbers").insert(barberData).select().single()
        if (error) throw error
        if (!data) throw new Error("Erro ao criar barbeiro")

        setBarbers((prev) => [...prev, data])

        if (barbers.length === 0) {
          setSelectedBarberId(data.id)
        }

        toast({
          title: "Barbeiro adicionado",
          description: "O novo barbeiro foi cadastrado com sucesso.",
        })
      }

      setNewBarberName("")
      setNewBarberSpecialty("")
      setEditingBarber(null)
      setIsDialogOpen(false)

      router.refresh()
    } catch (error: any) {
      console.error("Error saving barber:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as informações.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // =========================
  // DELETE BARBER
  // =========================
  const handleDeleteBarber = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este barbeiro?")) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("barbers").delete().eq("id", id)
      if (error) throw error

      const updated = barbers.filter((b) => b.id !== id)
      setBarbers(updated)

      if (selectedBarberId === id) {
        setSelectedBarberId(updated.length > 0 ? updated[0].id : "")
      }

      toast({
        title: "Barbeiro excluído",
        description: "O barbeiro foi removido com sucesso.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error deleting barber:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o barbeiro. Verifique se há agendamentos vinculados.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openAddDialog = () => {
    setEditingBarber(null)
    setNewBarberName("")
    setNewBarberSpecialty("")
    setIsDialogOpen(true)
  }

  const openEditDialog = (barber: Barber) => {
    setEditingBarber(barber)
    setNewBarberName(barber.name)
    setNewBarberSpecialty(barber.specialty || "")
    setIsDialogOpen(true)
  }

  // =========================
  // FINANCIAL CALCULATIONS
  // =========================
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

  // ✅ NOVO: buscar agendamentos do dia selecionado (do barbeiro selecionado)
  useEffect(() => {
    const run = async () => {
      if (!selectedBarberId || !selectedDateStr) {
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
  }, [supabase, selectedBarberId, selectedDateStr])

  // =========================
  // MONTHLY REVENUE (CURRENT YEAR ONLY, ALL MONTHS)
  // =========================
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

  // =========================
  // RENDER
  // =========================
  return (
    <div className="space-y-6">
      {/* GERENCIAR BARBEIROS */}
      <Card className="border-muted/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/40">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Gerenciar Barbeiros</CardTitle>
              </div>
              <CardDescription>Adicione, edite ou remova profissionais da equipe</CardDescription>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Barbeiro
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingBarber ? "Editar Barbeiro" : "Novo Barbeiro"}</DialogTitle>
                  <DialogDescription>
                    {editingBarber ? "Edite as informações do profissional." : "Cadastre um novo profissional."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSaveBarber} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" value={newBarberName} onChange={(e) => setNewBarberName(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade (opcional)</Label>
                    <Input
                      id="specialty"
                      value={newBarberSpecialty}
                      onChange={(e) => setNewBarberSpecialty(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 p-4 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{barber.name}</p>
                  {barber.specialty && <p className="truncate text-sm text-muted-foreground">{barber.specialty}</p>}
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(barber)} disabled={isLoading}>
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBarber(barber.id)}
                    disabled={isLoading}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {barbers.length === 0 && <p className="text-center text-muted-foreground">Nenhum barbeiro cadastrado.</p>}
          </div>
        </CardContent>
      </Card>

      {/* RELATÓRIO FINANCEIRO */}
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

                {/* ✅ AQUI: valor + agendamentos do dia */}
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
                                  {apt.clients?.phone ? <span className="text-muted-foreground"> • {apt.clients.phone}</span> : null}
                                </div>

                                <div className="mt-1 text-sm text-muted-foreground">
                                  {apt.services?.name ?? "Serviço"} • R$ {Number(apt.service_price_at_booking || 0).toFixed(2)}
                                </div>

                                {apt.notes ? <div className="mt-1 text-xs text-muted-foreground">Obs: {apt.notes}</div> : null}
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
                  <CardDescription>Mostra todos os meses (Jan–Dez) e o total do ano para o barbeiro selecionado</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-4 rounded-xl border bg-muted/10 p-4">
                    <div className="text-sm text-muted-foreground">Total no ano</div>
                    <div className="text-2xl font-semibold">R$ {totalYearRevenue.toFixed(2)}</div>
                  </div>

                  <div className="rounded-xl border bg-muted/10 p-4">
                    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
                      <div
                        className="
                          flex min-w-180 items-end gap-4
                          md:grid md:min-w-0 md:grid-cols-12 md:gap-5
                        "
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
