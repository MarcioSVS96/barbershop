"use client"

import { useMemo, useState } from "react"
import { Check, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { updateBarbershopProfile, prepareDeleteMemberAndUser } from "./actions"

type ShopRow = {
  id: string
  name: string | null
  slug?: string | null
}

type BarberRow = {
  id: string
  name: string
  barbershop_id: string
}

type MemberRow = {
  user_id: string
  barbershop_id: string
  role: "owner" | "staff"
  barber_id?: string | null
}

type ProfileRowProps = {
  member: MemberRow
  email: string
  shop?: ShopRow
  shops: ShopRow[]
  barbers: BarberRow[]
}

export function ProfileRow({ member, email, shop, shops, barbers }: ProfileRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedShopId, setSelectedShopId] = useState(member.barbershop_id)
  const [selectedRole, setSelectedRole] = useState<MemberRow["role"]>(member.role)
  const [selectedBarberId, setSelectedBarberId] = useState(member.barber_id || "")

  const availableBarbers = useMemo(
    () => barbers.filter((barber) => barber.barbershop_id === selectedShopId),
    [barbers, selectedShopId],
  )

  const barberLabel =
    member.role === "owner"
      ? "Administrador"
      : barbers.find((barber) => barber.id === member.barber_id)?.name || "Barbeiro não vinculado"

  const formId = `profile-${member.user_id}-${member.barbershop_id}`

  return (
    <TableRow key={`${member.user_id}-${member.barbershop_id}`} className="transition hover:bg-muted/40">
      <TableCell>
        {isEditing ? (
          <select
            name="barbershop_id"
            form={formId}
            className="h-8 w-full rounded-md border bg-transparent px-2 text-sm"
            value={selectedShopId}
            onChange={(event) => {
              const nextShopId = event.target.value
              setSelectedShopId(nextShopId)
              const nextBarbers = barbers.filter((barber) => barber.barbershop_id === nextShopId)
              if (!nextBarbers.some((barber) => barber.id === selectedBarberId)) {
                setSelectedBarberId("")
              }
            }}
          >
            {shops.map((shopRow) => (
              <option key={shopRow.id} value={shopRow.id}>
                {shopRow.name || shopRow.slug || shopRow.id}
              </option>
            ))}
          </select>
        ) : (
          <>
            <div className="text-sm font-medium">{shop?.name || shop?.slug || member.barbershop_id}</div>
            <div className="text-xs text-muted-foreground">/{shop?.slug || "-"}</div>
          </>
        )}
      </TableCell>

      <TableCell>
        <form id={formId} action={updateBarbershopProfile} className="flex flex-col gap-2">
          <input type="hidden" name="user_id" value={member.user_id} />
          <input type="hidden" name="original_barbershop_id" value={member.barbershop_id} />
          <Input
            name="email"
            type="email"
            defaultValue={email}
            disabled={!isEditing}
            className="h-8 w-full"
            required
          />
          {isEditing ? (
            <Input
              name="password"
              type="password"
              placeholder="Nova senha (opcional)"
              className="h-8 w-full"
            />
          ) : null}
        </form>
      </TableCell>

      <TableCell>
        <select
          name="role"
          form={formId}
          className="h-8 w-full rounded-md border bg-transparent px-2 text-sm"
          value={selectedRole}
          disabled={!isEditing}
          onChange={(event) => {
            const nextRole = event.target.value === "staff" ? "staff" : "owner"
            setSelectedRole(nextRole)
            if (nextRole === "owner") setSelectedBarberId("")
          }}
        >
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
        </select>
      </TableCell>

      <TableCell>
        {isEditing && selectedRole === "staff" ? (
          <select
            name="barber_id"
            form={formId}
            className="h-8 w-full rounded-md border bg-transparent px-2 text-sm"
            value={selectedBarberId}
            onChange={(event) => setSelectedBarberId(event.target.value)}
          >
            <option value="">Selecione...</option>
            {availableBarbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-medium">{barberLabel}</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsEditing((current) => !current)}
            aria-label={isEditing ? "Cancelar edição" : "Editar perfil"}
          >
            {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
          {isEditing ? (
            <Button type="submit" size="icon" form={formId} aria-label="Salvar alterações">
              <Check className="h-4 w-4" />
            </Button>
          ) : null}
          <form action={prepareDeleteMemberAndUser} className="inline-flex">
            <input type="hidden" name="user_id" value={member.user_id} />
            <input type="hidden" name="barbershop_id" value={member.barbershop_id} />
            <Button type="submit" variant="outline" size="icon" aria-label="Excluir perfil">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </TableCell>
    </TableRow>
  )
}
