import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Plus,
  Scissors,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireMasterAdmin } from "@/lib/admin/master"
import { createAdminClient } from "@/lib/supabase/admin"
import { findUnlinkedAccounts, listAllAuthUsers } from "@/lib/admin/accounts"
import { DeleteProfileDialog } from "./delete-profile-dialog"
import { EditProfileDialog } from "./edit-profile-dialog"
import {
  ManageShopPanel,
  NewShopPanel,
  shopName,
  type AdminShop,
} from "./shop-panels"
import { NewAccessPanel } from "./new-access-panel"
import { deleteMemberAndUser } from "./actions"

export const dynamic = "force-dynamic"

const notices: Record<string, string> = {
  barbershop_updated: "Dados da barbearia atualizados.",
  barbershop_activated: "Barbearia ativada.",
  barbershop_deactivated: "Barbearia desativada.",
  barbershop_deleted: "Barbearia excluída.",
  user_created: "Acesso criado e vinculado à barbearia.",
  profile_updated: "Acesso atualizado.",
  profile_deleted: "Conta de acesso excluída.",
}

const primaryButton = "bg-slate-900 text-white shadow-none hover:bg-slate-800"

function Navigation({ access }: { access: boolean }) {
  const items = [
    {
      label: "Barbearias",
      href: "/adminmaster",
      Icon: Building2,
      active: !access,
    },
    {
      label: "Acessos",
      href: "/adminmaster?tab=acessos",
      Icon: KeyRound,
      active: access,
    },
  ]
  return (
    <aside className="flex flex-col bg-[#131c2c] text-white lg:sticky lg:top-0 lg:h-dvh">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-5 lg:py-7">
        <Link
          href="/adminmaster"
          className="flex min-w-0 items-center gap-3 rounded-md"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#dc2839]">
            <Scissors aria-hidden className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight">
              Agenda Barber
            </span>
            <span className="block text-[11px] text-slate-300">
              Admin Master
            </span>
          </span>
        </Link>
        <div className="flex items-center lg:hidden">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <Link href="/" aria-label="Site do Agenda Barber">
              <ArrowUpRight aria-hidden />
            </Link>
          </Button>
          <form action="/auth/logout" method="post">
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              aria-label="Sair"
              className="text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <LogOut aria-hidden />
            </Button>
          </form>
        </div>
      </div>
      <nav
        aria-label="Admin Master"
        className="flex gap-1.5 px-4 pb-3 sm:px-6 lg:flex-col lg:px-3 lg:pt-6"
      >
        {items.map(({ label, href, Icon, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${active ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto hidden border-t border-white/10 p-3 lg:block">
        <Link
          href="/"
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-white/8 hover:text-white"
        >
          Site do Agenda Barber <ArrowUpRight aria-hidden className="size-4" />
        </Link>
        <form action="/auth/logout" method="post">
          <Button
            variant="ghost"
            type="submit"
            className="w-full justify-start text-slate-300 hover:bg-white/8 hover:text-white"
          >
            <LogOut aria-hidden /> Sair
          </Button>
        </form>
      </div>
    </aside>
  )
}

function Notice({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
    >
      {error ? null : (
        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
      )}
      {children}
    </div>
  )
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
      <span className="mb-1 grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
        <Building2 aria-hidden className="size-5" />
      </span>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="max-w-sm text-sm text-slate-600">{text}</p>
    </div>
  )
}

function ShopStatus({ active }: { active: boolean }) {
  return (
    <Badge
      className={`gap-1.5 rounded-full px-2.5 font-medium ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${active ? "bg-emerald-600" : "bg-slate-500"}`}
      />
      {active ? "Ativa" : "Inativa"}
    </Badge>
  )
}

function AgendaLink({ slug }: { slug: string }) {
  return (
    <a
      href={`/${encodeURIComponent(slug)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-slate-700 hover:text-slate-950 hover:underline"
    >
      Abrir agenda <ArrowUpRight aria-hidden className="size-3.5" />
    </a>
  )
}

function AccessActions({
  url,
  edit,
  label,
}: {
  url: string
  edit?: boolean
  label: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Ações de ${label}`}
          className="text-slate-600"
        >
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {edit ? (
          <DropdownMenuItem asChild>
            <Link href={`${url}&edit=1`}>Editar acesso</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild className="text-red-700 focus:text-red-800">
          <Link href={`${url}&confirm=1`}>Excluir conta</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default async function AdminMasterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { user } = await requireMasterAdmin()
  const admin = createAdminClient()
  const params = await searchParams
  const param = (name: string) =>
    typeof params[name] === "string" ? params[name] : undefined
  const tab = param("tab")
  const access = tab === "acessos" || tab === "perfis" || tab === "nova-conta"
  const newPanel =
    param("novo") ||
    (tab === "nova-barbearia"
      ? "barbearia"
      : tab === "nova-conta"
        ? "acesso"
        : undefined)
  const [
    { data: shopsData, error: shopsError },
    { data: members, error: membersError },
  ] = await Promise.all([
    admin
      .from("barbershop_settings")
      .select("id, name, slug, description, whatsapp_phone, is_active")
      .order("name"),
    admin.from("barbershop_members").select("user_id, barbershop_id, role"),
  ])
  if (shopsError || membersError)
    console.error(
      "[adminmaster] load shops and accesses",
      shopsError || membersError,
    )

  const shops: AdminShop[] = shopsData || []
  const shopsById = new Map(shops.map((shop) => [shop.id, shop]))
  const memberCounts = new Map<string, number>()
  const shopsWithOwner = new Set<string>()
  for (const member of members || []) {
    memberCounts.set(
      member.barbershop_id,
      (memberCounts.get(member.barbershop_id) || 0) + 1,
    )
    if (member.role === "owner") shopsWithOwner.add(member.barbershop_id)
  }

  const selectedShop = shopsById.get(param("barbearia") || "")
  const manageShop = shopsById.get(param("gerenciar") || "")
  const onboarding = !!selectedShop && !access && param("etapa") === "2"
  const accessUrl = selectedShop
    ? `/adminmaster?tab=acessos&barbearia=${selectedShop.id}`
    : "/adminmaster?tab=acessos"
  const closeUrl = access ? accessUrl : "/adminmaster"

  const [usersResult, mastersResult] = access
    ? await Promise.all([
        listAllAuthUsers(admin).then(
          (users) => ({ users, error: null }),
          (error: unknown) => ({ users: [], error }),
        ),
        admin.from("master_admins").select("user_id"),
      ])
    : [
        { users: [], error: null },
        { data: [], error: null },
      ]
  const accessError =
    access &&
    !!(membersError || shopsError || usersResult.error || mastersResult.error)
  if (usersResult.error || mastersResult.error)
    console.error(
      "[adminmaster] load accounts",
      usersResult.error || mastersResult.error,
    )
  const userEmail = new Map(
    usersResult.users.map((account) => [account.id, account.email]),
  )
  const protectedIds = new Set([
    user.id,
    ...(mastersResult.data || []).map((master) => master.user_id),
  ])
  const unlinked =
    access && !accessError
      ? findUnlinkedAccounts(
          usersResult.users,
          members || [],
          mastersResult.data || [],
          user.id,
        )
      : []
  const targetId = param("user_id")
  const targetMember = members?.find(
    (member) =>
      member.user_id === targetId &&
      member.barbershop_id === param("barbershop_id"),
  )
  const targetUnlinked = unlinked.find((account) => account.id === targetId)
  const deleteScope = param("scope") === "unlinked" ? "unlinked" : "linked"
  const targetIsEditable =
    access && !accessError && targetId && !protectedIds.has(targetId)
  const confirmAccount =
    targetIsEditable &&
    param("confirm") === "1" &&
    (deleteScope === "linked" ? targetMember : targetUnlinked)
  const editAccount =
    targetIsEditable &&
    !confirmAccount &&
    param("edit") === "1" &&
    targetMember &&
    userEmail.get(targetId)
  const visibleMembers = (members || []).filter(
    (member) => !selectedShop || member.barbershop_id === selectedShop.id,
  )

  const activeCount = shops.filter((shop) => shop.is_active === true).length
  const inactiveCount = shops.length - activeCount
  const notice = notices[param("msg") || ""]
  const newUrl = access
    ? `${accessUrl}&novo=acesso`
    : "/adminmaster?novo=barbearia"

  return (
    <div className="min-h-dvh bg-[#f5f7fa] text-slate-950 lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <Navigation access={access} />
      <main className="min-w-0">
        <div className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-8 text-xs font-medium text-slate-600 lg:flex">
          <span>
            Painel administrativo{" "}
            <span aria-hidden className="px-1.5 text-slate-400">
              /
            </span>{" "}
            {access ? "Acessos" : "Barbearias"}
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-4" /> Admin Master
          </span>
        </div>
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight sm:text-[2.1rem]">
                {access ? "Acessos" : "Barbearias"}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {access
                  ? "Gerencie quem pode entrar no painel de cada barbearia."
                  : "Gerencie os cadastros e os endereços de agendamento."}
              </p>
            </div>
            {!shopsError && (!access || shops.length > 0) ? (
              <Button asChild className={primaryButton} size="lg">
                <Link href={newUrl} scroll={false}>
                  <Plus aria-hidden />{" "}
                  {access ? "Novo acesso" : "Nova barbearia"}
                </Link>
              </Button>
            ) : null}
          </header>

          {notice ? <Notice>{notice}</Notice> : null}
          {shopsError ? (
            <Notice error>
              Não foi possível carregar as barbearias. Atualize a página e tente
              novamente.
            </Notice>
          ) : null}

          {!access ? (
            <section
              aria-label="Barbearias cadastradas"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
                <h2 className="text-sm font-semibold">Unidades cadastradas</h2>
                {!shopsError && shops.length ? (
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-emerald-600"
                      />{" "}
                      {activeCount} {activeCount === 1 ? "ativa" : "ativas"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-slate-400"
                      />{" "}
                      {inactiveCount}{" "}
                      {inactiveCount === 1 ? "inativa" : "inativas"}
                    </span>
                  </div>
                ) : null}
              </div>
              {membersError ? (
                <div className="p-4">
                  <Notice error>
                    Não foi possível conferir os responsáveis das barbearias.
                  </Notice>
                </div>
              ) : null}
              {!shopsError && !shops.length ? (
                <EmptyState
                  title="Cadastre sua primeira barbearia"
                  text="Crie o endereço de agendamento e o acesso do responsável."
                />
              ) : null}
              {shops.length ? (
                <Table className="table-fixed">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-slate-200">
                      <TableHead className="px-4 text-xs text-slate-600 sm:px-5">
                        Barbearia
                      </TableHead>
                      <TableHead className="hidden w-28 px-3 text-xs text-slate-600 sm:table-cell">
                        Situação
                      </TableHead>
                      <TableHead className="hidden w-36 px-3 text-xs text-slate-600 md:table-cell">
                        Agenda
                      </TableHead>
                      <TableHead className="w-28 text-right text-xs text-slate-600 sm:w-36 sm:pr-5">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.map((shop) => {
                      const active = shop.is_active === true
                      const name = shopName(shop)
                      const initials = name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => Array.from(word)[0])
                        .join("")
                        .toUpperCase()
                      const needsOwner =
                        !membersError && !shopsWithOwner.has(shop.id)
                      return (
                        <TableRow
                          key={shop.id}
                          className="border-slate-100 hover:bg-slate-50/70"
                        >
                          <TableCell className="whitespace-normal px-4 py-4 sm:px-5">
                            <div className="flex min-w-0 items-start gap-3 sm:items-center">
                              <span
                                aria-hidden
                                className="hidden size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 sm:grid"
                              >
                                {initials}
                              </span>
                              <div className="min-w-0 space-y-1">
                                <p className="break-words font-semibold">
                                  {name}
                                </p>
                                {shop.slug ? (
                                  <p className="break-all text-xs text-slate-600">
                                    /{shop.slug}
                                  </p>
                                ) : null}
                                {needsOwner ? (
                                  <Link
                                    href={`/adminmaster?novo=acesso&barbearia=${shop.id}&etapa=2`}
                                    scroll={false}
                                    className="block text-xs font-medium text-amber-800 hover:underline"
                                  >
                                    Sem responsável · Criar acesso
                                  </Link>
                                ) : null}
                                <div className="pt-1 sm:hidden">
                                  <ShopStatus active={active} />
                                </div>
                                {active && shop.slug ? (
                                  <div className="pt-0.5 md:hidden">
                                    <AgendaLink slug={shop.slug} />
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden px-3 sm:table-cell">
                            <ShopStatus active={active} />
                          </TableCell>
                          <TableCell className="hidden px-3 md:table-cell">
                            {active && shop.slug ? (
                              <AgendaLink slug={shop.slug} />
                            ) : (
                              <span className="text-xs text-slate-500">
                                Indisponível
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="pr-3 text-right sm:pr-5">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="border-slate-200 shadow-none"
                            >
                              <Link
                                href={`/adminmaster?gerenciar=${shop.id}`}
                                aria-label={`Gerenciar ${name}`}
                                scroll={false}
                              >
                                Gerenciar{" "}
                                <ChevronRight
                                  aria-hidden
                                  className="hidden size-3.5 sm:block"
                                />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : null}
            </section>
          ) : (
            <>
              {selectedShop ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge
                    variant="secondary"
                    className="max-w-full whitespace-normal break-all bg-slate-200 text-slate-800"
                  >
                    {shopName(selectedShop)}
                  </Badge>
                  <Link
                    href="/adminmaster?tab=acessos"
                    className="text-xs font-medium text-slate-600 underline underline-offset-4"
                  >
                    Ver todas
                  </Link>
                </div>
              ) : null}
              {accessError ? (
                <Notice error>
                  Não foi possível conferir os acessos. Atualize a página para
                  tentar novamente.
                </Notice>
              ) : null}
              <section
                aria-label="Contas vinculadas"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <h2 className="border-b border-slate-200 px-4 py-4 text-sm font-semibold sm:px-5">
                  Contas vinculadas
                </h2>
                {!accessError && !visibleMembers.length ? (
                  <EmptyState
                    title="Nenhum acesso cadastrado"
                    text={
                      shops.length
                        ? "Crie uma conta para liberar o painel da barbearia."
                        : "Cadastre uma barbearia para criar seu primeiro acesso."
                    }
                  />
                ) : null}
                {visibleMembers.length ? (
                  <Table className="table-fixed">
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-slate-200">
                        <TableHead className="px-4 text-xs text-slate-600 sm:px-5">
                          Conta
                        </TableHead>
                        <TableHead className="hidden w-1/4 px-3 text-xs text-slate-600 md:table-cell">
                          Barbearia
                        </TableHead>
                        <TableHead className="hidden w-32 px-3 text-xs text-slate-600 sm:table-cell">
                          Função
                        </TableHead>
                        <TableHead className="w-16 text-right text-xs text-slate-600 sm:pr-5">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleMembers.map((member) => {
                        const shop = shopsById.get(member.barbershop_id)
                        const email =
                          userEmail.get(member.user_id) || "Conta sem e-mail"
                        const role =
                          member.role === "owner" ? "Responsável" : "Barbeiro"
                        const url = `${accessUrl}&user_id=${encodeURIComponent(member.user_id)}&barbershop_id=${encodeURIComponent(member.barbershop_id)}`
                        return (
                          <TableRow
                            key={`${member.user_id}-${member.barbershop_id}`}
                            className="border-slate-100 hover:bg-slate-50/70"
                          >
                            <TableCell className="whitespace-normal px-4 py-4 sm:px-5">
                              <p className="break-all font-medium">{email}</p>
                              <p className="mt-1 break-words text-xs text-slate-600 md:hidden">
                                {shop
                                  ? shopName(shop)
                                  : "Barbearia indisponível"}
                              </p>
                              <p className="mt-1 text-xs text-slate-600 sm:hidden">
                                {role}
                              </p>
                            </TableCell>
                            <TableCell className="hidden whitespace-normal break-words px-3 text-slate-600 md:table-cell">
                              {shop ? shopName(shop) : "Indisponível"}
                            </TableCell>
                            <TableCell className="hidden px-3 sm:table-cell">
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-700"
                              >
                                {role}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-3 text-right sm:pr-5">
                              {!accessError &&
                              !protectedIds.has(member.user_id) ? (
                                <AccessActions
                                  url={url}
                                  label={email}
                                  edit={!!userEmail.get(member.user_id)}
                                />
                              ) : null}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : null}
              </section>
              {unlinked.length > 0 && !selectedShop ? (
                <section
                  aria-labelledby="unlinked-heading"
                  className="overflow-hidden rounded-2xl border border-amber-200 bg-white"
                >
                  <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 sm:px-5">
                    <h2
                      id="unlinked-heading"
                      className="text-sm font-semibold text-amber-950"
                    >
                      Contas sem vínculo ({unlinked.length})
                    </h2>
                    <p className="mt-1 text-xs text-amber-900">
                      Confira as contas que ficaram sem barbearia associada.
                    </p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {unlinked.map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="break-all text-sm font-medium">
                            {account.email || "Conta sem e-mail"}
                          </p>
                          <p className="break-all text-xs text-slate-600">
                            {account.id}
                          </p>
                        </div>
                        <AccessActions
                          label={account.email || account.id}
                          url={`${accessUrl}&scope=unlinked&user_id=${encodeURIComponent(account.id)}`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>

      {!access && newPanel === "barbearia" ? <NewShopPanel /> : null}
      {newPanel === "acesso" && !shopsError && shops.length > 0 ? (
        <NewAccessPanel
          shops={shops}
          shop={selectedShop}
          onboarding={onboarding}
          closeUrl={closeUrl}
        />
      ) : null}
      {!access && !newPanel && manageShop ? (
        <ManageShopPanel
          shop={manageShop}
          memberCount={memberCounts.get(manageShop.id) || 0}
          accountsAvailable={!membersError}
          confirmDeletion={param("confirmar") === "exclusao"}
        />
      ) : null}
      {editAccount && targetMember && targetId ? (
        <EditProfileDialog
          userId={targetId}
          currentBarbershopId={targetMember.barbershop_id}
          email={editAccount}
          role={targetMember.role === "owner" ? "owner" : "staff"}
          shops={shops}
          onCloseUrl={accessUrl}
        />
      ) : null}
      {confirmAccount && targetId ? (
        <DeleteProfileDialog
          key={targetId}
          userId={targetId}
          email={userEmail.get(targetId) || targetId}
          barbershopId={
            deleteScope === "linked"
              ? targetMember?.barbershop_id || null
              : null
          }
          scope={deleteScope}
          onCloseUrl={accessUrl}
          action={deleteMemberAndUser}
        />
      ) : null}
    </div>
  )
}
