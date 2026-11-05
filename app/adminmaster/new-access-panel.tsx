import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminForm, AdminSheet } from "./admin-sheet"
import { createBarbershopUser } from "./actions"
import { shopName, type AdminShop } from "./shop-panels"

export function NewAccessPanel({
  shops,
  shop,
  onboarding,
  closeUrl,
}: {
  shops: AdminShop[]
  shop?: AdminShop
  onboarding: boolean
  closeUrl: string
}) {
  return (
    <AdminSheet
      title={onboarding ? "Criar acesso do responsável" : "Novo acesso"}
      description={
        onboarding
          ? "A barbearia foi cadastrada. Defina o e-mail e a senha que o responsável vai usar."
          : "Defina a conta e a função de acesso ao painel da barbearia."
      }
      step={onboarding ? 2 : undefined}
      closeUrl={closeUrl}
    >
      <AdminForm
        action={createBarbershopUser}
        submit={onboarding ? "Criar acesso e concluir" : "Criar acesso"}
        cancelUrl={closeUrl}
        cancelLabel={onboarding ? "Criar depois" : "Cancelar"}
      >
        {shop && onboarding ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-600">Barbearia</p>
            <p className="break-words text-sm font-semibold text-slate-900">
              {shopName(shop)}
            </p>
            <input type="hidden" name="barbershop_id" value={shop.id} />
            <input type="hidden" name="onboarding" value="1" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="access-shop">Barbearia</Label>
              <select
                id="access-shop"
                name="barbershop_id"
                required
                defaultValue={shop?.id ?? ""}
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
              >
                <option value="" disabled>
                  Selecione a barbearia
                </option>
                {shops.map((option) => (
                  <option key={option.id} value={option.id}>
                    {shopName(option)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-role">Função</Label>
              <select
                id="access-role"
                name="role"
                defaultValue="owner"
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
              >
                <option value="owner">Responsável</option>
                <option value="staff">Barbeiro</option>
              </select>
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="access-email">E-mail</Label>
          <Input
            id="access-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="responsavel@barbearia.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="access-password">Senha</Label>
          <Input
            id="access-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            aria-describedby="access-password-hint"
          />
          <p id="access-password-hint" className="text-xs text-slate-600">
            Use pelo menos 6 caracteres.
          </p>
        </div>
      </AdminForm>
    </AdminSheet>
  )
}
