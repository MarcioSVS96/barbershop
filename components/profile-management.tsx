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
import { Edit, Plus, Trash2, UserRound } from "lucide-react"

interface ProfileManagementProps {
  settings: BarbershopSettings | null
  barbers: Barber[] // ✅ novo: vem do server (app/barbeiro/page.tsx)
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

export function ProfileManagement({ settings, barbers: initialBarbers }: ProfileManagementProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

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
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || "")
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState(settings?.hero_background_url || "")

  useEffect(() => {
    setName(settings?.name || "")
    setDescription(settings?.description || "")
    setLogoUrl(settings?.logo_url || "")
    setHeroBackgroundUrl(settings?.hero_background_url || "")
    setLogoBust(0)
    setHeroBust(0)
  }, [settings?.id, (settings as any)?.updated_at])

  const hasChanges =
    name !== (settings?.name || "") ||
    description !== (settings?.description || "") ||
    logoUrl !== (settings?.logo_url || "") ||
    heroBackgroundUrl !== (settings?.hero_background_url || "")

  async function uploadImage(file: File, type: "logo" | "hero") {
    if (!file.type.startsWith("image/")) throw new Error("Envie apenas imagens")

    const ext = safeExt(file)
    const path = `profile/${type}.${ext}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    })
    if (error) throw error

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setIsUploadingLogo(true)
    try {
      const url = await uploadImage(file, "logo")
      setLogoUrl(url)
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

    setIsUploadingHero(true)
    try {
      const url = await uploadImage(file, "hero")
      setHeroBackgroundUrl(url)
      setHeroBust(Date.now())
      toast({ title: "Background enviado", description: "Preview atualizado. Clique em salvar para aplicar." })
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao enviar background.", variant: "destructive" })
    } finally {
      setIsUploadingHero(false)
    }
  }

  async function handleSaveProfile() {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Digite o nome da barbearia.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        logo_url: logoUrl || null,
        hero_background_url: heroBackgroundUrl || null,
      }

      if (settings?.id) {
        const { error } = await supabase.from("barbershop_settings").update(payload).eq("id", settings.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("barbershop_settings").insert(payload)
        if (error) throw error
      }

      toast({ title: "Perfil salvo", description: "As configurações foram aplicadas com sucesso." })
      router.refresh()
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const logoPreviewSrc = withCacheBuster(logoUrl, logoBust || undefined)
  const heroPreviewSrc = withCacheBuster(heroBackgroundUrl, heroBust || undefined)

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

  const openAddBarberDialog = () => {
    setEditingBarber(null)
    setNewBarberName("")
    setNewBarberSpecialty("")
    setIsBarberDialogOpen(true)
  }

  const openEditBarberDialog = (barber: Barber) => {
    setEditingBarber(barber)
    setNewBarberName(barber.name)
    setNewBarberSpecialty(barber.specialty || "")
    setIsBarberDialogOpen(true)
  }

  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBarberName.trim()) return

    setIsSavingBarber(true)
    try {
      const barberData = {
        name: newBarberName.trim(),
        specialty: newBarberSpecialty.trim() || null,
      }

      if (editingBarber) {
        const { error } = await supabase.from("barbers").update(barberData).eq("id", editingBarber.id)
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
    if (!confirm("Tem certeza que deseja excluir este barbeiro?")) return

    setIsSavingBarber(true)
    try {
      const { error } = await supabase.from("barbers").delete().eq("id", id)
      if (error) throw error

      setBarbers((prev) => prev.filter((b) => b.id !== id))

      toast({ title: "Barbeiro excluído", description: "O barbeiro foi removido com sucesso." })
      router.refresh()
    } catch (error) {
      console.error("Error deleting barber:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o barbeiro. Verifique se há agendamentos vinculados.",
        variant: "destructive",
      })
    } finally {
      setIsSavingBarber(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ✅ GERENCIAR BARBEIROS (agora na aba Perfil) */}
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

            <Dialog open={isBarberDialogOpen} onOpenChange={setIsBarberDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddBarberDialog} className="w-full sm:w-auto">
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
                  <Button variant="ghost" size="icon" onClick={() => openEditBarberDialog(barber)} disabled={isSavingBarber}>
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBarber(barber.id)}
                    disabled={isSavingBarber}
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

      {/* ✅ PERFIL DA BARBEARIA */}
      <Card className="border-muted/60 shadow-sm">
        <CardHeader>
          <CardTitle>Perfil da Barbearia</CardTitle>
          <CardDescription>
            Você pode enviar as imagens e ver o preview. Elas só são aplicadas quando clicar em{" "}
            <strong>Salvar alterações</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Barbearia Premium" />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Agende seu horário online"
              rows={3}
            />
          </div>

          {/* LOGO */}
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <Label>Logo</Label>
                <p className="text-xs text-muted-foreground">Preview do logo usado no site e no dashboard.</p>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" disabled={isUploadingLogo}>
                  <label className="cursor-pointer">
                    {isUploadingLogo ? "Enviando..." : "Enviar logo"}
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} />
                  </label>
                </Button>

                <Button
                  variant="outline"
                  disabled={!logoUrl}
                  onClick={() => window.open(logoUrl, "_blank", "noopener,noreferrer")}
                >
                  Abrir
                </Button>

                <Button variant="outline" disabled={!logoUrl} onClick={() => downloadFile(logoUrl, "logo")}>
                  Baixar
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreviewSrc}
                  alt="Preview da logo"
                  className="h-24 w-24 rounded-lg border bg-background object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-background text-xs text-muted-foreground">
                  Sem logo
                </div>
              )}
            </div>
          </div>

          {/* BACKGROUND */}
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <Label>Background do topo (site público)</Label>
                <p className="text-xs text-muted-foreground">Imagem do fundo do topo da página de agendamento.</p>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" disabled={isUploadingHero}>
                  <label className="cursor-pointer">
                    {isUploadingHero ? "Enviando..." : "Enviar background"}
                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadHero} />
                  </label>
                </Button>

                <Button
                  variant="outline"
                  disabled={!heroBackgroundUrl}
                  onClick={() => window.open(heroBackgroundUrl, "_blank", "noopener,noreferrer")}
                >
                  Abrir
                </Button>

                <Button
                  variant="outline"
                  disabled={!heroBackgroundUrl}
                  onClick={() => downloadFile(heroBackgroundUrl, "background")}
                >
                  Baixar
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4">
              {heroBackgroundUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroPreviewSrc}
                  alt="Preview do background"
                  className="h-40 w-full rounded-lg border bg-background object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border bg-background text-sm text-muted-foreground">
                  Sem background
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={!hasChanges || isSaving}>
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
