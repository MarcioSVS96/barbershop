import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  MessageCircle,
  Scissors,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react"
import { BookingDemo } from "@/components/marketing/booking-demo"
import {
  BookingPreview,
  ProfilePreview,
} from "@/components/marketing/product-previews"
import styles from "./marketing.module.css"

const contactUrl = "https://www.instagram.com/marciosaantos/"
const description =
  "Uma página de agendamento com a identidade da sua barbearia. Organize serviços, profissionais, horários e acompanhe os recebimentos no Agenda Barber."

export const metadata: Metadata = {
  title: "Agendamento online e gestão para barbearias",
  description,
  openGraph: {
    title: "Agenda Barber | Sua barbearia, mais organizada",
    description,
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary", title: "Agenda Barber", description },
}

const features = [
  {
    icon: CalendarCheck,
    title: "Agendamentos em um só lugar",
    text: "Acompanhe os horários marcados e gerencie o status de cada atendimento pelo painel.",
  },
  {
    icon: Clock3,
    title: "Uma agenda que acompanha sua rotina",
    text: "Configure dias de atendimento, horários disponíveis e pausas da equipe.",
  },
  {
    icon: Users,
    title: "Serviços e profissionais organizados",
    text: "Cadastre sua equipe, os serviços oferecidos, os preços e a duração de cada atendimento.",
  },
  {
    icon: Wallet,
    title: "Visibilidade dos recebimentos",
    text: "Consulte os pagamentos registrados e acompanhe a receita por período e por profissional.",
  },
]
const steps = [
  {
    number: "01",
    title: "Conheça o sistema",
    text: "Converse com Marcio, criador do Agenda Barber, e veja como ele se encaixa na sua rotina.",
  },
  {
    number: "02",
    title: "Prepare sua barbearia",
    text: "Após o cadastro, configure seus serviços, profissionais, horários e a identidade da sua página.",
  },
  {
    number: "03",
    title: "Compartilhe seu link",
    text: "Coloque o link no Instagram e envie pelo WhatsApp para seus clientes agendarem.",
  },
]
const questions = [
  {
    q: "Como meus clientes fazem o agendamento?",
    a: "Pela página da sua barbearia. O cliente informa nome e telefone e escolhe serviço, profissional, data e um horário disponível. Você acompanha o agendamento pelo painel.",
  },
  {
    q: "A página fica com o nome da minha barbearia?",
    a: "Sim. Cada barbearia cadastrada tem seu próprio endereço no sistema. Pelo painel, você pode configurar nome, descrição, logo e imagem de fundo da página.",
  },
  {
    q: "Posso cadastrar mais de um profissional?",
    a: "Sim. O sistema permite gerenciar profissionais da equipe e configurar a disponibilidade de atendimento. Na apresentação, podemos conversar sobre a estrutura da sua barbearia.",
  },
  {
    q: "Preciso instalar um aplicativo?",
    a: "O acesso é pelo navegador, tanto para a página de agendamento quanto para o painel. Você pode acessar pelo celular ou computador com conexão à internet.",
  },
  {
    q: "O que consigo acompanhar no financeiro?",
    a: "Os pagamentos registrados no sistema, com consulta por período e por profissional. Esses valores dependem dos registros feitos no painel; não representam, por si só, uma apuração contábil de lucro.",
  },
  {
    q: "Quanto custa e como começo?",
    a: "Solicite uma apresentação para conhecer o sistema e consultar os valores, o que está incluído e as condições de contratação antes de começar.",
  },
  {
    q: "Essa demonstração cria agendamentos de verdade?",
    a: "Não. A demonstração desta página é uma simulação com dados fictícios. Ela não solicita seus dados pessoais nem faz reservas em uma barbearia real.",
  },
]

function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="Agenda Barber — início">
      <span className={styles.brandIcon}>
        <Scissors size={22} aria-hidden="true" />
      </span>
      <span>
        Agenda <strong>Barber</strong>
        <small>AGENDAMENTO E GESTÃO</small>
      </span>
    </Link>
  )
}
function ContactLink({ label = "Quero uma apresentação" }: { label?: string }) {
  return (
    <a
      href={contactUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.primaryButton}
    >
      {label}
      <ArrowRight size={18} aria-hidden="true" />
    </a>
  )
}

export default function RootPage() {
  return (
    <div className={styles.site}>
      <a href="#conteudo" className={styles.skipLink}>
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Brand />
          <nav aria-label="Navegação principal" className={styles.desktopNav}>
            <a href="#solucoes">O sistema</a>
            <a href="#demonstracao">Demonstração</a>
            <a href="#como-comecar">Como começar</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <Link href="/auth/login" className={styles.loginLink}>
            Entrar no painel
            <ExternalLink size={15} aria-hidden="true" />
          </Link>
        </div>
        <nav aria-label="Navegação no celular" className={styles.mobileNav}>
          <a href="#solucoes">O sistema</a>
          <a href="#demonstracao">Demo</a>
          <a href="#duvidas">Dúvidas</a>
          <a href="#contato">Contato</a>
        </nav>
      </header>
      <main id="conteudo">
        <section
          className={`${styles.container} ${styles.hero}`}
          aria-labelledby="hero-title"
        >
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span />
              FEITO PARA A ROTINA DA BARBEARIA
            </p>
            <h1 id="hero-title">
              Seu talento no corte.
              <br />
              Sua agenda <span>organizada.</span>
            </h1>
            <p className={styles.heroDescription}>
              Uma página própria para seus clientes agendarem e um painel para
              você cuidar da barbearia. Serviços, equipe e horários no mesmo
              lugar.
            </p>
            <div className={styles.actions}>
              <ContactLink />
              <a href="#demonstracao" className={styles.secondaryButton}>
                Ver como funciona
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.contactHint}>
              Apresentação pelo Instagram, direto com o criador.
            </p>
            <ul className={styles.heroChecks}>
              <li>
                <Check size={16} aria-hidden="true" />
                Link da sua barbearia
              </li>
              <li>
                <Check size={16} aria-hidden="true" />
                Acesso pelo navegador
              </li>
            </ul>
          </div>
          <figure className={styles.heroVisual}>
            <div className={styles.browserBar}>
              <span className={styles.browserDots}>
                <i />
                <i />
                <i />
              </span>
              <span>
                <Scissors size={13} aria-hidden="true" />
                Página da barbearia
              </span>
              <span className={styles.browserLabel}>CLIENTE</span>
            </div>
            <BookingPreview />
            <figcaption>
              <span className={styles.figureDot} />
              Prévia ilustrativa · barbearia fictícia
            </figcaption>
          </figure>
        </section>
        <div className={styles.benefitStrip}>
          <div className={`${styles.container} ${styles.benefitInner}`}>
            <span>
              <Smartphone size={19} aria-hidden="true" />
              Seu link de agendamento
            </span>
            <span>
              <CalendarCheck size={19} aria-hidden="true" />
              Sua rotina organizada
            </span>
            <span>
              <LayoutDashboard size={19} aria-hidden="true" />
              Sua gestão no painel
            </span>
          </div>
        </div>
        <section
          id="solucoes"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="solutions-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>MENOS IMPROVISO NA ROTINA</p>
              <h2 id="solutions-title">
                Da marcação do horário <br />
                ao controle da barbearia.
              </h2>
            </div>
            <p>
              Enquanto o cliente encontra um horário, você tem um lugar para
              organizar o que acontece no seu negócio.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className={styles.feature}>
                <div className={styles.featureTop}>
                  <Icon size={25} aria-hidden="true" />
                  <span>0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="demonstracao"
          className={styles.demoSection}
          aria-labelledby="demo-title"
        >
          <div className={styles.container}>
            <div className={styles.demoHeading}>
              <p className={styles.eyebrow}>VEJA O CAMINHO DO AGENDAMENTO</p>
              <h2 id="demo-title">
                Do link do cliente
                <br />
                para a sua agenda.
              </h2>
              <p>
                Escolha um serviço e um horário. Depois, veja como esse pedido
                pode aparecer para quem atende.
              </p>
            </div>
            <BookingDemo />
            <p className={styles.demoFootnote}>
              Simulação ilustrativa. As telas acima usam dados fictícios e não
              fazem reservas reais.
            </p>
          </div>
        </section>
        <section
          id="painel"
          className={`${styles.container} ${styles.section} ${styles.panelSection}`}
          aria-labelledby="panel-title"
        >
          <figure className={styles.panelVisual}>
            <div className={styles.browserBar}>
              <span className={styles.browserDots}>
                <i />
                <i />
                <i />
              </span>
              <span>Seu espaço de gestão</span>
              <span className={styles.browserLabel}>BARBEARIA</span>
            </div>
            <ProfilePreview />
            <figcaption>
              Prévia ilustrativa · personalização com dados fictícios
            </figcaption>
          </figure>
          <div className={styles.panelCopy}>
            <p className={styles.eyebrow}>A IDENTIDADE É SUA</p>
            <h2 id="panel-title">
              Sua barbearia. <br />
              Seu nome. <br />
              <span>Seu próprio link.</span>
            </h2>
            <p>
              Depois do cadastro, sua barbearia ganha uma página no sistema.
              Personalize a apresentação e compartilhe o endereço com seus
              clientes.
            </p>
            <ul className={styles.checkList}>
              <li>
                <Check aria-hidden="true" size={18} />
                Nome, descrição, logo e imagem de fundo
              </li>
              <li>
                <Check aria-hidden="true" size={18} />
                Serviços e profissionais da sua equipe
              </li>
              <li>
                <Check aria-hidden="true" size={18} />
                Horários configurados para sua rotina
              </li>
            </ul>
            <a href="#contato" className={styles.textLink}>
              Quero conhecer o painel
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>
        <section
          id="como-comecar"
          className={styles.stepsSection}
          aria-labelledby="steps-title"
        >
          <div className={`${styles.container} ${styles.section}`}>
            <p className={styles.eyebrow}>
              DO PRIMEIRO CONTATO AO PRIMEIRO LINK
            </p>
            <h2 id="steps-title">Um começo com direção.</h2>
            <div className={styles.stepsGrid}>
              {steps.map((step) => (
                <article key={step.number} className={styles.step}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="duvidas"
          className={`${styles.container} ${styles.section} ${styles.faqSection}`}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.eyebrow}>ANTES DE COMEÇAR</p>
            <h2 id="faq-title">
              Vamos tirar
              <br />
              suas dúvidas.
            </h2>
            <p className={styles.faqIntro}>
              Quer entender um detalhe da sua operação? Converse com quem
              construiu o sistema.
            </p>
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.textLink}
            >
              <MessageCircle size={18} aria-hidden="true" />
              Falar com Marcio
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.questions}>
            {questions.map((item) => (
              <details key={item.q} className={styles.question}>
                <summary>
                  {item.q}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          id="contato"
          className={`${styles.container} ${styles.contactSection}`}
          aria-labelledby="contact-title"
        >
          <div className={styles.contactBox}>
            <div>
              <p className={styles.eyebrow}>CONHEÇA ANTES DE CONTRATAR</p>
              <h2 id="contact-title">
                Sua próxima etapa:
                <br />
                ver o sistema de perto.
              </h2>
              <p>
                Conte como funciona sua barbearia. Vamos apresentar o sistema e
                conversar sobre valores e condições de contratação.
              </p>
              <ContactLink label="Pedir apresentação no Instagram" />
              <p className={styles.contactHint}>
                A conversa abre no perfil de Marcio. Envie a palavra AGENDA.
              </p>
            </div>
            <div className={styles.contactAside}>
              <Scissors size={42} strokeWidth={1.4} aria-hidden="true" />
              <h3>
                Da sua rotina
                <br />
                para uma agenda
                <br />
                mais organizada.
              </h3>
              <span>Agenda Barber</span>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div>
            <Brand />
            <p>Agendamento e gestão para barbearias.</p>
          </div>
          <nav aria-label="Navegação do rodapé">
            <a href="#demonstracao">Ver demonstração</a>
            <a href="#contato">Pedir apresentação</a>
            <Link href="/auth/login">Acessar painel</Link>
          </nav>
          <p>
            © {new Date().getFullYear()} Agenda Barber.
            <br />
            Desenvolvido por Marcio Santos.
          </p>
        </div>
      </footer>
    </div>
  )
}
