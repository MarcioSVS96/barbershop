"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import type { BarbershopSettings, Barber } from "@/lib/types"
import { Edit, Plus, Trash2, UserRound, Lock, Upload, ExternalLink, Download, X } from "lucide-react"
import { deleteBarberAndRelated } from "@/app/actions"

type ShopRole = "owner" | "staff"

interface ProfileManagementProps {
  barbershopId: string
  settings: BarbershopSettings | null
  barbers: Barber[]
  barberRolesById?: Record<string, string>
  role?: ShopRole
  myBarberId?: string | null
}

const BUCKET = "barbershop-assets"

function safeExt(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext) return ext
  if (file.type.includes("png")) return "png"
  if (file.type.includes("jpeg")) return "jpg"
  if (file.type.includes("webp")) return "webp"
  return "png"
}

function downloadFile(url: string, filename: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noreferrer"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function withCacheBuster(url: string, v?: number) {
  if (!url) return ""
  if (!v) return url
  const hasQuery = url.includes("?")
  return `${url}${hasQuery ? "&" : "?"}v=${v}`
}

function publicUrlFromPath(supabase: ReturnType<typeof createClient>, path: string) {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function isStoragePath(path: string) {
  return !!path && !path.startsWith("http://") && !path.startsWith("https://")
}

export function ProfileManagement({
  barbershopId,
  settings,
  barbers: initialBarbers,
  barberRolesById = {},
  role = "owner",
  myBarberId = null,
}: ProfileManagementProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const isStaff = role === "staff"
  const canManageShopProfile = !isStaff // ✅ staff não edita perfil da barbearia
  const canManageBarbers = !isStaff // ✅ staff não faz CRUD da equipe

  // =========================
  // PERFIL (settings)
  // =========================
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingHero, setIsUploadingHero] = useState(false)

  const [logoBust, setLogoBust] = useState<number>(0)
  const [heroBust, setHeroBust] = useState<number>(0)

  const [name, setName] = useState(settings?.name || "")
  const [description, setDescription] = useState(settings?.description || "")
  const [logoPath, setLogoPath] = useState(settings?.logo_url || "")
  const [heroPath, setHeroPath] = useState(settings?.hero_background_url || "")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    setName(settings?.name || "")
    setDescription(settings?.description || "")
    setLogoPath(settings?.logo_url || "")
    setHeroPath(settings?.hero_background_url || "")
    setLogoBust(0)
    setHeroBust(0)
  }, [settings?.id, (settings as any)?.updated_at, barbershopId])

  const hasChanges =
    name !== (settings?.name || "") ||
    description !== (settings?.description || "") ||
    logoPath !== (settings?.logo_url || "") ||
    heroPath !== (settings?.hero_background_url || "")

  function storagePath(type: "logo" | "hero", ext: string) {
    const version = Date.now()
    return `shops/${barbershopId}/profile/${type}-${version}.${ext}`
  }

  async function uploadImage(file: File, type: "logo" | "hero") {
    if (!file.type.startsWith("image/")) throw new Error("Envie apenas imagens")
    if (!barbershopId) throw new Error("barbershopId ausente")

    const ext = safeExt(file)
    const path = storagePath(type, ext)

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0",
    })

    if (error) throw error
    return path
  }

  async function removeImage(path: string, type: "logo" | "hero") {
    if (!canManageShopProfile) {
      toast({ title: "Sem permissão", description: "Apenas o dono pode remover imagens.", variant: "destructive" })
      return
    }
    if (!path) return

    try {
      if (isStoragePath(path)) {
        const { error } = await supabase.storage.from(BUCKET).remove([path])
        if (error) throw error
      }

      if (type === "logo") {
        setLogoPath("")
        setLogoBust(Date.now())
      } else {
        setHeroPath("")
        setHeroBust(Date.now())
      }

      toast({ title: "Imagem removida", description: "Clique em salvar para aplicar." })
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao remover imagem.", variant: "destructive" })
    }
  }

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!canManageShopProfile) {
      toast({ title: "Sem permissão", description: "Apenas o dono pode alterar a logo.", variant: "destructive" })
      return
    }

    setIsUploadingLogo(true)
    try {
      const path = await uploadImage(file, "logo")
      setLogoPath(path)
      setLogoBust(Date.now())
      toast({ title: "Logo enviada", description: "Preview atualizado. Clique em salvar para aplicar." })
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao enviar logo.", variant: "destructive" })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  async function handleUploadHero(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!canManageShopProfile) {
      toast({
        title: "Sem permissão",
        description: "Apenas o dono pode alterar o background.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingHero(true)
    try {
      const path = await uploadImage(file, "hero")
      setHeroPath(path)
      setHeroBust(Date.now())
      toast({ title: "Background enviado", description: "Preview atualizado. Clique em salvar para aplicar." })
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao enviar background.", variant: "destructive" })
    } finally {
      setIsUploadingHero(false)
    }
  }

  async function handleSaveProfile() {
    if (!canManageShopProfile) {
      toast({
        title: "Sem permissão",
        description: "Apenas o dono pode salvar alterações do perfil da barbearia.",
        variant: "destructive",
      })
      return
    }

    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Digite o nome da barbearia.", variant: "destructive" })
      return
    }

    setIsSaving(true)

    const targetId = settings?.id ?? barbershopId

    try {
      if (!targetId) throw new Error("ID alvo ausente. settings.id e barbershopId vieram vazios.")

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        logo_url: logoPath || null,
        hero_background_url: heroPath || null,
        updated_at: new Date().toISOString(),
      }

      const upd = await supabase.from("barbershop_settings").update(payload).eq("id", targetId).select("id, updated_at")

      if (upd.error) throw upd.error

      const row = upd.data?.[0]
      if (!row) {
        throw new Error("UPDATE retornou 0 linhas (provável RLS ou SELECT pós-update bloqueado).")
      }

      toast({ title: "Perfil salvo", description: "As configurações foram aplicadas com sucesso." })
      router.refresh()
    } catch (err: any) {
      console.error("[ProfileManagement] handleSaveProfile error:", err)
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const logoPublicUrl = publicUrlFromPath(supabase, logoPath)
  const heroPublicUrl = publicUrlFromPath(supabase, heroPath)
  const logoPreviewSrc = withCacheBuster(logoPublicUrl, logoBust || undefined)
  const heroPreviewSrc = withCacheBuster(heroPublicUrl, heroBust || undefined)

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
      toast({ title: "Sem permissão", description: "Apenas o dono pode adicionar barbeiros.", variant: "destructive" })
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
      toast({ title: "Sem permissão", description: "Você não pode editar esse barbeiro.", variant: "destructive" })
      return
    }
    if (!editingBarber && !canManageBarbers) {
      toast({ title: "Sem permissão", description: "Apenas o dono pode criar barbeiros.", variant: "destructive" })
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

        setBarbers((prev) => prev.map((b) => (b.id === editingBarber.id ? { ...b, ...barberData } : b)))
        toast({ title: "Barbeiro atualizado", description: "As informações foram atualizadas com sucesso." })
      } else {
        const { data, error } = await supabase.from("barbers").insert(barberData).select().single()
        if (error) throw error
        if (!data) throw new Error("Erro ao criar barbeiro")

        setBarbers((prev) => [...prev, data])
        toast({ title: "Barbeiro adicionado", description: "O novo barbeiro foi cadastrado com sucesso." })
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
        description: error?.message || "Não foi possível salvar as informações.",
        variant: "destructive",
      })
    } finally {
      setIsSavingBarber(false)
    }
  }

  const handleDeleteBarber = async (id: string) => {
    if (!canManageBarbers) {
      toast({ title: "Sem permissão", description: "Apenas o dono pode excluir barbeiros.", variant: "destructive" })
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
      toast({ title: "Barbeiro excluído", description: "O barbeiro foi removido com sucesso." })
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting barber:", error)
      const errorMessage = error?.message || error?.details || error?.hint
      toast({
        title: "Erro",
        description: errorMessage || "Não foi possível excluir o barbeiro. Verifique se há agendamentos vinculados.",
        variant: "destructive",
      })
    } finally {
      setIsSavingBarber(false)
    }
  }

  return (
    <div className="space-y-6">
      <Dialog open={!!previewUrl} onOpenChange={(open) => (!open ? setPreviewUrl(null) : null)}>
        <DialogContent showCloseButton={false} className="max-w-4xl border-0 bg-black/70 p-2 shadow-2xl backdrop-blur">
          <DialogHeader className="sr-only">
            <DialogTitle>Pré-visualização da imagem</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 text-white hover:bg-white/10"
              onClick={() => setPreviewUrl(null)}
              aria-label="Fechar imagem"
            >
              <X className="h-5 w-5" />
            </Button>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview da imagem" className="max-h-[80vh] w-full rounded-lg object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      {/* ✅ GERENCIAR BARBEIROS */}
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

              <CardDescription className="flex items-center gap-2">
                {canManageBarbers ? (
                  <>Adicione, edite ou remova profissionais da equipe</>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Equipe bloqueada para staff (você pode editar apenas seu perfil)
                  </>
                )}
              </CardDescription>
            </div>

            <Dialog open={isBarberDialogOpen} onOpenChange={setIsBarberDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddBarberDialog} className="w-full sm:w-auto" disabled={!canManageBarbers}>
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
                    <Label htmlFor="barber_name">Nome</Label>
                    <Input
                      id="barber_name"
                      value={newBarberName}
                      onChange={(e) => setNewBarberName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barber_specialty">Especialidade (opcional)</Label>
                    <Input
                      id="barber_specialty"
                      value={newBarberSpecialty}
                      onChange={(e) => setNewBarberSpecialty(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSavingBarber}>
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
              const barberRole = barberRolesById[barber.id]
              const isOwnerTarget = barberRole === "owner"
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
                        <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                      ) : null}
                    </p>
                    {barber.specialty && <p className="truncate text-sm text-muted-foreground">{barber.specialty}</p>}
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

            {barbers.length === 0 && <p className="text-center text-muted-foreground">Nenhum barbeiro cadastrado.</p>}
          </div>
        </CardContent>
      </Card>

      {/* ✅ PERFIL DA BARBEARIA */}
      <Card className="border-muted/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Perfil da Barbearia
            {!canManageShopProfile ? <Lock className="h-4 w-4 text-muted-foreground" /> : null}
          </CardTitle>

          <CardDescription>
            {canManageShopProfile ? (
              <>
                Você pode enviar as imagens e ver o preview. Elas só são aplicadas quando clicar em{" "}
                <strong>Salvar alterações</strong>.
              </>
            ) : (
              <>Somente o dono pode alterar nome/descrição/logo/background.</>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Barbearia Premium"
              disabled={!canManageShopProfile}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Agende seu horário online"
              rows={3}
              disabled={!canManageShopProfile}
            />
          </div>

          {/* LOGO */}
          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <Label>Logo</Label>
                <p className="text-xs text-muted-foreground">Preview do logo usado no site e no dashboard.</p>
              </div>

              <div className="flex w-full flex-nowrap gap-2 sm:w-auto">
                <Button
                  asChild
                  variant="outline"
                  disabled={isUploadingLogo || !canManageShopProfile}
                  className="w-12 border-primary/30 bg-background/60 shadow-[0_0_0_1px_rgba(99,102,241,0.15)] hover:bg-primary/5"
                >
                  <label className="cursor-pointer" aria-label="Enviar logo" title="Enviar logo">
                    {isUploadingLogo ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span className="sr-only">Enviar logo</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} />
                  </label>
                </Button>

                <Button
                  variant="outline"
                  disabled={!logoPublicUrl}
                  onClick={() => setPreviewUrl(logoPublicUrl)}
                  className="w-12 border-primary/20 bg-background/60 hover:bg-primary/5"
                  aria-label="Abrir logo"
                  title="Abrir logo"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Abrir logo</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={!logoPublicUrl}
                  onClick={() => downloadFile(logoPublicUrl, "logo")}
                  className="w-12 border-primary/20 bg-background/60 hover:bg-primary/5"
                  aria-label="Baixar logo"
                  title="Baixar logo"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Baixar logo</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={!logoPath || !canManageShopProfile}
                  onClick={() => removeImage(logoPath, "logo")}
                  className="w-12 border-destructive/30 bg-background/60 text-destructive hover:bg-destructive/10"
                  aria-label="Remover logo"
                  title="Remover logo"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remover logo</span>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.15)]">
              {logoPublicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreviewSrc} alt="Preview da logo" className="h-24 w-24 rounded-lg border bg-background object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-background text-xs text-muted-foreground">
                  Sem logo
                </div>
              )}
            </div>
          </div>

          {/* BACKGROUND */}
          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <Label>Background do topo (site público)</Label>
                <p className="text-xs text-muted-foreground">Imagem do fundo do topo da página de agendamento.</p>
              </div>

              <div className="flex w-full flex-nowrap gap-2 sm:w-auto">
                <Button
                  asChild
                  variant="outline"
                  disabled={isUploadingHero || !canManageShopProfile}
                  className="w-12 border-primary/30 bg-background/60 shadow-[0_0_0_1px_rgba(99,102,241,0.15)] hover:bg-primary/5"
                >
                  <label className="cursor-pointer" aria-label="Enviar background" title="Enviar background">
                    {isUploadingHero ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span className="sr-only">Enviar background</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadHero} />
                  </label>
                </Button>

                <Button
                  variant="outline"
                  disabled={!heroPublicUrl}
                  onClick={() => setPreviewUrl(heroPublicUrl)}
                  className="w-12 border-primary/20 bg-background/60 hover:bg-primary/5"
                  aria-label="Abrir background"
                  title="Abrir background"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Abrir background</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={!heroPublicUrl}
                  onClick={() => downloadFile(heroPublicUrl, "background")}
                  className="w-12 border-primary/20 bg-background/60 hover:bg-primary/5"
                  aria-label="Baixar background"
                  title="Baixar background"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Baixar background</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={!heroPath || !canManageShopProfile}
                  onClick={() => removeImage(heroPath, "hero")}
                  className="w-12 border-destructive/30 bg-background/60 text-destructive hover:bg-destructive/10"
                  aria-label="Remover background"
                  title="Remover background"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remover background</span>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.15)]">
              {heroPublicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroPreviewSrc} alt="Preview do background" className="h-40 w-full rounded-lg border bg-background object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border bg-background text-sm text-muted-foreground">
                  Sem background
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={!canManageShopProfile || !hasChanges || isSaving}>
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
