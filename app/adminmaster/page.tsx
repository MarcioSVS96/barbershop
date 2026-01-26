import Link from "next/link"
import { ShieldCheck, Store, UserPlus } from "lucide-react"
import { requireMasterAdmin } from "@/lib/admin/master"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createBarbershop, createBarbershopUser, deleteBarbershop, updateBarbershop } from "./actions"

export const dynamic = "force-dynamic"

type ShopRow = {
  id: string
  name: string | null
  description: string | null
  logo_url: string | null
  slug?: string | null
  updated_at?: string | null
  is_active?: boolean | null
}

export default async function AdminMasterPage() {
  const { user } = await requireMasterAdmin()
  const admin = createAdminClient()

  // ✅ FIX: evita "quebrar" o select quando algumas colunas não existem no banco
  // e também loga erro no terminal caso ainda tenha algum problema.
  const { data: shops, error: shopsError } = await admin
    .from("barbershop_settings")
    .select("*")
    .order("id", { ascending: false })

  if (shopsError) {
    console.error("[adminmaster] shopsError:", shopsError)
  }

  const { data: members, error: membersError } = await admin.from("barbershop_members").select("barbershop_id")
  if (membersError) console.error("[adminmaster] membersError:", membersError)

  const { data: barbers, error: barbersError } = await admin
    .from("barbers")
    .select("id, name, barbershop_id")
    .order("name", { ascending: true })
  if (barbersError) console.error("[adminmaster] barbersError:", barbersError)

  const memberCount = new Map<string, number>()
  for (const row of members || []) {
    memberCount.set(row.barbershop_id, (memberCount.get(row.barbershop_id) || 0) + 1)
  }

  const barbersByShop = new Map<string, { id: string; name: string }[]>()
  for (const barber of barbers || []) {
    const list = barbersByShop.get(barber.barbershop_id) || []
    list.push({ id: barber.id, name: barber.name })
    barbersByShop.set(barber.barbershop_id, list)
  }

  const shopsList = (shops || []) as ShopRow[]

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Master</h1>
              <p className="text-sm text-muted-foreground">Controle central das barbearias e contas</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Logado como {user.email}</Badge>
            <Button asChild variant="outline">
              <Link href="/">Ver site público</Link>
            </Button>
            <form action="/auth/logout" method="post">
              <Button type="submit" variant="outline">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-muted-foreground" />
                Nova barbearia
              </CardTitle>
              <CardDescription>Cadastre uma barbearia com slug e descrição.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createBarbershop} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" placeholder="Barbearia Premium" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" name="slug" placeholder="barbearia-premium" />
                  <p className="text-xs text-muted-foreground">Se vazio, o slug será gerado automaticamente.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" rows={3} placeholder="Serviços de alto padrão." />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4" />
                  Barbearia ativa
                </label>

                <Button type="submit">Cadastrar barbearia</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                Criar conta da barbearia
              </CardTitle>
              <CardDescription>Crie o usuário e vincule à barbearia.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createBarbershopUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="admin@barbearia.com" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" placeholder="Crie uma senha forte" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barbershop_id">Barbearia</Label>
                  <select
                    id="barbershop_id"
                    name="barbershop_id"
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {shopsList.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name || shop.slug || shop.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Perfil</Label>
                  <select id="role" name="role" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <Button type="submit">Criar conta</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border-muted/60">
          <CardHeader>
            <CardTitle>Barbearias cadastradas</CardTitle>
            <CardDescription>Edite, desative ou remova barbearias.</CardDescription>
          </CardHeader>
          <CardContent>
            {shopsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma barbearia cadastrada ainda.
                {shopsError ? (
                  <span className="block mt-2 text-xs text-red-500">
                    Erro ao carregar barbearias: {shopsError.message}
                  </span>
                ) : null}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barbearia</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contas</TableHead>
                    <TableHead>Barbeiros</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shopsList.map((shop) => {
                    const formId = `shop-${shop.id}`
                    const shopBarbers = barbersByShop.get(shop.id) || []

                    return (
                      <TableRow key={shop.id}>
                        <TableCell>
                          <form id={formId} action={updateBarbershop} className="space-y-2">
                            <input type="hidden" name="id" value={shop.id} />
                            <Input name="name" defaultValue={shop.name || ""} placeholder="Nome da barbearia" />
                            <Textarea name="description" defaultValue={shop.description || ""} rows={2} />
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                name="is_active"
                                // ✅ fallback: se coluna não existir / vier null, assume ativa
                                defaultChecked={shop.is_active !== false}
                                className="h-4 w-4"
                              />
                              Ativa no site
                            </label>
                            <div className="flex gap-2">
                              <Button type="submit" size="sm">
                                Salvar
                              </Button>
                            </div>
                          </form>
                        </TableCell>

                        <TableCell>
                          <Input
                            name="slug"
                            form={formId}
                            // ✅ fallback
                            defaultValue={shop.slug || ""}
                            placeholder="slug"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">/{shop.slug || "-"}</p>
                        </TableCell>

                        <TableCell>
                          {shop.is_active !== false ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativa</Badge>
                          ) : (
                            <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20">Inativa</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium">{memberCount.get(shop.id) || 0}</div>
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
                          <form action={deleteBarbershop}>
                            <input type="hidden" name="id" value={shop.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Excluir
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
