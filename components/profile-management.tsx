"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
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
import type { Barber } from "@/lib/types"
import { Edit, Plus, Trash2, UserRound, Lock } from "lucide-react"
import { deleteBarberAndRelated } from "@/app/actions"

export function ProfileManagement({
  barbershopId,
  barbers: initialBarbers,
  role,
  myBarberId,
}: {
  barbershopId: string
  barbers: Barber[]
  role: "owner" | "staff"
  myBarberId: string | null
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const isStaff = role === "staff"
  const canManageBarbers = role === "owner"
  // =========================
  // GERENCIAR BARBEIROS (CRUD)
  // =========================
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [isBarberDialogOpen, setIsBarberDialogOpen] = useState(false)
  const [newBarberName, setNewBarberName] = useState("")
  const [newBarberSpecialty, setNewBarberSpecialty] = useState("")
  const [isSavingBarber, setIsSavingBarber] = useState(false)

  useEffect(() => {
    setBarbers(initialBarbers)
  }, [initialBarbers])

  const canEditThisBarber = (barberId: string) => {
    if (canManageBarbers) return true // owner
    // staff: pode editar apenas o próprio
    return !!myBarberId && barberId === myBarberId
  }

  const openAddBarberDialog = () => {
    if (!canManageBarbers) {
      toast({
        title: "Sem permissão",
        description: "Apenas o dono pode adicionar barbeiros.",
        variant: "destructive",
      })
      return
    }
    setEditingBarber(null)
    setNewBarberName("")
    setNewBarberSpecialty("")
    setIsBarberDialogOpen(true)
  }

  const openEditBarberDialog = (barber: Barber) => {
    if (!canEditThisBarber(barber.id)) {
      toast({
        title: "Sem permissão",
        description: "Você só pode editar seu próprio perfil.",
        variant: "destructive",
      })
      return
    }
    setEditingBarber(barber)
    setNewBarberName(barber.name)
    setNewBarberSpecialty(barber.specialty || "")
    setIsBarberDialogOpen(true)
  }

  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBarberName.trim()) return

    // owner pode criar/editar qualquer; staff só edita o próprio
    if (editingBarber && !canEditThisBarber(editingBarber.id)) {
      toast({
        title: "Sem permissão",
        description: "Você não pode editar esse barbeiro.",
        variant: "destructive",
      })
      return
    }
    if (!editingBarber && !canManageBarbers) {
      toast({
        title: "Sem permissão",
        description: "Apenas o dono pode criar barbeiros.",
        variant: "destructive",
      })
      return
    }

    setIsSavingBarber(true)
    try {
      const barberData = {
        name: newBarberName.trim(),
        specialty: newBarberSpecialty.trim() || null,
        barbershop_id: barbershopId,
      }

      if (editingBarber) {
        const { error } = await supabase
          .from("barbers")
          .update(barberData)
          .eq("id", editingBarber.id)
          .eq("barbershop_id", barbershopId)

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
      } else {
        const { data, error } = await supabase
          .from("barbers")
          .insert(barberData)
          .select()
          .single()
        if (error) throw error
        if (!data) throw new Error("Erro ao criar barbeiro")

        setBarbers((prev) => [...prev, data])
        toast({
          title: "Barbeiro adicionado",
          description: "O novo barbeiro foi cadastrado com sucesso.",
        })
      }

      setNewBarberName("")
      setNewBarberSpecialty("")
      setEditingBarber(null)
      setIsBarberDialogOpen(false)

      router.refresh()
    } catch (error: any) {
      console.error("Error saving barber:", error)
      toast({
        title: "Erro",
        description:
          error?.message || "Não foi possível salvar as informações.",
        variant: "destructive",
      })
    } finally {
      setIsSavingBarber(false)
    }
  }

  const handleDeleteBarber = async (id: string) => {
    if (!canManageBarbers) {
      toast({
        title: "Sem permissão",
        description: "Apenas o dono pode excluir barbeiros.",
        variant: "destructive",
      })
      return
    }

    if (
      !confirm(
        "Tem certeza que deseja excluir este barbeiro? Todos os agendamentos e pagamentos vinculados também serão removidos.",
      )
    )
      return

    setIsSavingBarber(true)
    try {
      const result = await deleteBarberAndRelated(barbershopId, id)
      if (!result.ok) throw new Error(result.error)

      setBarbers((prev) => prev.filter((b) => b.id !== id))
      toast({
        title: "Barbeiro excluído",
        description: "O barbeiro foi removido com sucesso.",
      })
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting barber:", error)
      const errorMessage = error?.message || error?.details || error?.hint
      toast({
        title: "Erro",
        description:
          errorMessage ||
          "Não foi possível excluir o barbeiro. Verifique se há agendamentos vinculados.",
        variant: "destructive",
      })
    } finally {
      setIsSavingBarber(false)
    }
  }

  return (
    <Card className="rounded-2xl border-slate-200 shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/40">
                <UserRound className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg sm:text-xl">
                {isStaff ? "Meu perfil" : "Equipe"}
              </CardTitle>
            </div>

            <CardDescription className="flex items-center gap-2">
              {canManageBarbers ? (
                <>Adicione, edite ou remova profissionais da equipe</>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Atualize seu nome e sua especialidade.
                </>
              )}
            </CardDescription>
          </div>

          <Dialog
            open={isBarberDialogOpen}
            onOpenChange={setIsBarberDialogOpen}
          >
            {canManageBarbers ? (
              <DialogTrigger asChild>
                <Button
                  onClick={openAddBarberDialog}
                  className="w-full sm:w-auto"
                  disabled={!canManageBarbers}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Barbeiro
                </Button>
              </DialogTrigger>
            ) : null}

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
                  <Label htmlFor="barber_name">Nome</Label>
                  <Input
                    id="barber_name"
                    value={newBarberName}
                    onChange={(e) => setNewBarberName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barber_specialty">
                    Especialidade (opcional)
                  </Label>
                  <Input
                    id="barber_specialty"
                    value={newBarberSpecialty}
                    onChange={(e) => setNewBarberSpecialty(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSavingBarber}
                >
                  {isSavingBarber ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {barbers.map((barber) => {
            const canEdit = canEditThisBarber(barber.id)
            const isOwnerTarget = role === "owner" && barber.id === myBarberId
            const canDelete = canManageBarbers && !isOwnerTarget

            return (
              <div
                key={barber.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 p-4 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {barber.name}
                    {isStaff && myBarberId && barber.id === myBarberId ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (você)
                      </span>
                    ) : null}
                  </p>
                  {barber.specialty && (
                    <p className="truncate text-sm text-muted-foreground">
                      {barber.specialty}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditBarberDialog(barber)}
                    disabled={isSavingBarber || !canEdit}
                    title={canEdit ? "Editar" : "Sem permissão"}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBarber(barber.id)}
                    disabled={isSavingBarber || !canDelete}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title={
                      !canManageBarbers
                        ? "Sem permissão"
                        : isOwnerTarget
                          ? "Apenas o admin master pode excluir owner"
                          : "Excluir"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          {barbers.length === 0 && (
            <p className="text-center text-muted-foreground">
              Nenhum barbeiro cadastrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
