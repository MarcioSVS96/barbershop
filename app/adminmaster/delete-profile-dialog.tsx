"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { DeleteAccountState } from "@/lib/admin/accounts"

type DeleteProfileDialogProps = {
  userId: string
  email: string
  barbershopId: string | null
  scope: "linked" | "unlinked"
  onCloseUrl: string
  action: (
    state: DeleteAccountState,
    formData: FormData,
  ) => Promise<DeleteAccountState>
}

export function DeleteProfileDialog({
  userId,
  email,
  barbershopId,
  scope,
  onCloseUrl,
  action,
}: DeleteProfileDialogProps) {
  const [open, setOpen] = useState(true)
  const [state, formAction, pending] = useActionState(action, null)
  const router = useRouter()
  const handleOpenChange = (nextOpen: boolean) => {
    if (pending) return
    setOpen(nextOpen)
    if (!nextOpen) router.replace(onCloseUrl, { scroll: false })
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir conta de acesso?</DialogTitle>
          <DialogDescription>
            A conta <strong>{email}</strong> será excluída permanentemente do
            Supabase Auth e perderá seus vínculos de acesso. Os registros de
            atendimentos e pagamentos da barbearia serão preservados.
          </DialogDescription>
        </DialogHeader>
        {state?.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}
        <form action={formAction} className="flex flex-wrap justify-end gap-2">
          <input type="hidden" name="user_id" value={userId} />
          <input
            type="hidden"
            name="barbershop_id"
            value={barbershopId || ""}
          />
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="confirmed" value="1" />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Excluindo…" : "Confirmar exclusão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
