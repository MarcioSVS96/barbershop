import Link from "next/link"
import { Building2, LayoutDashboard, ShieldCheck, Store, UserPlus, Users, Trash2, Pencil } from "lucide-react"
import { requireMasterAdmin } from "@/lib/admin/master"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createBarbershop,
  createBarbershopUser,
  prepareDeleteMemberAndUser,
  deleteMemberAndUser,
  updateBarbershopUser,
} from "./actions"
import { BarbershopRow } from "./barbershop-row"
import { CreationMessage } from "./creation-message"
import { DeleteProfileDialog } from "./delete-profile-dialog"
import { EditProfileDialog } from "./edit-profile-dialog"



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

function messageFromCode(code: string | null) {
  switch (code) {
    case "email_exists":
      return { title: "Email já cadastrado", description: "Já existe um usuário com esse email. Use outro email ou recupere a senha." }
    case "staff_requires_barber":
      return { title: "Selecione o barbeiro", description: "Para criar conta de staff, você precisa vincular um barbeiro." }
    case "barber_mismatch":
      return { title: "Barbeiro inválido", description: "O barbeiro selecionado não pertence à barbearia escolhida." }
    case "invalid_role":
      return { title: "Perfil inválido", description: "Escolha owner ou staff." }
    case "user_created":
      return { title: "Perfil criado", description: "Conta criada e vinculada com sucesso." }
    case "barbershop_created":
      return { title: "Barbearia criada", description: "Barbearia cadastrada com sucesso." }
    case "profile_deleted":
      return { title: "Perfil excluído", description: "O perfil foi removido com sucesso." }
    case "slug_exists":
      return { title: "Slug já cadastrado", description: "Use outro slug ou ajuste o nome da barbearia." }
    case "profile_updated":
      return { title: "Perfil atualizado", description: "As alterações foram salvas com sucesso." }
    case "profile_exists":
      return { title: "Perfil já existe", description: "Esse usuário já está vinculado a essa barbearia." }
    case "profile_update_missing_fields":
      return { title: "Dados incompletos", description: "Preencha email, barbearia e perfil." }
    case "profile_update_not_found":
      return { title: "Perfil não encontrado", description: "Não foi possível localizar o perfil para atualizar." }
    default:
      return null
  }
}

export default async function AdminMasterPage({
  searchParams,
}: {
  searchParams?: Promise<{
  msg?: string
  tab?: string
  confirm?: string
  edit?: string
  user_id?: string
  barbershop_id?: string
}>

}) {
  const { user } = await requireMasterAdmin()
  const admin = createAdminClient()

  const resolved = (await searchParams) || {}
  const msgCode = resolved.msg ?? null
  const tabParam = resolved.tab ?? "visao-geral"
  const allowedTabs = new Set(["visao-geral", "nova-barbearia", "nova-conta", "barbearias-cadastradas", "perfis"])
  const activeTab = allowedTabs.has(tabParam) ? tabParam : "visao-geral"
  const msg = messageFromCode(msgCode)
  const overlayPerfisCodes = new Set([
    "profile_deleted",
    "profile_updated",
    "profile_exists",
    "profile_update_missing_fields",
    "profile_update_not_found",
    "email_exists",
    "invalid_role",
  ])
  const showOverlayMessage =
    (msgCode === "barbershop_created" && activeTab === "nova-barbearia") ||
    (msgCode === "user_created" && activeTab === "nova-conta") ||
    (activeTab === "perfis" && !!msgCode && overlayPerfisCodes.has(msgCode))
  const editUserId = resolved.user_id ?? null
  const editBarbershopId = resolved.barbershop_id ?? null
  const showEditDialog = resolved.edit === "1" && activeTab === "perfis" && editUserId && editBarbershopId

  const { data: shops, error: shopsError } = await admin
    .from("barbershop_settings")
    .select("*")
    .order("id", { ascending: false })

  if (shopsError) console.error("[adminmaster] shopsError:", shopsError)

  const { data: members, error: membersError } = await admin
    .from("barbershop_members")
    .select("user_id, barbershop_id, role, barber_id")
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
  const barbersById = new Map<string, string>()
  for (const barber of (barbers || []) as BarberRow[]) {
    const list = barbersByShop.get(barber.barbershop_id) || []
    list.push({ id: barber.id, name: barber.name })
    barbersByShop.set(barber.barbershop_id, list)
    barbersById.set(barber.id, barber.name)
  }

  const shopsList = (shops || []) as ShopRow[]
  const barbersList = (barbers || []) as BarberRow[]
  const membersList = (members || []) as MemberRow[]
  const activeShops = shopsList.filter((shop) => shop.is_active !== false).length
  const totalMembers = members?.length ?? 0

  const { data: userList, error: userListError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (userListError) console.error("[adminmaster] usersError:", userListError)
  const userEmailById = new Map<string, string>()
  for (const u of userList?.users || []) {
    if (u.id && u.email) userEmailById.set(u.id, u.email)
  }

  const shopsById = new Map<string, ShopRow>()
  for (const shop of shopsList) {
    shopsById.set(shop.id, shop)
  }

  const editMember =
    showEditDialog && editUserId && editBarbershopId
      ? membersList.find(
          (member) => member.user_id === editUserId && member.barbershop_id === editBarbershopId,
        )
      : null
  const editEmail = editUserId ? userEmailById.get(editUserId) || editUserId : ""
  const editRole = editMember?.role ?? "owner"

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_55%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.2))]">
      <div className="mx-auto grid max-w-screen-2xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="order-last flex flex-col gap-6 rounded-2xl border bg-card/80 p-6 shadow-sm lg:order-first lg:sticky lg:top-8 lg:self-start">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Master</p>
              <p className="text-lg font-semibold">Painel Geral</p>
            </div>
          </div>

          <nav className="space-y-2 text-sm">
            <Link
              className={`group flex items-center justify-between rounded-lg border px-3 py-2 font-medium transition ${
                activeTab === "visao-geral"
                  ? "border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/40"
              }`}
              href="/adminmaster?tab=visao-geral"
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard
                  className={`h-4 w-4 ${
                    activeTab === "visao-geral" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                Visao geral
              </span>
              <span className="text-xs text-muted-foreground">{shopsList.length}</span>
            </Link>
            <Link
              className={`group flex items-center justify-between rounded-lg border px-3 py-2 font-medium transition ${
                activeTab === "nova-barbearia"
                  ? "border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/40"
              }`}
              href="/adminmaster?tab=nova-barbearia"
            >
              <span className="flex items-center gap-2">
                <Store
                  className={`h-4 w-4 ${
                    activeTab === "nova-barbearia"
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                Cadastro
              </span>
              <span className="text-xs text-muted-foreground">+</span>
            </Link>
            <Link
              className={`group flex items-center justify-between rounded-lg border px-3 py-2 font-medium transition ${
                activeTab === "perfis"
                  ? "border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/40"
              }`}
              href="/adminmaster?tab=perfis"
            >
              <span className="flex items-center gap-2">
                <Users
                  className={`h-4 w-4 ${
                    activeTab === "perfis" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                Perfis
              </span>
              <span className="text-xs text-muted-foreground">{membersList.length}</span>
            </Link>
            <Link
              className={`group flex items-center justify-between rounded-lg border px-3 py-2 font-medium transition ${
                activeTab === "barbearias-cadastradas"
                  ? "border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-muted/40"
              }`}
              href="/adminmaster?tab=barbearias-cadastradas"
            >
              <span className="flex items-center gap-2">
                <Building2
                  className={`h-4 w-4 ${
                    activeTab === "barbearias-cadastradas"
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                Barbearias
              </span>
              <span className="text-xs text-muted-foreground">
                {activeShops}/{shopsList.length}
              </span>
            </Link>
          </nav>

          <div className="mt-auto space-y-3 rounded-xl border bg-muted/40 p-3 text-xs">
            <div className="flex flex-col gap-2">
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/">Ver site público</Link>
              </Button>
              <form action="/auth/logout" method="post">
                <Button type="submit" size="sm" variant="outline" className="w-full">
                  Sair
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <main className="space-y-8">
          {showOverlayMessage && msg ? <CreationMessage title={msg.title} description={msg.description} /> : null}
          <section className={activeTab === "visao-geral" ? "space-y-4" : "hidden"}>
            <header id="visao-geral" className="rounded-2xl border bg-card/80 p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Admin Master</h1>
                  <p className="text-sm text-muted-foreground">Controle central das barbearias, equipes e acessos.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:hidden">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/">Ver site público</Link>
                  </Button>
                  <form action="/auth/logout" method="post">
                    <Button type="submit" size="sm" variant="outline">
                      Sair
                    </Button>
                  </form>
                </div>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">Barbearias cadastradas</div>
                <div className="mt-2 text-2xl font-semibold">{shopsList.length}</div>
                <div className="mt-1 text-xs text-muted-foreground">{activeShops} ativas</div>
              </div>
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">Contas vinculadas</div>
                <div className="mt-2 text-2xl font-semibold">{totalMembers}</div>
                <div className="mt-1 text-xs text-muted-foreground">owners + staff</div>
              </div>
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">Barbeiros</div>
                <div className="mt-2 text-2xl font-semibold">{barbersList.length}</div>
                <div className="mt-1 text-xs text-muted-foreground">cadastrados</div>
              </div>
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">Atualizacoes</div>
                <div className="mt-2 text-2xl font-semibold">{shopsList.filter((shop) => shop.updated_at).length}</div>
                <div className="mt-1 text-xs text-muted-foreground">barbearias com edicao recente</div>
              </div>
            </div>
          </section>

          {msg && !showOverlayMessage && (activeTab === "nova-barbearia" || activeTab === "nova-conta") ? (
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="text-sm font-medium">{msg.title}</div>
              <div className="text-xs text-muted-foreground">{msg.description}</div>
            </div>
          ) : null}

          <div
            className={`grid gap-4 lg:grid-cols-[1fr_1fr] ${
              activeTab === "nova-barbearia" || activeTab === "nova-conta" ? "" : "hidden"
            }`}
          >
            <Card id="nova-barbearia" className="border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-muted-foreground" />
                Nova barbearia
              </CardTitle>
              <CardDescription>Cadastre uma barbearia com slug e descrição.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createBarbershop} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" placeholder="Barbearia Premium" required className="h-9 w-full sm:max-w-sm" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" name="slug" placeholder="barbearia-premium" className="h-9 w-full sm:max-w-sm" />
                  <p className="text-xs text-muted-foreground">Se vazio, o slug será gerado automaticamente.</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" rows={3} placeholder="Serviços de alto padrão." className="min-h-18" />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4" />
                  Barbearia ativa
                </label>

                <Button type="submit">Cadastrar barbearia</Button>
              </form>
            </CardContent>
          </Card>

            <Card id="nova-conta" className="border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                Criar conta da barbearia
              </CardTitle>
              <CardDescription>
                Crie o usuário e vincule à barbearia. Para <b>staff</b>, selecione também o <b>barbeiro</b>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createBarbershopUser} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="admin@barbearia.com" required className="h-9" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" placeholder="Crie uma senha forte" required className="h-9" />
                </div>

                <div className="space-y-1">
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

                <div className="space-y-1">
                  <Label htmlFor="role">Perfil</Label>
                  <select
                    id="role"
                    name="role"
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    defaultValue="owner"
                  >
                    <option value="owner">Owner</option>
                    <option value="staff">Staff</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Owner = dono/admin. Staff = barbeiro (precisa vincular um barbeiro).</p>
                </div>

                <Button type="submit">Criar conta</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card
          id="barbearias-cadastradas"
          className={`border-muted/60 ${activeTab === "barbearias-cadastradas" ? "" : "hidden"}`}
        >
          <CardHeader>
            <CardTitle>Barbearias cadastradas</CardTitle>
            <CardDescription>Edite, desative ou remova barbearias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {shopsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma barbearia cadastrada ainda.
                {shopsError ? (
                  <span className="block mt-2 text-xs text-red-500">Erro ao carregar barbearias: {shopsError.message}</span>
                ) : null}
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card/70 shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Barbearia</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Slug</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Contas</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Barbeiros</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&>tr:nth-child(even)]:bg-muted/20">
                    {shopsList.map((shop) => {
                      const shopBarbers = barbersByShop.get(shop.id) || []

                      return (
                        <BarbershopRow
                          key={shop.id}
                          shop={shop}
                          memberCount={memberCount.get(shop.id) || 0}
                          shopBarbers={shopBarbers}
                        />
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="perfis" className={`border-muted/60 ${activeTab === "perfis" ? "" : "hidden"}`}>
          <CardHeader>
            <CardTitle>Perfis das barbearias</CardTitle>
            <CardDescription>Owners e staff vinculados a cada barbearia.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {showEditDialog && editMember ? (
              <EditProfileDialog
                userId={String(editUserId)}
                currentBarbershopId={String(editBarbershopId)}
                email={editEmail}
                role={editRole}
                shops={shopsList}
                onCloseUrl="/adminmaster?tab=perfis"
                action={updateBarbershopUser}
              />
            ) : null}
            {/* ✅ CONFIRMAÇÃO SERVER-SAFE (sem JS) */}
            {resolved?.confirm === "1" && resolved?.user_id && resolved?.barbershop_id ? (
              <DeleteProfileDialog
                userId={String(resolved.user_id)}
                barbershopId={String(resolved.barbershop_id)}
                onCloseUrl="/adminmaster?tab=perfis"
                action={deleteMemberAndUser}
              />
            ) : null}

            {membersList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum perfil cadastrado ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card/70 shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Barbearia
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Email
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Perfil
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Barbeiro
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="[&>tr:nth-child(even)]:bg-muted/20">
                    {membersList.map((member) => {
                      const shop = shopsById.get(member.barbershop_id)
                      const email = userEmailById.get(member.user_id) || member.user_id
                      const barberName = member.barber_id ? barbersById.get(member.barber_id) : null

                      // ✅ owner aparece como "Administrador"
                      const barberLabel = member.role === "owner" ? "Administrador" : barberName || "Barbeiro não vinculado"

                      return (
                        <TableRow key={`${member.user_id}-${member.barbershop_id}`} className="transition hover:bg-muted/40">
                          <TableCell>
                            <div className="text-sm font-medium">{shop?.name || shop?.slug || member.barbershop_id}</div>
                            <div className="text-xs text-muted-foreground">/{shop?.slug || "-"}</div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm font-medium">{email}</div>
                          </TableCell>

                          <TableCell>
                            {member.role === "owner" ? (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Owner</Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Staff</Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            <span className="text-sm font-medium">{barberLabel}</span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button asChild variant="outline" size="icon" className="h-8 w-8" aria-label="Editar perfil">
                                <Link
                                  href={`/adminmaster?tab=perfis&edit=1&user_id=${encodeURIComponent(
                                    member.user_id,
                                  )}&barbershop_id=${encodeURIComponent(member.barbershop_id)}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                              {/* ✅ botão vai para "tela" de confirmação via querystring */}
                              <form action={prepareDeleteMemberAndUser} className="inline-flex">
                                <input type="hidden" name="user_id" value={member.user_id} />
                                <input type="hidden" name="barbershop_id" value={member.barbershop_id} />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  aria-label="Excluir perfil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </form>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  </div>
  )
}

