"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBarbershopUser } from "./actions"

type ShopOption = { id: string; name: string | null; slug?: string | null }

export function NewProfileForm({ shops }: { shops: ShopOption[] }) {
  const [state, action, pending] = useActionState(createBarbershopUser, null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [shop, setShop] = useState("")
  const [role, setRole] = useState("owner")
  const [whatsapp, setWhatsApp] = useState("")

  return (
    <form action={action} aria-busy={pending}>
      <fieldset disabled={pending || shops.length === 0} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="barber_name">Nome do barbeiro</Label>
          <Input id="barber_name" name="barber_name" value={name} onChange={(event) => setName(event.target.value)}
            placeholder="Ex. João Silva" autoComplete="off" maxLength={100} required aria-describedby="barber-name-help" />
          <p id="barber-name-help" className="text-xs text-muted-foreground">
            Este nome aparece na agenda e na página pública de agendamento.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail de acesso</Label>
          <Input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@barbearia.com" autoComplete="off" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password"
            placeholder="No mínimo 6 caracteres" minLength={6} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="barbershop_id">Barbearia</Label>
          <select id="barbershop_id" name="barbershop_id" value={shop} onChange={(event) => setShop(event.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" required>
            <option value="" disabled>Selecione a barbearia</option>
            {shops.map(({ id, name, slug }) => (
              <option key={id} value={id}>{name || slug || id}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="role">Função</Label>
          <select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" required>
            <option value="owner">Dono da barbearia</option>
            <option value="staff">Barbeiro da equipe</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="whatsapp_phone">WhatsApp da barbearia (opcional)</Label>
          <Input id="whatsapp_phone" name="whatsapp_phone" type="tel" value={whatsapp}
            onChange={(event) => setWhatsApp(event.target.value)} placeholder="(81) 98765-4321"
            aria-describedby="whatsapp-help" />
          <p id="whatsapp-help" className="text-xs text-muted-foreground">
            Informe o DDD e o número. O código do Brasil entra automaticamente no link.
          </p>
        </div>
        {state?.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit">{pending ? "Criando perfil…" : "Criar perfil"}</Button>
      </fieldset>
      {shops.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Cadastre uma barbearia para criar o primeiro perfil.</p>
      ) : null}
    </form>
  )
}
