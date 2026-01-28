"use client"

import { useState } from "react"
import { Check, Pencil, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { deleteBarbershop, updateBarbershop } from "./actions"

type BarbershopRowProps = {
  shop: {
    id: string
    name: string | null
    description: string | null
    slug?: string | null
    is_active?: boolean | null
  }
  memberCount: number
  shopBarbers: { id: string; name: string }[]
}

export function BarbershopRow({ shop, memberCount, shopBarbers }: BarbershopRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const formId = `shop-${shop.id}`

  return (
    <TableRow className="transition hover:bg-muted/40">
      <TableCell>
        <form
          id={formId}
          action={updateBarbershop}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:flex-nowrap"
        >
          <input type="hidden" name="id" value={shop.id} />
          <Input
            name="name"
            defaultValue={shop.name || ""}
            placeholder="Nome"
            disabled={!isEditing}
            className="h-8 w-full sm:w-40"
          />
          <Textarea
            name="description"
            defaultValue={shop.description || ""}
            rows={1}
            disabled={!isEditing}
            className="h-8 min-h-8 w-full resize-none sm:w-56"
          />
          <label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={shop.is_active !== false}
              className="h-4 w-4"
            />
            Ativa
          </label>
        </form>
      </TableCell>

      <TableCell>
        <Input
          name="slug"
          form={formId}
          defaultValue={shop.slug || ""}
          placeholder="slug"
          disabled={!isEditing}
          className="h-8 w-full sm:w-40"
        />
      </TableCell>

      <TableCell>
        {shop.is_active !== false ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativa</Badge>
        ) : (
          <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20">Inativa</Badge>
        )}
      </TableCell>

      <TableCell>
        <div className="text-sm font-medium">{memberCount}</div>
        <div className="text-xs text-muted-foreground">membro(s)</div>
      </TableCell>

      <TableCell>
        {shopBarbers.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum barbeiro</div>
        ) : (
          <div className="space-y-1">
            <div className="text-sm font-medium">{shopBarbers.length}</div>
            <div className="text-xs text-muted-foreground">
              {shopBarbers.slice(0, 3).map((barber) => barber.name).join(", ")}
              {shopBarbers.length > 3 ? "..." : ""}
            </div>
          </div>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="inline-flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsEditing((current) => !current)}
          aria-label={isEditing ? "Cancelar edição" : "Editar barbearia"}
        >
          {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </Button>
        {isEditing ? (
          <Button type="submit" size="icon" form={formId} aria-label="Salvar alterações">
            <Check className="h-4 w-4" />
          </Button>
        ) : null}
        <form action={deleteBarbershop} className="inline-flex">
          <input type="hidden" name="id" value={shop.id} />
          <Button type="submit" variant="outline" size="icon" aria-label="Excluir barbearia">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
        </div>
      </TableCell>
    </TableRow>
  )
}
