"use client"

import type React from "react"
import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  today: string
}

export function BarbershopManagement({ barbers: initialBarbers, payments, today }: BarbershopManagementProps) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers)
  const [selectedBarberId, setSelectedBarberId] = useState<string>(initialBarbers.length > 0 ? initialBarbers[0].id : "")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [newBarberName, setNewBarberName] = useState("")
  const [newBarberSpecialty, setNewBarberSpecialty] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const selectedBarber = useMemo(() => barbers.find((b) => b.id === selectedBarberId) || null, [barbers, selectedBarberId])

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

      // UPDATE
      if (editingBarber) {
        const { error } = await supabase.from("barbers").update(barberData).eq("id", editingBarber.id)
        if (error) throw error

        setBarbers((prev) => prev.map((b) => (b.id === editingBarber.id ? { ...b, ...barberData } : b)))

        toast({
          title: "Barbeiro atualizado",
          description: "As informações foram atualizadas com sucesso.",
        })
      }
      // CREATE
      else {
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
  const selectedBarberPayments = payments.filter((p) => p.appointments?.barber_id === selectedBarberId)

  const todayDate = new Date(today)

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

  const selectedDateRevenue = selectedDate
    ? selectedBarberPayments
        .filter((p) => p.appointments?.appointment_date === format(selectedDate, "yyyy-MM-dd"))
        .reduce((acc, curr) => acc + Number(curr.amount), 0)
    : 0

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
                    <CardDescription>Veja o faturamento no dia escolhido</CardDescription>
                  </CardHeader>

                  {/* ✅ centraliza o calendário */}
                  <CardContent className="flex justify-center">
                    <div className="rounded-lg border bg-background p-2">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ptBR} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted/60 shadow-sm">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-base">
                      Faturamento em{" "}
                      {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "-"}
                    </CardTitle>
                    <CardDescription>Somatório de pagamentos na data selecionada</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border bg-muted/10 p-6">
                      <div className="text-sm text-muted-foreground mb-2">Total</div>
                      <div className="text-4xl font-semibold tracking-tight">R$ {selectedDateRevenue.toFixed(2)}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Selecione um barbeiro para ver os dados</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
