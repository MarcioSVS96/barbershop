import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Scissors,
} from "lucide-react"
import styles from "./product-previews.module.css"

// Presentation-only views: no forms, live shop data or reservation endpoints.
export function BookingPreview() {
  return (
    <div
      className={styles.bookingCanvas}
      role="img"
      aria-label="Prévia ilustrativa de agendamento para a Barbearia Modelo, uma empresa fictícia."
    >
      <div className={styles.bookingCard}>
        <div className={styles.shopHeader}>
          <span className={styles.logo}>
            <Scissors size={23} aria-hidden="true" />
          </span>
          <div>
            <strong>Barbearia Modelo</strong>
            <span>Exemplo fictício para demonstração</span>
          </div>
        </div>
        <div className={styles.bookingHeading}>
          <strong>Agende seu horário</strong>
          <span>Escolha como quer ser atendido.</span>
        </div>
        <div className={styles.field}>
          <span>Serviço</span>
          <div className={styles.input}>
            <span>Corte de cabelo</span>
            <span className={styles.duration}>
              <Clock3 size={12} aria-hidden="true" />
              30 min
            </span>
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <span>Profissional</span>
            <div className={styles.input}>
              <span>Alex</span>
              <ChevronDown size={14} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.field}>
            <span>Data</span>
            <div className={styles.input}>
              <span>Dia de exemplo</span>
              <CalendarDays size={14} aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className={styles.field}>
          <span>Horários de exemplo</span>
          <div className={styles.timeOptions}>
            <span>09:00</span>
            <span className={styles.chosenTime}>10:00</span>
            <span>14:00</span>
            <span>15:00</span>
          </div>
        </div>
        <div className={styles.confirm}>
          Confirmar agendamento
          <Check size={16} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export function ProfilePreview() {
  return (
    <div
      className={styles.dashboard}
      role="img"
      aria-label="Prévia ilustrativa do painel de personalização da Barbearia Modelo, com nome, descrição e imagens fictícias."
    >
      <div className={styles.dashboardHeader}>
        <span className={styles.smallLogo}>
          <Scissors size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>Painel do Barbeiro</strong>
          <span>Barbearia Modelo · exemplo fictício</span>
        </div>
      </div>
      <div className={styles.tabs}>
        <span>Agenda</span>
        <span>Serviços</span>
        <span>Horários</span>
        <span className={styles.activeTab}>Perfil</span>
      </div>
      <div className={styles.profileContent}>
        <div className={styles.profileTitle}>
          <strong>Perfil da barbearia</strong>
          <span>Uma página com a sua identidade.</span>
        </div>
        <div className={styles.profileBanner}>
          <span className={styles.monogram}>BM</span>
          <div>
            <strong>Barbearia Modelo</strong>
            <span>Seu estilo começa aqui.</span>
          </div>
          <Scissors
            className={styles.bannerScissors}
            size={72}
            strokeWidth={1}
            aria-hidden="true"
          />
        </div>
        <div className={styles.field}>
          <span>Nome da barbearia</span>
          <div className={styles.input}>Barbearia Modelo</div>
        </div>
        <div className={styles.imageSettings}>
          <div>
            <span className={styles.miniMonogram}>BM</span>
            <span>
              <strong>Logo da barbearia</strong>
              <small>Sua marca na página de agendamento</small>
            </span>
          </div>
          <span className={styles.editLabel}>Alterar imagem</span>
        </div>
        <div className={styles.profileFooter}>
          <span>
            <Check size={13} aria-hidden="true" />
            Prévia ilustrativa
          </span>
          <span className={styles.saveLabel}>Salvar alterações</span>
        </div>
      </div>
    </div>
  )
}
