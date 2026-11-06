"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Building2, KeyRound, LogOut, Menu, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function AdminMasterNavigation({ access }: { access: boolean }) {
  const [open, setOpen] = useState(false)
  const items = [
    { label: "Barbearias", href: "/adminmaster", Icon: Building2, active: !access },
    { label: "Acessos", href: "/adminmaster?tab=acessos", Icon: KeyRound, active: access },
  ]
  const navigation = (
    <nav aria-label="Admin Master" className="space-y-1.5">
      {items.map(({ label, href, Icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          onNavigate={() => {
            setOpen(false)
            window.scrollTo(0, 0)
          }}
          className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-white ${active ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )
  const accountLinks = (
    <div className="space-y-1 border-t border-white/10 p-3">
      <Link
        href="/"
        className="flex min-h-11 items-center justify-between rounded-lg px-3 text-xs text-slate-300 hover:bg-white/8 hover:text-white"
      >
        Site do Agenda Barber <ArrowUpRight aria-hidden className="size-4" />
      </Link>
      <form action="/auth/logout" method="post">
        <Button variant="ghost" type="submit" className="min-h-11 w-full justify-start text-slate-300 hover:bg-white/8 hover:text-white">
          <LogOut aria-hidden /> Sair
        </Button>
      </form>
    </div>
  )

  return (
    <aside className="sticky top-0 z-30 flex flex-col bg-[#131c2c] text-white lg:h-dvh">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-5 lg:py-7">
        <Link href="/adminmaster" className="flex min-w-0 items-center gap-3 rounded-md">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#dc2839]">
            <Scissors aria-hidden className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">Agenda Barber</span>
            <span className="block text-[11px] text-slate-300">Admin Master</span>
          </span>
        </Link>
        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 text-white hover:bg-white/10 hover:text-white" aria-label="Abrir menu do Admin Master">
                <Menu aria-hidden className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto border-white/10 bg-[#131c2c] text-white">
              <SheetHeader>
                <SheetTitle className="text-white">Admin Master</SheetTitle>
                <SheetDescription className="text-slate-300">Escolha uma área do painel.</SheetDescription>
              </SheetHeader>
              <div className="px-3">{navigation}</div>
              {accountLinks}
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="hidden px-3 pt-6 lg:block">{navigation}</div>
      <div className="mt-auto hidden lg:block">{accountLinks}</div>
    </aside>
  )
}
