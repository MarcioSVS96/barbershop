"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ShopOption = {
  id: string
  name: string | null
  slug?: string | null
}

type EditProfileDialogProps = {
  userId: string
  currentBarbershopId: string
  email: string
  role: "owner" | "staff"
  shops: ShopOption[]
  onCloseUrl: string
  action: (formData: FormData) => Promise<void>
}

export function EditProfileDialog({
  userId,
  currentBarbershopId,
  email,
  role,
  shops,
  onCloseUrl,
  action,
}: EditProfileDialogProps) {
  const [open, setOpen] = useState(true)
  const router = useRouter()

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      router.replace(onCloseUrl, { scroll: false })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>Atualize email, senha, barbearia e perfil.</DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-3">
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="current_barbershop_id" value={currentBarbershopId} />

          <div className="space-y-1">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" name="email" type="email" defaultValue={email} required className="h-9" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-password">Senha</Label>
            <Input
              id="edit-password"
              name="password"
              type="password"
              placeholder="Deixe em branco para manter"
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-barbershop">Barbearia</Label>
            <select
              id="edit-barbershop"
              name="barbershop_id"
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              required
              defaultValue={currentBarbershopId}
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name || shop.slug || shop.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-role">Perfil</Label>
            <select
              id="edit-role"
              name="role"
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              defaultValue={role}
            >
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
