"use client"

import { startTransition, useActionState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type ActionState = { error: string } | null

export function AdminSheet({
  title,
  description,
  closeUrl,
  step,
  children,
}: {
  title: string
  description: string
  closeUrl: string
  step?: 1 | 2
  children: ReactNode
}) {
  const router = useRouter()
  return (
    <Sheet
      open
      onOpenChange={(open) =>
        !open && router.replace(closeUrl, { scroll: false })
      }
    >
      <SheetContent className="w-full max-w-none gap-0 overflow-y-auto bg-white sm:max-w-lg">
        <SheetHeader className="gap-2 border-b border-slate-200 px-6 py-6 pr-12 sm:px-8 sm:pr-12">
          {step ? (
            <ol
              className="mb-2 flex items-center gap-2 text-xs font-medium"
              aria-label="Etapas do cadastro"
            >
              <li
                aria-current={step === 1 ? "step" : undefined}
                className="rounded-md bg-slate-100 px-2 py-1.5 text-slate-700"
              >
                1. Barbearia
              </li>
              <li
                aria-current={step === 2 ? "step" : undefined}
                className={
                  step === 2
                    ? "rounded-md bg-slate-900 px-2 py-1.5 text-white"
                    : "px-2 text-slate-500"
                }
              >
                2. Acesso
              </li>
            </ol>
          ) : null}
          <SheetTitle className="text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </SheetTitle>
          <SheetDescription className="leading-relaxed text-slate-600">
            {description}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-7 px-6 py-6 sm:px-8">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export function AdminForm({
  action,
  children,
  submit,
  cancelUrl,
  cancelLabel = "Cancelar",
  variant = "default",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children: ReactNode
  submit: string
  cancelUrl?: string
  cancelLabel?: string
  variant?: "default" | "outline" | "destructive"
}) {
  const [state, dispatch, pending] = useActionState(action, null)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        startTransition(() => dispatch(data))
      }}
      className="space-y-4"
    >
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {children}
        {state?.error ? (
          <p
            role="alert"
            className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            variant={variant}
            className={
              variant === "default"
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : undefined
            }
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? "Aguarde…" : submit}
          </Button>
          {cancelUrl && !pending ? (
            <Button asChild variant="ghost">
              <Link href={cancelUrl} scroll={false}>
                {cancelLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  )
}
