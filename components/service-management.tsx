"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Clock3, Edit3, Plus, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { money } from "@/lib/barber/time"
import { createClient } from "@/lib/supabase/client"
import type { Service } from "@/lib/types"
import { BarberSheet, FormError, primaryClass } from "./barber/forms"

export function ServiceManagement({
  services: initialServices,
  barbershopId,
  canManageShop,
}: {
  services: Service[]
  barbershopId: string
  canManageShop: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const db = useMemo(() => createClient(), [])
  const [services, setServices] = useState(initialServices)
  const [editor, setEditor] = useState<Service | null>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const owner = canManageShop
  const active = services.filter((service) => service.is_active).length

  useEffect(() => setServices(initialServices), [initialServices])

  function open(service: Service | null) {
    if (!owner || busy) return
    setError("")
    setEditor(service)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!owner || busy) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get("name")).trim()
    const description = String(form.get("description")).trim()
    const price = Number(form.get("price"))
    const duration = Number(form.get("duration"))
    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 999999.99 ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    ) {
      setError("Confira o nome, o preço e a duração em minutos.")
      return
    }
    setError("")
    setBusy(true)
    try {
      const fields = { name, price, duration, description: description || null }
      const query = editor
        ? db
            .from("services")
            .update(fields)
            .eq("id", editor.id)
            .eq("barbershop_id", barbershopId)
        : db
            .from("services")
            .insert({ ...fields, barbershop_id: barbershopId, is_active: true })
      const { data, error } = await query.select("*").maybeSingle()
      if (error || !data) {
        setError("Não foi possível salvar o serviço.")
        return
      }
      setServices((previous) =>
        [...previous.filter((item) => item.id !== data.id), data].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR"),
        ),
      )
      setEditor(undefined)
      toast({ title: "Serviço salvo" })
      router.refresh()
    } catch {
      setError("Não foi possível salvar o serviço. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  async function toggle(service: Service, checked: boolean) {
    if (!owner || busy) return
    setBusy(true)
    try {
      const { data, error } = await db
        .from("services")
        .update({ is_active: checked })
        .eq("id", service.id)
        .eq("barbershop_id", barbershopId)
        .select("id")
        .maybeSingle()
      if (error || !data) throw Error()
      setServices((previous) =>
        previous.map((item) =>
          item.id === service.id ? { ...item, is_active: checked } : item,
        ),
      )
      toast({
        title: checked ? "Serviço ativo na agenda" : "Serviço desativado",
      })
      router.refresh()
    } catch {
      toast({
        title: "Não foi possível alterar a disponibilidade.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-semibold">Catálogo de serviços</h2>
          <p className="mt-1 text-sm text-slate-600">
            {active} {active === 1 ? "serviço ativo" : "serviços ativos"} na
            agenda.
          </p>
        </div>
        {owner ? (
          <Button
            className={primaryClass}
            onClick={() => open(null)}
            disabled={busy}
          >
            <Plus aria-hidden /> Novo serviço
          </Button>
        ) : null}
      </header>
      {services.length ? (
        <ul className="divide-y divide-slate-100">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 sm:grid">
                  <Scissors aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-sm font-semibold">
                    {service.name}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="font-medium tabular-nums text-slate-900">
                      {money(service.price)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" aria-hidden />
                      {service.duration} min
                    </span>
                  </p>
                  {service.description ? (
                    <p className="break-words text-xs text-slate-600">
                      {service.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {owner ? (
                  <>
                    <span
                      className={`text-xs ${service.is_active ? "text-emerald-800" : "text-slate-600"}`}
                    >
                      {service.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      aria-label={`Disponibilidade de ${service.name}`}
                      checked={!!service.is_active}
                      disabled={busy}
                      onCheckedChange={(checked) => toggle(service, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${service.name}`}
                      onClick={() => open(service)}
                      disabled={busy}
                    >
                      <Edit3 aria-hidden />
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-slate-600">
                    {service.is_active ? "Ativo" : "Inativo"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2 px-4 py-10 text-center">
          <Scissors className="mx-auto size-5 text-slate-500" aria-hidden />
          <p className="text-sm font-semibold">Cadastre o primeiro serviço</p>
          <p className="text-sm text-slate-600">
            Informe o preço e quantos minutos o atendimento ocupa na agenda.
          </p>
        </div>
      )}

      {editor !== undefined ? (
        <BarberSheet
          title={editor ? "Editar serviço" : "Novo serviço"}
          description="O preço e a duração valem para as próximas reservas."
          close={() => {
            if (!busy) setEditor(undefined)
          }}
        >
          <form onSubmit={save}>
            <fieldset className="min-w-0 space-y-4" disabled={busy}>
              <div className="space-y-2">
                <Label htmlFor="service-name">Nome do serviço</Label>
                <Input
                  id="service-name"
                  name="name"
                  placeholder="Ex. Corte"
                  defaultValue={editor?.name}
                  maxLength={120}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-price">Preço (R$)</Label>
                  <Input
                    id="service-price"
                    name="price"
                    type="number"
                    min="0"
                    max="999999.99"
                    step="0.01"
                    inputMode="decimal"
                    defaultValue={editor?.price}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-duration">Duração (minutos)</Label>
                  <Input
                    id="service-duration"
                    name="duration"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    defaultValue={editor?.duration ?? 30}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-description">
                  Descrição (opcional)
                </Label>
                <Textarea
                  id="service-description"
                  name="description"
                  rows={3}
                  maxLength={300}
                  defaultValue={editor?.description ?? ""}
                />
              </div>
              <FormError error={error} />
              <Button type="submit" className={primaryClass}>
                {busy ? "Salvando…" : "Salvar serviço"}
              </Button>
            </fieldset>
          </form>
        </BarberSheet>
      ) : null}
    </section>
  )
}
