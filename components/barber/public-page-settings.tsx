"use client"

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  ImagePlus,
  Scissors,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { normalizePhone } from "@/lib/barber/time"
import { createClient } from "@/lib/supabase/client"
import type { BarbershopSettings } from "@/lib/types"
import { FormError, primaryClass } from "./forms"

const bucket = "barbershop-assets"
const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}
type ImageChoice = { path: string | null; file?: File }

function useLocalImage(file?: File) {
  const [url, setUrl] = useState("")
  useEffect(() => {
    if (!file) {
      setUrl("")
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return file ? url : ""
}

function ImageField({
  label,
  hint,
  src,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  src: string
  disabled: boolean
  onChange: (file: File | null) => void
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-3">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">
        {src ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5" aria-hidden />
        )}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-slate-600">{hint}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-800 underline-offset-4 hover:underline focus-within:rounded-sm focus-within:outline-2 focus-within:outline-offset-2">
            <span>{src ? "Trocar imagem" : "Escolher imagem"}</span>
            <input
              id={id}
              type="file"
              className="sr-only"
              aria-label={`Escolher ${label.toLowerCase()}`}
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (file) onChange(file)
              }}
            />
          </label>
          {src ? (
            <>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-600 underline-offset-4 hover:underline"
              >
                Ver imagem
              </a>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={disabled}
                className="h-auto p-0 text-xs text-slate-600 underline-offset-4 hover:bg-transparent hover:underline"
                onClick={() => onChange(null)}
                aria-label={`Remover ${label.toLowerCase()} da página`}
              >
                Remover
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function PublicPageSettings({
  shop,
}: {
  shop: BarbershopSettings & { slug: string }
}) {
  const router = useRouter()
  const db = useMemo(() => createClient(), [])
  const uploaded = useRef(new WeakMap<File, string>())
  const [saved, setSaved] = useState(shop)
  const [name, setName] = useState(shop.name)
  const [description, setDescription] = useState(shop.description || "")
  const [phone, setPhone] = useState(shop.whatsapp_phone || "")
  const [logo, setLogo] = useState<ImageChoice>({ path: shop.logo_url })
  const [cover, setCover] = useState<ImageChoice>({
    path: shop.hero_background_url,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const localLogo = useLocalImage(logo.file)
  const localCover = useLocalImage(cover.file)
  const publicUrl = (path: string | null) =>
    !path
      ? ""
      : /^https?:\/\//.test(path)
        ? path
        : db.storage.from(bucket).getPublicUrl(path).data.publicUrl
  const logoSrc = localLogo || publicUrl(logo.path)
  const coverSrc = localCover || publicUrl(cover.path)
  const dirty =
    name !== saved.name ||
    description !== (saved.description || "") ||
    phone !== (saved.whatsapp_phone || "") ||
    !!logo.file ||
    !!cover.file ||
    logo.path !== saved.logo_url ||
    cover.path !== saved.hero_background_url
  const pageUrl = `/${encodeURIComponent(shop.slug)}`

  function chooseImage(
    file: File | null,
    setChoice: (choice: ImageChoice) => void,
  ) {
    setMessage("")
    setError("")
    if (file && (!types[file.type] || file.size > 5 * 1024 * 1024)) {
      setError("Escolha uma imagem JPG, PNG ou WebP de até 5 MB.")
      return
    }
    setChoice({ path: null, file: file || undefined })
  }

  function restoreDraft() {
    setName(saved.name)
    setDescription(saved.description || "")
    setPhone(saved.whatsapp_phone || "")
    setLogo({ path: saved.logo_url })
    setCover({ path: saved.hero_background_url })
    setError("")
    setMessage("")
  }

  async function upload(choice: ImageChoice, kind: "logo" | "hero") {
    if (!choice.file) return choice.path
    const existing = uploaded.current.get(choice.file)
    if (existing) return existing
    const path = `shops/${shop.id}/profile/${kind}-${crypto.randomUUID()}.${types[choice.file.type]}`
    const { error } = await db.storage
      .from(bucket)
      .upload(path, choice.file, { contentType: choice.file.type })
    if (error) throw Error("Não foi possível enviar a imagem. Tente novamente.")
    uploaded.current.set(choice.file, path)
    return path
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !dirty) return
    setError("")
    setMessage("")
    const normalized = normalizePhone(phone)
    if (
      !name.trim() ||
      (phone.trim() && !/^[1-9]{2}\d{8,9}$/.test(normalized))
    ) {
      setError("Informe o nome da barbearia e confira o WhatsApp com DDD.")
      return
    }
    setBusy(true)
    try {
      const [logoUrl, coverUrl] = await Promise.all([
        upload(logo, "logo"),
        upload(cover, "hero"),
      ])
      const { data, error } = await db
        .from("barbershop_settings")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          whatsapp_phone: normalized || null,
          logo_url: logoUrl,
          hero_background_url: coverUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shop.id)
        .eq("updated_at", saved.updated_at)
        .select(
          "name, description, whatsapp_phone, logo_url, hero_background_url, updated_at",
        )
        .maybeSingle()
      if (error) {
        setError(
          "Não foi possível publicar. Confira sua conexão e tente novamente.",
        )
        return
      }
      if (!data) {
        setError(
          "A página foi alterada em outra sessão. Revise a versão publicada antes de salvar novamente.",
        )
        return
      }
      setSaved({ ...saved, ...data })
      setName(data.name)
      setDescription(data.description || "")
      setPhone(data.whatsapp_phone || "")
      setLogo({ path: data.logo_url })
      setCover({ path: data.hero_background_url })
      setMessage("Alterações publicadas.")
      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar a página.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function copyPage() {
    try {
      await navigator.clipboard.writeText(
        new URL(pageUrl, location.origin).href,
      )
      setMessage("Link da agenda copiado.")
    } catch {
      setError("Abra a página para copiar o endereço do navegador.")
    }
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="font-semibold">Página de agendamento</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ajuste o que o cliente vê ao abrir seu link.
          </p>
        </header>
        <form onSubmit={publish}>
          <fieldset className="min-w-0 space-y-5 p-4 sm:p-5" disabled={busy}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="booking-page-name">Nome da barbearia</Label>
                <Input
                  id="booking-page-name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-page-phone">WhatsApp</Label>
                <Input
                  id="booking-page-phone"
                  type="tel"
                  maxLength={25}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(81) 98765-4321"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-page-description">Descrição</Label>
              <Textarea
                id="booking-page-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Uma breve apresentação da barbearia."
              />
            </div>
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div>
                <h3 className="text-sm font-semibold">Identidade da página</h3>
                <p className="mt-1 text-xs text-slate-600">
                  JPG, PNG ou WebP de até 5 MB.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <ImageField
                  label="Logo"
                  hint="Prefira uma imagem quadrada."
                  src={logoSrc}
                  disabled={busy}
                  onChange={(file) => chooseImage(file, setLogo)}
                />
                <ImageField
                  label="Capa"
                  hint="Prefira uma foto horizontal."
                  src={coverSrc}
                  disabled={busy}
                  onChange={(file) => chooseImage(file, setCover)}
                />
              </div>
            </div>
            <FormError error={error} />
            {message ? (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-emerald-800"
              >
                <CheckCircle2 aria-hidden className="size-4" />
                {message}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-600">
                {dirty ? "Alterações em rascunho" : "Página sincronizada"}
              </p>
              <div className="flex flex-wrap gap-2">
                {dirty ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={restoreDraft}
                  >
                    Descartar
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className={primaryClass}
                  disabled={!dirty}
                >
                  {busy ? "Publicando…" : "Publicar alterações"}
                </Button>
              </div>
            </div>
          </fieldset>
        </form>
      </section>

      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone aria-hidden className="size-4" /> Prévia no celular
          </h2>
          {dirty ? (
            <span className="text-xs text-amber-800">Rascunho</span>
          ) : null}
        </div>
        <div className="mx-auto max-w-[16rem] overflow-hidden rounded-2xl border-[5px] border-[#16243b] bg-[#f6f4f0] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#e7e3db] bg-[#fcfbf8] px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#172134] text-[#f4d3b4]">
              {logoSrc ? (
                <img src={logoSrc} alt="" className="size-full object-cover" />
              ) : (
                <Scissors className="size-4" aria-hidden />
              )}
            </span>
            <p className="min-w-0 break-words text-xs font-semibold">
              {name.trim() || "Barbearia"}
            </p>
          </div>
          <div className="space-y-2 p-2">
            <div className="relative isolate space-y-1 overflow-hidden rounded-lg bg-[#172134] bg-[radial-gradient(ellipse_at_top_right,#3c4e68,transparent_70%)] p-3 text-white">
              {coverSrc ? (
                <>
                  <img src={coverSrc} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-tr from-[#121b2c] via-[#121b2c]/90 to-[#121b2c]/35" />
                </>
              ) : null}
              <p className="text-[9px] font-semibold tracking-wider text-[#f4d3b4] uppercase">Sua reserva online</p>
              <p className="text-base font-semibold tracking-tight">Agende seu horário</p>
              <p className="break-words text-[10px] leading-relaxed text-slate-200">
                {description.trim() || "Escolha o serviço e reserve o melhor horário para você."}
              </p>
            </div>
            <div className="space-y-1.5 rounded-lg border border-[#e7e3db] bg-white p-2 text-[10px] text-slate-600">
              <p className="font-semibold text-slate-900">Faça sua reserva</p>
              <span className="block rounded border border-slate-200 px-2 py-1.5">Escolha o serviço</span>
              <span className="block rounded border border-slate-200 px-2 py-1.5">Escolha o horário</span>
              <span className="block rounded bg-[#172134] px-2 py-1.5 text-center font-medium text-white">
                Confirmar agendamento
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={pageUrl} target="_blank" rel="noopener noreferrer">
              Abrir página <ArrowUpRight aria-hidden />
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={copyPage}>
            <Copy aria-hidden /> Copiar link
          </Button>
        </div>
      </aside>
    </div>
  )
}
