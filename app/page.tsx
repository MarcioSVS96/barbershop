import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  LineChart,
  Scissors,
  ShieldCheck,
  Smartphone,
  Users,
  Sparkles,
  MessageCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RootPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff3131] text-white">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Agenda Barber</div>
              <div className="text-xs text-muted-foreground">Sistema de agendamento</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground sm:flex">
            <Link className="hover:text-foreground" href="#solucoes">
              Soluções
            </Link>
            <Link className="hover:text-foreground" href="#depoimentos">
              Depoimentos
            </Link>
            <Link className="hover:text-foreground" href="#faq">
              Dúvidas
            </Link>
            <Link className="hover:text-foreground" href="#cta">
              Começar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        {/* HERO */}
        <section id="hero" className="relative grid min-h-screen items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          {/* blobs */}
          <div className="pointer-events-none absolute -top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#ff3131]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />

          <div className="relative space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Escolha um sistema completo para{" "}
              <span className="text-[#ff3131]">organizar a agenda</span> da sua barbearia.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Chega de caderninho, confusão de horários e cliente sumindo. Com a Agenda Barber,
              o cliente agenda em segundos e você controla equipe, disponibilidade e serviços em um só lugar.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[#ff3131] text-white hover:bg-[#ff3131]"
              >
                <Link href="/agenda">
                  Teste grátis na prática
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/login">Sou barbeiro / admin</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Tabs like "Soluções" */}
        <section id="solucoes" className="min-h-screen py-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight">
                Dê adeus à comanda de papel na sua barbearia
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Divida o foco: o cliente agenda, o barbeiro atende e você acompanha o negócio.
                Tudo fica registrado, organizado e fácil de acessar. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dolore, molestiae esse obcaecati ipsa itaque eaque, debitis nemo alias est quas placeat libero, aliquid facere enim aspernatur velit excepturi sit repellat.
              </p>
            </div>

            <Tabs defaultValue="agenda" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
                <TabsTrigger value="gestao">Gestão</TabsTrigger>
              </TabsList>

              <TabsContent value="agenda" className="mt-4 min-h-80 md:min-h-60">
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff3131]/10">
                      <CalendarCheck className="h-6 w-6 text-[#ff3131]" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Agenda clara e rápida</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Visualize horários por barbeiro, bloqueios e disponibilidade automática.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {[
                          "Horários configuráveis por dia",
                          "Pausas e bloqueios rápidos",
                          "Cliente remarca/cancela com autonomia",
                        ].map((x) => (
                          <li key={x} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#ff3131]" />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="clientes" className="mt-4 min-h-80 md:min-h-60">
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff3131]/10">
                      <Users className="h-6 w-6 text-[#ff3131]" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Fidelize com histórico</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Saiba quem volta, o que faz e quais serviços vendem mais.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {[
                          "Histórico de serviços e frequência",
                          "Atendimento mais pessoal",
                          "Melhor taxa de retorno",
                        ].map((x) => (
                          <li key={x} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#ff3131]" />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="gestao" className="mt-4 min-h-80 md:min-h-60">
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff3131]/10">
                      <LineChart className="h-6 w-6 text-[#ff3131]" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Gestão para crescer</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tenha visão do que acontece na barbearia e organize sua operação.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {[
                          "Serviços e preços centralizados",
                          "Performance por barbeiro",
                          "Organização que reduz retrabalho",
                        ].map((x) => (
                          <li key={x} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#ff3131]" />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Agendamento online",
                desc: "Cliente marca sozinho. Você só confirma e atende.",
                icon: <Smartphone className="h-5 w-5 text-[#ff3131]" />,
              },
              {
                title: "Menos faltas",
                desc: "Organização + clareza de horários reduz furo.",
                icon: <ShieldCheck className="h-5 w-5 text-[#ff3131]" />,
              },
              {
                title: "Gestão e relatórios",
                desc: "Saiba o que vende mais e tome decisões rápidas.",
                icon: <LineChart className="h-5 w-5 text-[#ff3131]" />,
              },
            ].map((f) => (
              <div key={f.title} className="rounded-3xl border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff3131]/10">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-base font-semibold">{f.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials 
        <section id="depoimentos" className="min-h-screen py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Depoimentos</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                O que barbearias ganham quando a agenda vira um sistema.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                quote:
                  "Antes eu perdia tempo respondendo mensagem. Agora o cliente agenda sozinho e eu só atendo.",
                name: "Lucas Caval",
                role: "Caval Barber Shop",
              },
              {
                quote:
                  "A organização dos horários reduziu faltas e melhorou a rotina da equipe. Ficou bem mais profissional.",
                name: "Rafael Lima",
                role: "Barbearia Central",
              },
              {
                quote:
                  "Consegui entender quais serviços vendem mais e ajustar preços. Ajuda muito na gestão.",
                name: "Thagner Ramos",
                role: "Cliente (exemplo)",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-3xl border bg-card p-6 shadow-sm">
                <div className="text-sm text-muted-foreground">“{t.quote}”</div>
                <div className="mt-4 text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            ))}
          </div>
        </section> */}

        {/* FAQ */}
        <section id="faq" className="min-h-screen py-12">
          <div className="grid place-items-center gap-8 lg:grid-cols-2 lg:items-center lg:justify-items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Tire todas as suas dúvidas</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Respostas diretas, sem enrolação.
              </p>

              <div className="mt-6 rounded-3xl border bg-[#ff3131] p-7 text-white">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold">
                      Quer ver funcionando em 30 segundos?
                    </div>
                    <div className="mt-1 text-sm text-white/85">
                      Abra a agenda pública e teste como o cliente agendaria.
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="mt-4 bg-lime-400 text-black hover:bg-lime-300"
                    >
                      <Link href="/agenda">Abrir agenda</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Accordion
              type="single"
              collapsible
              className="flex min-h-[45vh] w-full flex-col justify-center"
            >
              {[
                {
                  q: "Como funciona o agendamento online?",
                  a: "O cliente escolhe serviço, data e horário disponível. O sistema respeita a disponibilidade, pausas e regras do barbeiro.",
                },
                {
                  q: "O cliente consegue remarcar ou cancelar?",
                  a: "Sim. Você pode definir regras e permitir que ele remarque/cancele dentro de um prazo.",
                },
                {
                  q: "Dá para ter mais de um barbeiro?",
                  a: "Sim. Cada barbeiro pode ter horários diferentes, pausas e serviços próprios (ou compartilhados).",
                },
                {
                  q: "Posso usar no celular?",
                  a: "Sim. A interface é responsiva e funciona bem no celular para clientes e barbeiros.",
                },
                {
                  q: "O sistema mostra relatórios?",
                  a: "Você pode acompanhar histórico, recorrência e visão da operação. Relatórios mais avançados podem evoluir conforme a versão.",
                },
              ].map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section id="cta" className="min-h-screen py-14">
          <div className="rounded-4xl border bg-linear-to-br from-[#ff3131]/10 via-background to-lime-400/10 p-10 shadow-sm">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h3 className="text-3xl font-bold tracking-tight">
                  Pronto para digitalizar sua barbearia?
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Mostre profissionalismo, aumente a taxa de retorno e tenha controle total do seu negócio com uma plataforma feita para barbearias.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#ff3131] text-white hover:bg-[#ff3131]"
                  >
                    <Link href="/agenda">
                      Ver agenda pública
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/auth/login">Acessar painel</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border bg-card p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: <CalendarCheck className="h-5 w-5 text-[#ff3131]" />, t: "Agenda 24/7", d: "Cliente agenda sozinho." },
                    { icon: <Clock className="h-5 w-5 text-[#ff3131]" />, t: "Horários reais", d: "Sem conflitos de agenda." },
                    { icon: <Users className="h-5 w-5 text-[#ff3131]" />, t: "Clientes", d: "Histórico e fidelização." },
                    { icon: <ShieldCheck className="h-5 w-5 text-[#ff3131]" />, t: "Organização", d: "Gestão mais profissional." },
                  ].map((x) => (
                    <div key={x.t} className="rounded-2xl border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff3131]/10">
                          {x.icon}
                        </div>
                        <div className="leading-tight">
                          <div className="text-sm font-semibold">{x.t}</div>
                          <div className="text-xs text-muted-foreground">{x.d}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff3131] text-white">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">Agenda Barber</div>
              <div className="text-sm text-muted-foreground">
                Sistema de agendamento para barbearias com foco em organização e vendas.
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>© {new Date().getFullYear()} Agenda Barber</span>
                <span>Todos os direitos reservados.</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold">Navegação</div>
              <nav className="mt-3 flex flex-col gap-2 text-sm">
                <Link className="text-muted-foreground hover:text-foreground" href="#solucoes">
                  Soluções
                </Link>
                <Link className="text-muted-foreground hover:text-foreground" href="#depoimentos">
                  Depoimentos
                </Link>
                <Link className="text-muted-foreground hover:text-foreground" href="#faq">
                  Dúvidas
                </Link>
                <Link className="text-muted-foreground hover:text-foreground" href="#cta">
                  Começar
                </Link>
              </nav>
            </div>

            <div>
              <div className="text-sm font-semibold">Acesso rápido</div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link className="text-muted-foreground hover:text-foreground" href="/agenda">
                  Agenda pública
                </Link>
                <Link className="text-muted-foreground hover:text-foreground" href="/auth/login">
                  Área administrativa
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
