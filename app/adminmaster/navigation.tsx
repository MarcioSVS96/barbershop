"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, LayoutDashboard, Menu, ShieldCheck, Store, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type NavigationProps = {
  activeTab: string
  shopCount: number
  activeShops: number
  profileCount: number
  mobile?: boolean
}

export function AdminMasterNavigation({ activeTab, shopCount, activeShops, profileCount, mobile }: NavigationProps) {
  const [open, setOpen] = useState(false)
  const items = [
    { tab: "visao-geral", label: "Visão geral", Icon: LayoutDashboard },
    { tab: "nova-barbearia", label: "Nova barbearia", Icon: Store },
    { tab: "nova-conta", label: "Novo perfil", Icon: UserPlus },
    { tab: "perfis", label: "Perfis", Icon: Users, count: profileCount },
    { tab: "barbearias-cadastradas", label: "Barbearias", Icon: Building2, count: `${activeShops}/${shopCount}` },
  ]
  const links = (
    <>
      <nav aria-label="Navegação do Admin Master" className="space-y-2 text-sm">
        {items.map(({ tab, label, Icon, count }) => (
          <Link
            key={tab}
            href={`/adminmaster?tab=${tab}`}
            aria-current={tab === activeTab ? "page" : undefined}
            onNavigate={() => {
              setOpen(false)
              window.scrollTo(0, 0)
            }}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 font-medium transition hover:bg-muted/50",
              tab === activeTab && "border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
            {count !== undefined ? <span className="ml-auto text-xs text-muted-foreground">{count}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="space-y-2 border-t pt-4">
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Ver site público</Link>
        </Button>
        <form action="/auth/logout" method="post">
          <Button type="submit" variant="outline" className="w-full">Sair</Button>
        </form>
      </div>
    </>
  )

  if (mobile) {
    return (
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-2 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="size-11" aria-label="Abrir menu do Admin Master">
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Admin Master</SheetTitle>
              <SheetDescription>Escolha uma área do painel.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">{links}</div>
          </SheetContent>
        </Sheet>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Admin Master</p>
          <p className="text-sm text-muted-foreground">{items.find(({ tab }) => tab === activeTab)?.label}</p>
        </div>
      </header>
    )
  }

  return (
    <aside className="sticky top-8 hidden flex-col gap-6 self-start rounded-2xl border bg-card/80 p-6 shadow-sm lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary">
          <ShieldCheck className="size-5 text-primary-foreground" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Master</p>
          <p className="text-lg font-semibold">Painel Geral</p>
        </div>
      </div>
      {links}
    </aside>
  )
}
