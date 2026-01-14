"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Clock, Save, Plus, Trash2, CalendarDays } from "lucide-react"

export interface Availability {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  breaks?: { start: string; end: string }[]
}

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
}

export function AvailabilityManagement({ availability: initialAvailability }: AvailabilityManagementProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Merge initial availability with days structure to ensure all days are represented
  const [items, setItems] = useState(() => {
    const initialMap = new Map(initialAvailability.map((item) => [item.day_of_week, item]))
    return DAYS.map((day) => ({
      id: initialMap.get(day.id)?.id,
      day_of_week: day.id,
      label: day.label,
      start_time: initialMap.get(day.id)?.start_time.slice(0, 5) || "09:00",
      end_time: initialMap.get(day.id)?.end_time.slice(0, 5) || "19:00",
      is_active: initialMap.get(day.id)?.is_active ?? day.id !== 0, // Default closed on Sunday
      breaks: initialMap.get(day.id)?.breaks || [],
    }))
  })

  const activeDaysCount = useMemo(() => items.filter((i) => i.is_active).length, [items])

  const handleUpdate = (dayId: number, field: string, value: any) => {
    setItems((prev) => prev.map((item) => (item.day_of_week === dayId ? { ...item, [field]: value } : item)))
  }

  const addBreak = (dayId: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.day_of_week === dayId
          ? { ...item, breaks: [...(item.breaks || []), { start: "12:00", end: "13:00" }] }
          : item,
      ),
    )
  }

  const removeBreak = (dayId: number, index: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.day_of_week === dayId ? { ...item, breaks: item.breaks?.filter((_, i) => i !== index) } : item,
      ),
    )
  }

  const updateBreak = (dayId: number, index: number, field: "start" | "end", value: string) => {
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
    setIsLoading(true)
    try {
      const updates = items.map(({ day_of_week, start_time, end_time, is_active, breaks }) => ({
        day_of_week,
        start_time,
        end_time,
        is_active,
        breaks,
      }))

      const { error } = await supabase.from("availability").upsert(updates, { onConflict: "day_of_week" })
      if (error) throw error

      toast({
        title: "Horários atualizados",
        description: "A disponibilidade foi salva com sucesso.",
      })
    } catch (error: any) {
      console.error("Error saving availability:", JSON.stringify(error, null, 2))
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível atualizar os horários.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/40">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Horários de Atendimento</CardTitle>
            </div>
            <CardDescription>Configure os dias e horários disponíveis para agendamento</CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Dias ativos</span>
              <span className="font-medium">{activeDaysCount}/7</span>
            </div>

            <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="sm:hidden flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Dias ativos</span>
          <span className="font-medium">{activeDaysCount}/7</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.day_of_week}
              className={[
                "rounded-xl border p-4 transition-colors",
                item.is_active ? "bg-card" : "bg-muted/20 opacity-90",
              ].join(" ")}
            >
              {/* header do dia */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3 sm:justify-start">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) => handleUpdate(item.day_of_week, "is_active", checked)}
                    />
                    <div className="leading-tight">
                      <Label className={item.is_active ? "font-medium" : "text-muted-foreground"}>
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {item.is_active ? "Aberto para agendamentos" : "Fechado"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* horários */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Atendimento</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={item.start_time}
                      onChange={(e) => handleUpdate(item.day_of_week, "start_time", e.target.value)}
                      disabled={!item.is_active}
                      className="w-[110px]"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={item.end_time}
                      onChange={(e) => handleUpdate(item.day_of_week, "end_time", e.target.value)}
                      disabled={!item.is_active}
                      className="w-[110px]"
                    />
                  </div>
                </div>
              </div>

              {/* intervalos */}
              {item.is_active && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Intervalos (pausas)</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => addBreak(item.day_of_week)}
                      >
                        <Plus className="mr-2 h-3 w-3" /> Adicionar
                      </Button>
                    </div>

                    {item.breaks?.length === 0 ? (
                      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                        Nenhum intervalo configurado.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {item.breaks?.map((brk, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 rounded-lg border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={brk.start}
                                onChange={(e) => updateBreak(item.day_of_week, idx, "start", e.target.value)}
                                className="h-9 w-[110px]"
                              />
                              <span className="text-xs text-muted-foreground">até</span>
                              <Input
                                type="time"
                                value={brk.end}
                                onChange={(e) => updateBreak(item.day_of_week, idx, "end", e.target.value)}
                                className="h-9 w-[110px]"
                              />
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 self-end text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto"
                              onClick={() => removeBreak(item.day_of_week, idx)}
                              aria-label="Remover intervalo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
