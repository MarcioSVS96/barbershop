"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Plus, Edit, Clock, DollarSign, Trash2, Lock } from "lucide-react"
import type { Service } from "@/lib/types"

type UserRole = "owner" | "staff"

interface ServiceManagementProps {
  services: Service[]
  barbershopId: string
  role?: UserRole // ✅ NEW
}

/**
 * ✅ Named export
 * Use: import { ServiceManagement } from "@/components/service-management"
 */
export function ServiceManagement({
  services: initialServices,
  barbershopId,
  role = "owner",
}: ServiceManagementProps) {
  const router = useRouter()
  const { toast } = useToast()

  const supabase = useMemo(() => createClient(), [])
  const [services, setServices] = useState<Service[]>(initialServices)

  const [isLoading, setIsLoading] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const isReadOnly = role === "staff"

  // Form state
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [duration, setDuration] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    setServices(initialServices)
  }, [initialServices])

  const resetForm = () => {
    setName("")
    setPrice("")
    setDuration("")
    setDescription("")
    setEditingService(null)
  }

  const openCreateDialog = () => {
    if (isReadOnly) {
      toast({ title: "Sem permissão", description: "Seu perfil não pode criar serviços.", variant: "destructive" })
      return
    }
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (service: Service) => {
    if (isReadOnly) {
      toast({ title: "Sem permissão", description: "Seu perfil não pode editar serviços.", variant: "destructive" })
      return
    }
    setEditingService(service)
    setName(service.name ?? "")
    setPrice(String(service.price ?? ""))
    setDuration(String(service.duration ?? ""))
    setDescription(service.description ?? "")
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isReadOnly) {
      toast({ title: "Sem permissão", description: "Seu perfil não pode alterar serviços.", variant: "destructive" })
      return
    }

    if (!barbershopId) {
      toast({
        title: "Erro de contexto",
        description: "Barbearia não identificada (barbershopId ausente).",
        variant: "destructive",
      })
      return
    }

    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome do serviço.", variant: "destructive" })
      return
    }

    const parsedPrice = Number.parseFloat(price)
    const parsedDuration = Number.parseInt(duration, 10)

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast({ title: "Preço inválido", description: "Informe um preço válido.", variant: "destructive" })
      return
    }

    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      toast({ title: "Duração inválida", description: "Informe uma duração válida.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const baseData = {
        barbershop_id: barbershopId,
        name: name.trim(),
        price: parsedPrice,
        duration: parsedDuration,
        description: description.trim() || null,
      }

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(baseData)
          .eq("id", editingService.id)
          .eq("barbershop_id", barbershopId)

        if (error) throw error

        setServices((prev) => prev.map((s) => (s.id === editingService.id ? { ...s, ...baseData } : s)))
        toast({ title: "Serviço atualizado", description: "O serviço foi atualizado com sucesso." })
      } else {
        const payload = { ...baseData, is_active: true }
        const { data, error } = await supabase.from("services").insert(payload).select().single()
        if (error) throw error

        setServices((prev) => [...prev, data])
        toast({ title: "Serviço criado", description: "O novo serviço foi criado com sucesso." })
      }

      setIsDialogOpen(false)
      resetForm()
      router.refresh()
    } catch (error: any) {
      console.error("[ServiceManagement] save error:", error)
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível salvar o serviço.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    if (isReadOnly) {
      toast({
        title: "Sem permissão",
        description: "Seu perfil não pode ativar/desativar serviços.",
        variant: "destructive",
      })
      return
    }
    if (!barbershopId) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !currentStatus })
        .eq("id", serviceId)
        .eq("barbershop_id", barbershopId)

      if (error) throw error

      setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, is_active: !currentStatus } : s)))

      toast({
        title: currentStatus ? "Serviço desativado" : "Serviço ativado",
        description: currentStatus
          ? "O serviço não aparecerá mais para novos agendamentos."
          : "O serviço está disponível para agendamentos.",
      })

      router.refresh()
    } catch (error: any) {
      console.error("[ServiceManagement] toggle error:", error)
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível alterar o status do serviço.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteService = async (serviceId: string) => {
    if (isReadOnly) {
      toast({ title: "Sem permissão", description: "Seu perfil não pode excluir serviços.", variant: "destructive" })
      return
    }
    if (!barbershopId) return
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("services").delete().eq("id", serviceId).eq("barbershop_id", barbershopId)
      if (error) throw error

      setServices((prev) => prev.filter((s) => s.id !== serviceId))
      toast({ title: "Serviço excluído", description: "O serviço foi removido com sucesso." })
      router.refresh()
    } catch (error: any) {
      console.error("[ServiceManagement] delete error:", error)
      toast({
        title: "Erro ao excluir",
        description: error?.message || "Não foi possível excluir o serviço. Verifique se há agendamentos vinculados.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Gestão de Serviços
              {isReadOnly ? (
                <Badge variant="secondary" className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Somente leitura
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>Gerencie os serviços oferecidos pela barbearia</CardDescription>
          </div>

          {!isReadOnly ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Serviço
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
                  <DialogDescription>
                    {editingService
                      ? "Atualize as informações do serviço. Agendamentos existentes não serão afetados."
                      : "Crie um novo serviço para oferecer aos clientes."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Serviço</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Corte de Cabelo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="price">Preço (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (minutos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o serviço..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Salvando..." : editingService ? "Atualizar Serviço" : "Criar Serviço"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.id} className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{service.name}</h4>
                  <Badge variant={service.is_active ? "default" : "secondary"}>
                    {service.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>R$ {Number(service.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} min</span>
                  </div>
                </div>
              </div>

              {/* ✅ AÇÕES: owner only */}
              {!isReadOnly ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(service)} disabled={isLoading}>
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => deleteService(service.id)} disabled={isLoading}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>

                  <Switch
                    checked={!!service.is_active}
                    onCheckedChange={() => toggleServiceStatus(service.id, !!service.is_active)}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Switch checked={!!service.is_active} disabled />
                </div>
              )}
            </div>
          ))}

          {services.length === 0 && (
            <div className="flex min-h-50 items-center justify-center">
              <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
