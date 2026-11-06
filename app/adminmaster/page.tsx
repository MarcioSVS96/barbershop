import Link from "next/link"
import {
  Store,
  UserPlus,
  Trash2,
  Pencil,
} from "lucide-react"
import { requireMasterAdmin } from "@/lib/admin/master"
import { createAdminClient } from "@/lib/supabase/admin"
import { findUnlinkedAccounts, listAllAuthUsers } from "@/lib/admin/accounts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createBarbershop,
  prepareDeleteMemberAndUser,
  deleteMemberAndUser,
  updateBarbershopUser,
} from "./actions"
import { BarbershopRow } from "./barbershop-row"
import { CreationMessage } from "./creation-message"
import { DeleteProfileDialog } from "./delete-profile-dialog"
import { EditProfileDialog } from "./edit-profile-dialog"
import { AdminMasterNavigation } from "./navigation"
import { NewProfileForm } from "./new-profile-form"

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
      return {
        title: "Email já cadastrado",
        description:
          "Já existe um usuário com esse email. Use outro email ou recupere a senha.",
      }
    case "invalid_role":
      return {
        title: "Perfil inválido",
        description: "Escolha owner ou staff.",
      }
    case "user_created":
      return {
        title: "Perfil criado",
        description: "Conta criada e vinculada com sucesso.",
      }
    case "user_created_whatsapp_failed":
      return {
        title: "Perfil criado",
        description: "Conta vinculada. Não foi possível salvar o WhatsApp da barbearia.",
      }
    case "barbershop_created":
      return {
        title: "Barbearia criada",
        description: "Barbearia cadastrada com sucesso.",
      }
    case "profile_deleted":
      return {
        title: "Conta excluída",
        description:
          "A conta de acesso e seus vínculos foram excluídos com sucesso.",
      }
    case "barbershop_has_accounts":
      return {
        title: "A barbearia possui contas",
        description:
          "Exclua as contas na aba Perfis antes de remover a barbearia. Isso evita deixar contas de acesso sem vínculo.",
      }
    case "slug_exists":
      return {
        title: "Slug já cadastrado",
        description: "Use outro slug ou ajuste o nome da barbearia.",
      }
    case "profile_updated":
      return {
        title: "Perfil atualizado",
        description: "As alterações foram salvas com sucesso.",
      }
    case "profile_exists":
      return {
        title: "Perfil já existe",
        description: "Esse usuário já está vinculado a essa barbearia.",
      }
    case "profile_update_missing_fields":
      return {
        title: "Dados incompletos",
        description: "Preencha email, barbearia e perfil.",
      }
    case "profile_update_not_found":
      return {
        title: "Perfil não encontrado",
        description: "Não foi possível localizar o perfil para atualizar.",
      }
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
    scope?: string
  }>
}) {
  const { user } = await requireMasterAdmin()
  const admin = createAdminClient()

  const resolved = (await searchParams) || {}
  const msgCode = resolved.msg ?? null
  const tabParam = resolved.tab ?? "visao-geral"
  const allowedTabs = new Set([
    "visao-geral",
    "nova-barbearia",
    "nova-conta",
    "barbearias-cadastradas",
    "perfis",
  ])
  const activeTab = allowedTabs.has(tabParam) ? tabParam : "visao-geral"
  const msg = messageFromCode(msgCode)
  const overlayPerfisCodes = new Set([
    "user_created",
    "user_created_whatsapp_failed",
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
    (activeTab === "perfis" && !!msgCode && overlayPerfisCodes.has(msgCode)) ||
    (activeTab === "barbearias-cadastradas" &&
      msgCode === "barbershop_has_accounts")
  const editUserId = resolved.user_id ?? null
  const editBarbershopId = resolved.barbershop_id ?? null
  const showEditDialog =
    resolved.edit === "1" &&
    activeTab === "perfis" &&
    editUserId &&
    editBarbershopId

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
    memberCount.set(
      row.barbershop_id,
      (memberCount.get(row.barbershop_id) || 0) + 1,
    )
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
  const activeShops = shopsList.filter(
    (shop) => shop.is_active !== false,
  ).length
  const totalMembers = members?.length ?? 0

  let authUsers: Awaited<ReturnType<typeof listAllAuthUsers>> = []
  let userListError: unknown = null
  try {
    authUsers = await listAllAuthUsers(admin)
  } catch (error) {
    userListError = error
    console.error("[adminmaster] usersError:", error)
  }
  const { data: masterAccounts, error: masterAccountsError } = await admin
    .from("master_admins")
    .select("user_id")
  if (masterAccountsError)
    console.error("[adminmaster] masterAccountsError:", masterAccountsError)
  const unlinkedAccounts = userListError
    ? []
    : findUnlinkedAccounts(
        authUsers,
        membersError ? null : membersList,
        masterAccountsError ? null : masterAccounts || [],
        user.id,
      )
  const protectedAccountIds = new Set([
    user.id,
    ...(masterAccounts || []).map((row) => row.user_id),
  ])
  const userEmailById = new Map<string, string>()
  for (const u of authUsers) {
    if (u.id && u.email) userEmailById.set(u.id, u.email)
  }

  const shopsById = new Map<string, ShopRow>()
  for (const shop of shopsList) {
    shopsById.set(shop.id, shop)
  }

  const editMember =
    showEditDialog && editUserId && editBarbershopId
      ? membersList.find(
          (member) =>
            member.user_id === editUserId &&
            member.barbershop_id === editBarbershopId,
        )
      : null
  const editEmail = editUserId
    ? userEmailById.get(editUserId) || editUserId
    : ""
  const editRole = editMember?.role ?? "owner"

  const confirmationScope =
    resolved.scope === "unlinked" ? "unlinked" : "linked"
  const confirmationMember = membersList.find(
    (member) =>
      member.user_id === resolved.user_id &&
      member.barbershop_id === resolved.barbershop_id,
  )
  const confirmationUnlinkedAccount = unlinkedAccounts.find(
    (account) => account.id === resolved.user_id,
  )
  const canConfirmDeletion =
    activeTab === "perfis" &&
    resolved.confirm === "1" &&
    resolved.user_id &&
    !protectedAccountIds.has(resolved.user_id) &&
    (confirmationScope === "unlinked"
      ? !!confirmationUnlinkedAccount
      : !!confirmationMember)

  const navigation = { activeTab, activeShops, shopCount: shopsList.length, profileCount: membersList.length }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_55%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.2))]">
      <AdminMasterNavigation {...navigation} mobile />
      <div className="mx-auto grid max-w-screen-2xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-8">
        <AdminMasterNavigation {...navigation} />

        <main className="min-w-0 space-y-8">
          {showOverlayMessage && msg ? (
            <CreationMessage title={msg.title} description={msg.description} />
          ) : null}
          <section
            className={activeTab === "visao-geral" ? "space-y-4" : "hidden"}
          >
            <header
              id="visao-geral"
              className="rounded-2xl border bg-card/80 p-6 shadow-sm"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Admin Master
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Controle central das barbearias, equipes e acessos.
                  </p>
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
                <div className="text-xs text-muted-foreground">
                  Barbearias cadastradas
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {shopsList.length}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {activeShops} ativas
                </div>
              </div>
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">
                  Contas vinculadas
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {totalMembers}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  owners + staff
                </div>
              </div>
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">Barbeiros</div>
                <div className="mt-2 text-2xl font-semibold">
                  {barbersList.length}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  cadastrados
                </div>
              </div>
              <div className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">
                  Atualizacoes
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {shopsList.filter((shop) => shop.updated_at).length}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  barbearias com edicao recente
                </div>
              </div>
            </div>
          </section>

          {msg &&
          !showOverlayMessage &&
          (activeTab === "nova-barbearia" || activeTab === "nova-conta") ? (
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="text-sm font-medium">{msg.title}</div>
              <div className="text-xs text-muted-foreground">
                {msg.description}
              </div>
            </div>
          ) : null}

          {activeTab === "nova-barbearia" ? (
            <Card id="nova-barbearia" className="max-w-2xl border-muted/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-muted-foreground" />
                  Nova barbearia
                </CardTitle>
                <CardDescription>
                  Cadastre uma barbearia com slug e descrição.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createBarbershop} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Barbearia Premium"
                      required
                      className="h-9 w-full sm:max-w-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      name="slug"
                      placeholder="barbearia-premium"
                      className="h-9 w-full sm:max-w-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se vazio, o slug será gerado automaticamente.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      placeholder="Serviços de alto padrão."
                      className="min-h-18"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked
                      className="h-4 w-4"
                    />
                    Barbearia ativa
                  </label>

                  <Button type="submit">Cadastrar barbearia</Button>
                </form>
              </CardContent>
            </Card>

          ) : null}

          {activeTab === "nova-conta" ? (
            <Card id="nova-conta" className="max-w-2xl border-muted/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                  Criar perfil da barbearia
                </CardTitle>
                <CardDescription>
                  Cadastre o barbeiro e crie o acesso dele à barbearia em uma etapa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NewProfileForm shops={shopsList.map(({ id, name, slug }) => ({ id, name, slug }))} />
              </CardContent>
            </Card>
          ) : null}

          <Card
            id="barbearias-cadastradas"
            className={`border-muted/60 ${activeTab === "barbearias-cadastradas" ? "" : "hidden"}`}
          >
            <CardHeader>
              <CardTitle>Barbearias cadastradas</CardTitle>
              <CardDescription>
                Edite, desative ou remova barbearias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="overflow-hidden rounded-2xl border bg-card/70 shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Barbearia
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Slug
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Contas
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Barbeiros
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Ações
                        </TableHead>
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

          <Card
            id="perfis"
            className={`border-muted/60 ${activeTab === "perfis" ? "" : "hidden"}`}
          >
            <CardHeader>
              <CardTitle>Perfis das barbearias</CardTitle>
              <CardDescription>
                Owners e staff vinculados a cada barbearia.
              </CardDescription>
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
              {canConfirmDeletion ? (
                <DeleteProfileDialog
                  userId={String(resolved.user_id)}
                  email={
                    userEmailById.get(String(resolved.user_id)) ||
                    String(resolved.user_id)
                  }
                  barbershopId={
                    confirmationScope === "linked"
                      ? String(resolved.barbershop_id)
                      : null
                  }
                  scope={confirmationScope}
                  onCloseUrl="/adminmaster?tab=perfis"
                  action={deleteMemberAndUser}
                />
              ) : null}
              {membersError || userListError ? (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 p-3 text-sm text-destructive"
                >
                  Não foi possível carregar todas as contas e vínculos. Atualize
                  a página antes de gerenciar os perfis.
                </p>
              ) : null}

              {membersList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum perfil cadastrado ainda.
                </p>
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
                        const email =
                          userEmailById.get(member.user_id) || member.user_id
                        const barberName = member.barber_id
                          ? barbersById.get(member.barber_id)
                          : null

                        const barberLabel =
                          barberName || (member.role === "owner" ? "Administrador" : "Barbeiro não vinculado")

                        return (
                          <TableRow
                            key={`${member.user_id}-${member.barbershop_id}`}
                            className="transition hover:bg-muted/40"
                          >
                            <TableCell>
                              <div className="text-sm font-medium">
                                {shop?.name ||
                                  shop?.slug ||
                                  member.barbershop_id}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                /{shop?.slug || "-"}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-sm font-medium">{email}</div>
                            </TableCell>

                            <TableCell>
                              {member.role === "owner" ? (
                                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  Owner
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                  Staff
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className="text-sm font-medium">
                                {barberLabel}
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label="Editar perfil"
                                >
                                  <Link
                                    href={`/adminmaster?tab=perfis&edit=1&user_id=${encodeURIComponent(
                                      member.user_id,
                                    )}&barbershop_id=${encodeURIComponent(member.barbershop_id)}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                                {/* ✅ botão vai para "tela" de confirmação via querystring */}
                                <form
                                  action={prepareDeleteMemberAndUser}
                                  className="inline-flex"
                                >
                                  <input
                                    type="hidden"
                                    name="user_id"
                                    value={member.user_id}
                                  />
                                  <input
                                    type="hidden"
                                    name="barbershop_id"
                                    value={member.barbershop_id}
                                  />
                                  <Button
                                    type="submit"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    aria-label="Excluir perfil"
                                    disabled={protectedAccountIds.has(
                                      member.user_id,
                                    )}
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
              <section
                aria-labelledby="unlinked-accounts-title"
                className="space-y-4 border-t pt-6"
              >
                <div>
                  <h3
                    id="unlinked-accounts-title"
                    className="text-lg font-semibold"
                  >
                    Contas sem vínculo ({unlinkedAccounts.length})
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estas contas ainda existem no Supabase Auth, mas não estão
                    vinculadas a uma barbearia. Confira o e-mail antes de
                    excluir. Nenhuma conta é removida automaticamente.
                  </p>
                </div>
                {membersError || userListError || masterAccountsError ? (
                  <p role="alert" className="text-sm text-destructive">
                    Não foi possível conferir com segurança as contas sem
                    vínculo. Tente atualizar a página.
                  </p>
                ) : unlinkedAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conta sem vínculo encontrada.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Criada em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unlinkedAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>
                              <div className="font-medium">
                                {account.email || "Conta sem e-mail"}
                              </div>
                              <div className="break-all text-xs text-muted-foreground">
                                {account.id}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(account.created_at).toLocaleDateString(
                                "pt-BR",
                                { timeZone: "America/Fortaleza" },
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <form action={prepareDeleteMemberAndUser}>
                                <input
                                  type="hidden"
                                  name="user_id"
                                  value={account.id}
                                />
                                <input
                                  type="hidden"
                                  name="scope"
                                  value="unlinked"
                                />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir conta
                                </Button>
                              </form>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
