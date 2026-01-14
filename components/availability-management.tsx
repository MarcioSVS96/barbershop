"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Clock, Save, Plus, Trash2 } from "lucide-react"

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
      is_active: initialMap.get(day.id)?.is_active ?? (day.id !== 0), // Default closed on Sunday
      breaks: initialMap.get(day.id)?.breaks || [],
    }))
  })

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Horários de Atendimento</CardTitle>
            <CardDescription>Configure os dias e horários disponíveis para agendamento</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.day_of_week} className="flex flex-col gap-4 rounded-lg border p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 min-w-37.5">
                <Switch
                  checked={item.is_active}
                  onCheckedChange={(checked) => handleUpdate(item.day_of_week, "is_active", checked)}
                />
                <Label className={!item.is_active ? "text-muted-foreground" : ""}>{item.label}</Label>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={item.start_time}
                    onChange={(e) => handleUpdate(item.day_of_week, "start_time", e.target.value)}
                    disabled={!item.is_active}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    type="time"
                    value={item.end_time}
                    onChange={(e) => handleUpdate(item.day_of_week, "end_time", e.target.value)}
                    disabled={!item.is_active}
                    className="w-24"
                  />
                </div>
              </div>
              </div>

              {item.is_active && (
                <div className="mt-4 border-t pt-4 sm:ml-14">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Intervalos (pausas)</Label>
                      {item.breaks?.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum intervalo configurado.</p>
                      )}
                      {item.breaks?.map((brk, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={brk.start}
                              onChange={(e) => updateBreak(item.day_of_week, idx, "start", e.target.value)}
                              className="h-8 w-24"
                            />
                            <span className="text-xs text-muted-foreground">até</span>
                            <Input
                              type="time"
                              value={brk.end}
                              onChange={(e) => updateBreak(item.day_of_week, idx, "end", e.target.value)}
                              className="h-8 w-24"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeBreak(item.day_of_week, idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => addBreak(item.day_of_week)}
                    >
                      <Plus className="mr-2 h-3 w-3" /> Adicionar Intervalo
                    </Button>
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