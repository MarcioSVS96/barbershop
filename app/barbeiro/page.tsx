import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/dashboard-stats"
import { AppointmentsList } from "@/components/appointments-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LogOut,
  Scissors,
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  Clock,
  DollarSign,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ServiceManagement } from "@/components/service-management"
import { AvailabilityManagement } from "@/components/availability-management"
import { BarbershopManagement } from "@/components/barbershop-management"
import { ProfileManagement } from "@/components/profile-management"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { BarbershopSettings } from "@/lib/types"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Get today's date
  const today = new Date().toISOString().split("T")[0]

  // Fetch appointments with related data
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `
      *,
      clients(*),
      barbers(*),
      services(*)
    `,
    )
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })

  const { data: payments } = await supabase
    .from("payments")
    .select("*, appointments(*)")
    .order("payment_date", { ascending: false })

  const { data: services } = await supabase.from("services").select("*").order("name", { ascending: true })

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .order("day_of_week", { ascending: true })

  const { data: barbers } = await supabase.from("barbers").select("*").order("name", { ascending: true })

  // ✅ NOVO: buscar configurações da barbearia (1 registro)
  let settings: BarbershopSettings | null = null
  try {
    const { data: settingsRows } = await supabase
      .from("barbershop_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)

    settings = (settingsRows?.[0] as BarbershopSettings) ?? null
  } catch {
    // se a tabela ainda não existir, não quebra o dashboard
    settings = null
  }

  // Calculate stats
  const todayAppointments = appointments?.filter((apt) => apt.appointment_date === today) || []
  const pendingAppointments = appointments?.filter((apt) => apt.status === "pending") || []

  const todayRevenue =
    payments
      ?.filter((payment) => payment.appointments?.appointment_date === today)
      .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyRevenue =
    payments
      ?.filter((payment) => payment.appointments?.appointment_date.startsWith(currentMonth))
      .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-4">
          <div className="flex w-full items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>

            <div>
              <h1 className="text-xl font-bold">Painel do Barbeiro</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            {/* botão sair: empurrado para o canto direito */}
            <form action="/auth/logout" method="post" className="ml-auto">
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>

          <div className="flex items-center gap-2 mt-3 md:mt-0">
            <Button variant="outline" asChild>
              <Link href="/">Ver site público</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="mt-2">
          {/* 
            Mobile: mostra ícones; texto aparece só na aba ativa (ao lado do ícone).
            Desktop (md+): mostra texto sempre, layout em grid 6 colunas.
          */}
          <TabsList className="flex w-full items-center justify-between gap-1 md:grid md:grid-cols-6 md:gap-2">
            <TabsTrigger value="overview" className="group flex items-center gap-2 px-3 md:px-4">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline group-data-[state=active]:inline">Visão geral</span>
            </TabsTrigger>

            <TabsTrigger value="appointments" className="group flex items-center gap-2 px-3 md:px-4">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden md:inline group-data-[state=active]:inline">Agendamentos</span>
            </TabsTrigger>

            <TabsTrigger value="services" className="group flex items-center gap-2 px-3 md:px-4">
              <Briefcase className="h-4 w-4" />
              <span className="hidden md:inline group-data-[state=active]:inline">Serviços</span>
            </TabsTrigger>

            <TabsTrigger value="availability" className="group flex items-center gap-2 px-3 md:px-4">
              <Clock className="h-4 w-4" />
              <span className="hidden md:inline group-data-[state=active]:inline">Horários</span>
            </TabsTrigger>

            <TabsTrigger value="financial" className="group flex items-center gap-2 px-3 md:px-4">
              <DollarSign className="h-4 w-4" />
              <span className="hidden md:inline group-data-[state=active]:inline">Financeiro</span>
            </TabsTrigger>

            {/* ✅ NOVO: Perfil */}
            <TabsTrigger value="profile" className="group flex items-center gap-2 px-3 md:px-4">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline group-data-[state=active]:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <DashboardStats
              todayAppointments={todayAppointments.length}
              pendingAppointments={pendingAppointments.length}
              todayRevenue={todayRevenue}
              monthlyRevenue={monthlyRevenue}
            />
          </TabsContent>

          <TabsContent value="appointments" className="mt-6">
            <AppointmentsList appointments={appointments || []} />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <ServiceManagement services={services || []} />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <AvailabilityManagement availability={availability || []} />
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            <BarbershopManagement barbers={barbers || []} payments={payments || []} today={today} />
          </TabsContent>

          {/* ✅ NOVO: Conteúdo Perfil (placeholder controlado) */}
          <TabsContent value="profile" className="mt-6">
            <ProfileManagement settings={settings} barbers={barbers || []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
