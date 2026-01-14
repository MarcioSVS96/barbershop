"use client"

import type React from "react"
import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

import {
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar as CalendarIcon,
  Edit,
} from "lucide-react"

import { isSameWeek, isSameMonth, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"

import type { Barber } from "@/lib/types"

interface BarbershopManagementProps {
  barbers: Barber[]
  payments: any[]
  today: string
}

export function BarbershopManagement({
  barbers: initialBarbers,
  payments,
  today,
}: BarbershopManagementProps) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers)
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    initialBarbers.length > 0 ? initialBarbers[0].id : "",
  )
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [newBarberName, setNewBarberName] = useState("")
  const [newBarberSpecialty, setNewBarberSpecialty] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

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
        const { error } = await supabase
          .from("barbers")
          .update(barberData)
          .eq("id", editingBarber.id)

        if (error) throw error

        setBarbers((prev) =>
          prev.map((b) =>
            b.id === editingBarber.id ? { ...b, ...barberData } : b,
          ),
        )

        toast({
          title: "Barbeiro atualizado",
          description: "As informações foram atualizadas com sucesso.",
        })
      }
      // CREATE
      else {
        const { data, error } = await supabase
          .from("barbers")
          .insert(barberData)
          .select()
          .single()

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
        description:
          error.message || "Não foi possível salvar as informações.",
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
        description:
          "Não foi possível excluir o barbeiro. Verifique se há agendamentos vinculados.",
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
  const selectedBarberPayments = payments.filter(
    (p) => p.appointments?.barber_id === selectedBarberId,
  )

  const todayDate = new Date(today)

  const stats = {
    today: selectedBarberPayments
      .filter((p) => p.appointments?.appointment_date === today)
      .reduce((acc, curr) => acc + Number(curr.amount), 0),

    week: selectedBarberPayments
      .filter(
        (p) =>
          p.appointments?.appointment_date &&
          isSameWeek(
            new Date(p.appointments.appointment_date),
            todayDate,
          ),
      )
      .reduce((acc, curr) => acc + Number(curr.amount), 0),

    month: selectedBarberPayments
      .filter(
        (p) =>
          p.appointments?.appointment_date &&
          isSameMonth(
            new Date(p.appointments.appointment_date),
            todayDate,
          ),
      )
      .reduce((acc, curr) => acc + Number(curr.amount), 0),
  }

  const selectedDateRevenue = selectedDate
    ? selectedBarberPayments
        .filter(
          (p) =>
            p.appointments?.appointment_date ===
            format(selectedDate, "yyyy-MM-dd"),
        )
        .reduce((acc, curr) => acc + Number(curr.amount), 0)
    : 0

  // =========================
  // RENDER
  // =========================
  return (
    <div className="space-y-6">
      {/* GERENCIAR BARBEIROS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Barbeiros</CardTitle>
              <CardDescription>
                Adicione ou remova profissionais da equipe
              </CardDescription>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Barbeiro
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBarber ? "Editar Barbeiro" : "Novo Barbeiro"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBarber
                      ? "Edite as informações do profissional."
                      : "Cadastre um novo profissional."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSaveBarber} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newBarberName}
                      onChange={(e) => setNewBarberName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">
                      Especialidade (opcional)
                    </Label>
                    <Input
                      id="specialty"
                      value={newBarberSpecialty}
                      onChange={(e) =>
                        setNewBarberSpecialty(e.target.value)
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{barber.name}</p>
                  {barber.specialty && (
                    <p className="text-sm text-muted-foreground">
                      {barber.specialty}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(barber)}
                    disabled={isLoading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBarber(barber.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            {barbers.length === 0 && (
              <p className="text-center text-muted-foreground">
                Nenhum barbeiro cadastrado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RELATÓRIO FINANCEIRO */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Relatório Financeiro por Barbeiro</CardTitle>
              <CardDescription>
                Visualize o desempenho individual
              </CardDescription>
            </div>

            <div className="w-full sm:w-50">
              <Select
                value={selectedBarberId}
                onValueChange={setSelectedBarberId}
              >
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
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">Hoje</CardTitle>
                    <DollarSign className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {stats.today.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">Esta Semana</CardTitle>
                    <CalendarIcon className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {stats.week.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">Este Mês</CardTitle>
                    <TrendingUp className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {stats.month.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>
                      Faturamento em{" "}
                      {selectedDate
                        ? format(selectedDate, "dd 'de' MMMM", {
                            locale: ptBR,
                          })
                        : "-"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">
                      R$ {selectedDateRevenue.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Selecione um barbeiro para ver os dados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
