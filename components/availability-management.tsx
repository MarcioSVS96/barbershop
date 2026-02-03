"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Clock, Save, Plus, Trash2, CalendarDays, Lock } from "lucide-react"

export type BreakItem = { start: string; end: string }

export interface Availability {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  breaks?: BreakItem[]
}

type UserRole = "owner" | "staff"

const DAYS = [
  { id: 0, label: "Domingo" },
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
]

interface AvailabilityManagementProps {
  availability: Availability[]
  barbershopId: string
  role?: UserRole // ✅ NEW
}

export function AvailabilityManagement({
  availability: initialAvailability,
  barbershopId,
  role = "owner",
}: AvailabilityManagementProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [isLoading, setIsLoading] = useState(false)
  const isReadOnly = role === "staff"

  const [items, setItems] = useState(() => {
    const initialMap = new Map(initialAvailability.map((item) => [item.day_of_week, item]))

    return DAYS.map((day) => {
      const row = initialMap.get(day.id)
      const breaksArr = Array.isArray((row as any)?.breaks) ? ((row as any).breaks as any[]) : []

      return {
        id: row?.id,
        day_of_week: day.id,
        label: day.label,
        start_time: String(row?.start_time ?? "09:00").slice(0, 5),
        end_time: String(row?.end_time ?? "19:00").slice(0, 5),
        is_active: row?.is_active ?? day.id !== 0,
        breaks: breaksArr as BreakItem[],
      }
    })
  })

  const activeDaysCount = useMemo(() => items.filter((i) => i.is_active).length, [items])

  const handleUpdate = (dayId: number, field: string, value: any) => {
    if (isReadOnly) return
    setItems((prev) => prev.map((item) => (item.day_of_week === dayId ? { ...item, [field]: value } : item)))
  }

  const addBreak = (dayId: number) => {
    if (isReadOnly) return
    setItems((prev) =>
      prev.map((item) =>
        item.day_of_week === dayId
          ? { ...item, breaks: [...(item.breaks || []), { start: "12:00", end: "13:00" }] }
          : item,
      ),
    )
  }

  const removeBreak = (dayId: number, index: number) => {
    if (isReadOnly) return
    setItems((prev) =>
      prev.map((item) =>
        item.day_of_week === dayId ? { ...item, breaks: item.breaks?.filter((_, i) => i !== index) } : item,
      ),
    )
  }

  const updateBreak = (dayId: number, index: number, field: "start" | "end", value: string) => {
    if (isReadOnly) return
    setItems((prev) =>
      prev.map((item) =>
        item.day_of_week === dayId
          ? {
              ...item,
              breaks: item.breaks?.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
            }
          : item,
      ),
    )
  }

  const handleSave = async () => {
    if (isReadOnly) {
      toast({
        title: "Sem permissão",
        description: "Seu perfil não pode alterar o horário de funcionamento.",
        variant: "destructive",
      })
      return
    }

    if (!barbershopId) {
      toast({
        title: "Erro de contexto",
        description: "Barbearia não identificada (barbershopId ausente).",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const updates = items.map(({ day_of_week, start_time, end_time, is_active, breaks }) => ({
        barbershop_id: barbershopId,
        day_of_week,
        start_time,
        end_time,
        is_active,
        breaks: Array.isArray(breaks) ? breaks : [],
      }))

      const { error } = await supabase.from("availability").upsert(updates, { onConflict: "barbershop_id,day_of_week" })
      if (error) throw error

      toast({ title: "Horários atualizados", description: "A disponibilidade foi salva com sucesso." })
      router.refresh()
    } catch (error: any) {
      console.error("[AvailabilityManagement] save error:", error)
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Não foi possível atualizar os horários.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-muted/60 shadow-sm overflow-hidden">
      <CardHeader className="space-y-4 bg-gradient-to-b from-muted/10 to-transparent">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card shadow-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                Horários de Atendimento
                {isReadOnly ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Somente leitura
                  </span>
                ) : null}
              </CardTitle>
            </div>
            <CardDescription>Configure os dias e horários disponíveis para agendamento</CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border bg-card/70 px-3 py-2 text-sm shadow-sm">
              <span className="text-muted-foreground">Dias ativos</span>
              <span className="font-medium">{activeDaysCount}/7</span>
            </div>

            {!isReadOnly ? (
              <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="sm:hidden flex items-center justify-between rounded-full border bg-card/70 px-3 py-2 text-xs shadow-sm">
          <span className="text-muted-foreground">Dias ativos</span>
          <span className="font-medium">{activeDaysCount}/7</span>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.day_of_week}
              className={[
                "group rounded-2xl border p-4 shadow-sm transition-all",
                item.is_active
                  ? "bg-gradient-to-br from-card to-muted/20 hover:shadow-md"
                  : "bg-muted/10 opacity-80 hover:opacity-100",
              ].join(" ")}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3 sm:justify-start">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) => handleUpdate(item.day_of_week, "is_active", checked)}
                      disabled={isReadOnly}
                    />
                    <div className="leading-tight">
                      <Label className={item.is_active ? "font-semibold" : "text-muted-foreground"}>{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.is_active ? "Aberto para agendamentos" : "Fechado"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Atendimento</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={item.start_time}
                      onChange={(e) => handleUpdate(item.day_of_week, "start_time", e.target.value)}
                      disabled={!item.is_active || isReadOnly}
                      className="h-9 w-27.5 bg-background/80"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={item.end_time}
                      onChange={(e) => handleUpdate(item.day_of_week, "end_time", e.target.value)}
                      disabled={!item.is_active || isReadOnly}
                      className="h-9 w-27.5 bg-background/80"
                    />
                  </div>
                </div>
              </div>

              {item.is_active && (
                <div className="mt-4 border-t/70 pt-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Intervalos (pausas)</Label>
                      {!isReadOnly ? (
                        <Button variant="outline" size="sm" className="h-8" onClick={() => addBreak(item.day_of_week)}>
                          <Plus className="mr-2 h-3 w-3" /> Adicionar
                        </Button>
                      ) : null}
                    </div>

                    {item.breaks?.length === 0 ? (
                      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                        Nenhum intervalo configurado.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {item.breaks?.map((brk, idx: number) => (
                          <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <Input
                                type="time"
                                value={String(brk.start).slice(0, 5)}
                                onChange={(e) => updateBreak(item.day_of_week, idx, "start", e.target.value)}
                                className="h-9 w-27.5 bg-background/80"
                                disabled={isReadOnly}
                              />
                              <span className="text-xs text-muted-foreground">até</span>
                              <Input
                                type="time"
                                value={String(brk.end).slice(0, 5)}
                                onChange={(e) => updateBreak(item.day_of_week, idx, "end", e.target.value)}
                                className="h-9 w-27.5 bg-background/80"
                                disabled={isReadOnly}
                              />
                            </div>

                            {!isReadOnly ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeBreak(item.day_of_week, idx)}
                                aria-label="Remover intervalo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
