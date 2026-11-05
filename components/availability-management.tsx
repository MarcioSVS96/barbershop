"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Clock3, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export type BreakItem = { start: string; end: string }

export interface Availability {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  breaks?: BreakItem[]
}

const days = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
]

export function AvailabilityManagement({
  availability,
  barbershopId,
  role = "owner",
}: {
  availability: Availability[]
  barbershopId: string
  role?: "owner" | "staff"
}) {
  const router = useRouter()
  const { toast } = useToast()
  const db = useMemo(() => createClient(), [])
  const editable = role === "owner"
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [items, setItems] = useState<Availability[]>(() =>
    [1, 2, 3, 4, 5, 6, 0].map((day) => {
      const saved = availability.find((value) => value.day_of_week === day)
      return {
        day_of_week: day,
        start_time: saved?.start_time?.slice(0, 5) || "09:00",
        end_time: saved?.end_time?.slice(0, 5) || "19:00",
        is_active: saved?.is_active ?? false,
        breaks: Array.isArray(saved?.breaks)
          ? saved.breaks
              .filter(
                (b) =>
                  typeof b?.start === "string" && typeof b?.end === "string",
              )
              .map((b) => ({
                start: b.start.slice(0, 5),
                end: b.end.slice(0, 5),
              }))
          : [],
      }
    }),
  )

  const [savedSchedule, setSavedSchedule] = useState(() =>
    JSON.stringify(items),
  )
  const dirty = JSON.stringify(items) !== savedSchedule

  function update(day: number, change: Partial<Availability>) {
    setItems((previous) =>
      previous.map((item) =>
        item.day_of_week === day ? { ...item, ...change } : item,
      ),
    )
    setError("")
  }

  async function save() {
    if (!editable || busy || !dirty) return
    for (const item of items) {
      if (!item.is_active) continue
      const label = days[item.day_of_week]
      if (
        !item.start_time ||
        !item.end_time ||
        item.end_time <= item.start_time
      ) {
        setExpandedDay(item.day_of_week)
        setError(
          `${label}. O horário de fechamento deve ser posterior à abertura.`,
        )
        return
      }
      const pauses = [...(item.breaks || [])].sort((a, b) =>
        a.start.localeCompare(b.start),
      )
      const invalid = pauses.some(
        (b, i) =>
          !b.start ||
          !b.end ||
          b.start < item.start_time ||
          b.end > item.end_time ||
          b.start >= b.end ||
          (i > 0 && pauses[i - 1].end > b.start),
      )
      if (invalid) {
        setExpandedDay(item.day_of_week)
        setError(
          `${label}. As pausas precisam ficar dentro do expediente e não podem se sobrepor.`,
        )
        return
      }
    }
    setError("")
    setBusy(true)
    try {
      const { error } = await db.from("availability").upsert(
        items.map((item) => ({
          barbershop_id: barbershopId,
          ...item,
          start_time: item.start_time || "09:00",
          end_time: item.end_time || "19:00",
        })),
        { onConflict: "barbershop_id,day_of_week" },
      )
      if (error) {
        setError("Não foi possível salvar a escala. Tente novamente.")
        return
      }
      setSavedSchedule(JSON.stringify(items))
      toast({ title: "Horários atualizados" })
      router.refresh()
    } catch {
      setError("Não foi possível salvar a escala. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock3 aria-hidden className="size-4" /> Horários da semana
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {items.filter((item) => item.is_active).length} de 7 dias ativos ·
            Horário de Recife
          </p>
        </div>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            {dirty ? (
              <span className="text-xs text-amber-800">
                Alterações pendentes
              </span>
            ) : null}
            <Button
              type="button"
              onClick={save}
              disabled={busy || !dirty}
              className="bg-[#16243b] text-white hover:bg-[#253753]"
            >
              <Save aria-hidden /> {busy ? "Salvando…" : "Salvar horários"}
            </Button>
          </div>
        ) : null}
      </header>
      {error ? (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const day = item.day_of_week
          const pauses = item.breaks || []
          const expanded = item.is_active && expandedDay === day
          return (
            <div key={day} className="space-y-3 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`day-${day}`}
                    checked={item.is_active}
                    disabled={!editable || busy}
                    onCheckedChange={(is_active) => {
                      update(day, { is_active })
                      if (is_active) setExpandedDay(day)
                      else if (expandedDay === day) setExpandedDay(null)
                    }}
                  />
                  <div>
                    <Label htmlFor={`day-${day}`} className="font-semibold">
                      {days[day]}
                    </Label>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.is_active
                        ? `${item.start_time}–${item.end_time} · ${pauses.length === 1 ? "1 pausa" : `${pauses.length} pausas`}`
                        : "Fechado"}
                    </p>
                  </div>
                </div>
                {item.is_active ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-expanded={expanded}
                    aria-controls={`schedule-${day}`}
                    onClick={() => setExpandedDay(expanded ? null : day)}
                  >
                    {expanded
                      ? "Recolher"
                      : editable
                        ? "Editar horários"
                        : "Ver horários"}
                    <ChevronDown
                      aria-hidden
                      className={expanded ? "rotate-180" : undefined}
                    />
                  </Button>
                ) : null}
              </div>
              {expanded ? (
                <div
                  id={`schedule-${day}`}
                  className="space-y-3 rounded-lg bg-slate-50 p-3"
                >
                  <div className="grid w-full max-w-64 grid-cols-2 gap-2">
                    <Input
                      type="time"
                      aria-label={`Abertura de ${days[day]}`}
                      value={item.start_time}
                      disabled={!editable || busy}
                      onChange={(event) =>
                        update(day, { start_time: event.target.value })
                      }
                    />
                    <Input
                      type="time"
                      aria-label={`Fechamento de ${days[day]}`}
                      value={item.end_time}
                      disabled={!editable || busy}
                      onChange={(event) =>
                        update(day, { end_time: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-700">
                      {pauses.length ? "Pausas" : "Sem pausas"}
                    </p>
                    {editable ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            update(day, {
                              breaks: [
                                ...pauses,
                                { start: "12:00", end: "13:00" },
                              ],
                            })
                          }
                        >
                          <Plus aria-hidden /> Adicionar pausa
                        </Button>
                        <select
                          aria-label={`Copiar horários de ${days[day]}`}
                          value=""
                          disabled={busy}
                          className="h-8 max-w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                          onChange={(event) => {
                            if (event.target.value === "") return
                            update(Number(event.target.value), {
                              is_active: true,
                              start_time: item.start_time,
                              end_time: item.end_time,
                              breaks: pauses.map((b) => ({ ...b })),
                            })
                            setExpandedDay(Number(event.target.value))
                          }}
                        >
                          <option value="" disabled>
                            Copiar para…
                          </option>
                          {items
                            .filter((target) => target.day_of_week !== day)
                            .map((target) => (
                              <option
                                key={target.day_of_week}
                                value={target.day_of_week}
                              >
                                {days[target.day_of_week]}
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                  {pauses.map((pause, index) => (
                    <div
                      key={index}
                      className="grid max-w-80 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <Input
                        type="time"
                        aria-label={`Início da pausa ${index + 1} de ${days[day]}`}
                        value={pause.start}
                        disabled={!editable || busy}
                        onChange={(event) =>
                          update(day, {
                            breaks: pauses.map((b, i) =>
                              i === index
                                ? { ...b, start: event.target.value }
                                : b,
                            ),
                          })
                        }
                      />
                      <Input
                        type="time"
                        aria-label={`Fim da pausa ${index + 1} de ${days[day]}`}
                        value={pause.end}
                        disabled={!editable || busy}
                        onChange={(event) =>
                          update(day, {
                            breaks: pauses.map((b, i) =>
                              i === index
                                ? { ...b, end: event.target.value }
                                : b,
                            ),
                          })
                        }
                      />
                      {editable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remover pausa"
                          disabled={busy}
                          onClick={() =>
                            update(day, {
                              breaks: pauses.filter((_, i) => i !== index),
                            })
                          }
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
