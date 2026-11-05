import Link from "next/link"
import { ArrowUpRight, ChevronDown, ShieldAlert, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminForm, AdminSheet } from "./admin-sheet"
import {
  createBarbershop,
  deleteBarbershop,
  updateBarbershop,
  updateBarbershopActive,
} from "./actions"

export type AdminShop = {
  id: string
  name: string | null
  slug: string | null
  description: string | null
  whatsapp_phone: string | null
  is_active: boolean | null
}

export function shopName(shop: AdminShop) {
  return shop.name || shop.slug || "Barbearia sem nome"
}

function ShopFields({ shop }: { shop?: AdminShop }) {
  return (
    <>
      {shop ? <input type="hidden" name="id" value={shop.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="shop-name">Nome da barbearia</Label>
        <Input
          id="shop-name"
          name="name"
          defaultValue={shop?.name ?? ""}
          placeholder="Ex. Barbearia Modelo"
          autoComplete="organization"
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shop-whatsapp">WhatsApp</Label>
        <Input
          id="shop-whatsapp"
          name="whatsapp_phone"
          type="tel"
          autoComplete="tel-national"
          placeholder="(81) 98765-4321"
          defaultValue={shop?.whatsapp_phone ?? ""}
          aria-describedby="shop-whatsapp-hint"
        />
        <p id="shop-whatsapp-hint" className="text-xs text-slate-600">
          Opcional. Informe o DDD e o número do celular.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="shop-description">Descrição</Label>
        <Textarea
          id="shop-description"
          name="description"
          defaultValue={shop?.description ?? ""}
          placeholder="Uma breve apresentação para a página de agendamento."
          rows={3}
        />
      </div>
      <details
        open={shop ? true : undefined}
        className="group rounded-lg border border-slate-200 px-3 py-2.5"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-700">
          Endereço da agenda{" "}
          <ChevronDown aria-hidden className="size-4 group-open:rotate-180" />
        </summary>
        <div className="space-y-2 pt-3">
          <Label htmlFor="shop-slug" className="sr-only">
            Endereço personalizado
          </Label>
          <Input
            id="shop-slug"
            name="slug"
            defaultValue={shop?.slug ?? ""}
            placeholder="barbearia-modelo"
            aria-describedby="shop-slug-hint"
          />
          <p
            id="shop-slug-hint"
            className="text-xs leading-relaxed text-slate-600"
          >
            {shop
              ? "Ao alterar o endereço, atualize o link onde ele já foi divulgado."
              : "O endereço será gerado pelo nome. Preencha este campo para personalizar."}
          </p>
        </div>
      </details>
      {shop ? null : (
        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked
            className="size-4 accent-slate-900"
          />
          Cadastrar como ativa
        </label>
      )}
    </>
  )
}

export function NewShopPanel() {
  return (
    <AdminSheet
      title="Nova barbearia"
      description="Preencha os dados da unidade para criar seu endereço de agendamento."
      step={1}
      closeUrl="/adminmaster"
    >
      <AdminForm
        action={createBarbershop}
        submit="Salvar e criar acesso"
        cancelUrl="/adminmaster"
      >
        <ShopFields />
      </AdminForm>
    </AdminSheet>
  )
}

export function ManageShopPanel({
  shop,
  memberCount,
  accountsAvailable,
  confirmDeletion,
}: {
  shop: AdminShop
  memberCount: number
  accountsAvailable: boolean
  confirmDeletion: boolean
}) {
  const manageUrl = `/adminmaster?gerenciar=${shop.id}`
  const accessUrl = `/adminmaster?tab=acessos&barbearia=${shop.id}`
  const active = shop.is_active === true
  const canDelete = accountsAvailable && memberCount === 0

  if (confirmDeletion && canDelete) {
    return (
      <AdminSheet
        title="Excluir barbearia?"
        description="Confirme o cadastro que deseja remover."
        closeUrl={manageUrl}
      >
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900">
          <ShieldAlert aria-hidden className="mb-2 size-5" />
          <p>
            <strong>{shopName(shop)}</strong> será excluída permanentemente e o
            endereço de agendamento deixará de funcionar.
          </p>
        </div>
        <AdminForm
          action={deleteBarbershop}
          submit="Confirmar exclusão"
          cancelUrl={manageUrl}
          variant="destructive"
        >
          <input type="hidden" name="id" value={shop.id} />
          <input type="hidden" name="confirmed" value="1" />
        </AdminForm>
      </AdminSheet>
    )
  }

  return (
    <AdminSheet
      title={shopName(shop)}
      description="Gerencie os dados, os acessos e a situação da barbearia."
      closeUrl="/adminmaster"
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={accessUrl}>
            <Users aria-hidden /> Ver acessos
          </Link>
        </Button>
        {active && shop.slug ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={`/${encodeURIComponent(shop.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir agenda <ArrowUpRight aria-hidden />
            </a>
          </Button>
        ) : null}
      </div>
      <AdminForm action={updateBarbershop} submit="Salvar alterações">
        <ShopFields shop={shop} />
      </AdminForm>
      <section className="space-y-3 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Situação da barbearia
        </h3>
        <p className="text-sm leading-relaxed text-slate-600">
          {active
            ? "Ativa. Desativar retira a agenda do ar e bloqueia a entrada no painel da barbearia."
            : "Inativa. Ativar disponibiliza a agenda e o painel da barbearia."}
        </p>
        <AdminForm
          action={updateBarbershopActive}
          submit={active ? "Desativar barbearia" : "Ativar barbearia"}
          variant="outline"
        >
          <input type="hidden" name="id" value={shop.id} />
          <input
            type="hidden"
            name="is_active"
            value={active ? "false" : "true"}
          />
        </AdminForm>
      </section>
      <details className="group border-t border-slate-200 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-700">
          Opções avançadas{" "}
          <ChevronDown aria-hidden className="size-4 group-open:rotate-180" />
        </summary>
        <div className="mt-3 text-sm text-slate-600">
          {canDelete ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-red-700 hover:text-red-800"
            >
              <Link href={`${manageUrl}&confirmar=exclusao`} scroll={false}>
                Excluir barbearia
              </Link>
            </Button>
          ) : (
            <p>
              {accountsAvailable
                ? "Revise os acessos vinculados antes de excluir a barbearia."
                : "Atualize a página para conferir os acessos antes de excluir."}
            </p>
          )}
        </div>
      </details>
    </AdminSheet>
  )
}
