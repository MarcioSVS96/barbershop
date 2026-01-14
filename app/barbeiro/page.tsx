import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/dashboard-stats"
import { AppointmentsList } from "@/components/appointments-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ServiceManagement } from "@/components/service-management"
import { AvailabilityManagement } from "@/components/availability-management"
import { BarbershopManagement } from "@/components/barbershop-management"

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
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Painel do Barbeiro</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Ver site público</Link>
            </Button>
            <form action="/auth/logout" method="post">
              <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DashboardStats
          todayAppointments={todayAppointments.length}
          pendingAppointments={pendingAppointments.length}
          todayRevenue={todayRevenue}
          monthlyRevenue={monthlyRevenue}
        />

        <Tabs defaultValue="appointments" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="availability">Horários</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          </TabsList>

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
            <div className="mb-4 rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold">Relatório Financeiro</h3>
            </div>
            <BarbershopManagement barbers={barbers || []} payments={payments || []} today={today} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
