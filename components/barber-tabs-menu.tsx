"use client"

import Link from "next/link"
import { Menu, LayoutDashboard, CalendarDays, Briefcase, Clock, DollarSign, Settings, LogOut } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type BarberTabsMenuProps = {
  slug: string
}

export function BarberTabsMenu({ slug }: BarberTabsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Menu</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <TabsList className="flex h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0.5">
            <DropdownMenuItem asChild>
              <TabsTrigger
                value="overview"
                className="h-9 w-full justify-start border-0 px-2 py-1.5 text-sm font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <LayoutDashboard className="h-4 w-4" />
                Visão geral
              </TabsTrigger>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TabsTrigger
                value="appointments"
                className="h-9 w-full justify-start border-0 px-2 py-1.5 text-sm font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <CalendarDays className="h-4 w-4" />
                Agendamentos
              </TabsTrigger>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TabsTrigger
                value="services"
                className="h-9 w-full justify-start border-0 px-2 py-1.5 text-sm font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <Briefcase className="h-4 w-4" />
                Serviços
              </TabsTrigger>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TabsTrigger
                value="availability"
                className="h-9 w-full justify-start border-0 px-2 py-1.5 text-sm font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <Clock className="h-4 w-4" />
                Horários
              </TabsTrigger>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TabsTrigger
                value="financial"
                className="h-9 w-full justify-start border-0 px-2 py-1.5 text-sm font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <DollarSign className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TabsTrigger
                value="profile"
                className="h-9 w-full justify-start border-0 px-2 py-1.5 text-sm font-normal data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <Settings className="h-4 w-4" />
                Perfil
              </TabsTrigger>
            </DropdownMenuItem>
          </TabsList>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${slug}`} className="w-full">
            Ver site público
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild data-variant="destructive">
          <form action="/auth/logout" method="post" className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
