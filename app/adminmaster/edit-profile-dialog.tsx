import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminForm, AdminSheet } from "./admin-sheet"
import { updateBarbershopUser } from "./actions"
import { shopName, type AdminShop } from "./shop-panels"

export function EditProfileDialog({
  userId,
  currentBarbershopId,
  email,
  role,
  shops,
  onCloseUrl,
}: {
  userId: string
  currentBarbershopId: string
  email: string
  role: "owner" | "staff"
  shops: AdminShop[]
  onCloseUrl: string
}) {
  return (
    <AdminSheet
      title="Editar acesso"
      description="Atualize a conta e a função de acesso à barbearia."
      closeUrl={onCloseUrl}
    >
      <AdminForm
        action={updateBarbershopUser}
        submit="Salvar alterações"
        cancelUrl={onCloseUrl}
      >
        <input type="hidden" name="user_id" value={userId} />
        <input
          type="hidden"
          name="current_barbershop_id"
          value={currentBarbershopId}
        />
        <div className="space-y-2">
          <Label htmlFor="edit-email">E-mail</Label>
          <Input
            id="edit-email"
            name="email"
            type="email"
            defaultValue={email}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-password">Nova senha</Label>
          <Input
            id="edit-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Deixe em branco para manter"
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-barbershop">Barbearia</Label>
          <select
            id="edit-barbershop"
            name="barbershop_id"
            defaultValue={currentBarbershopId}
            required
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shopName(shop)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-role">Função</Label>
          <select
            id="edit-role"
            name="role"
            defaultValue={role}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="owner">Responsável</option>
            <option value="staff">Barbeiro</option>
          </select>
        </div>
      </AdminForm>
    </AdminSheet>
  )
}
