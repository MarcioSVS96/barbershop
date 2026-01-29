"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type DeleteProfileDialogProps = {
  userId: string
  barbershopId: string
  onCloseUrl: string
  action: (formData: FormData) => Promise<void>
}

export function DeleteProfileDialog({ userId, barbershopId, onCloseUrl, action }: DeleteProfileDialogProps) {
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
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            Isso vai remover o vínculo com a barbearia e deletar o usuário do Auth. Ele não conseguirá mais logar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <form action={action} className="inline-flex">
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="barbershop_id" value={barbershopId} />
            <Button type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar exclusão
            </Button>
          </form>

          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
