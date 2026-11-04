"use client"

import { useState, type FormEvent } from "react"
import {
  ArrowRight,
  CalendarCheck,
  Check,
  RotateCcw,
  Scissors,
} from "lucide-react"
import styles from "./booking-demo.module.css"

const services = [
  { id: "corte", name: "Corte", detail: "30 min · R$ 35" },
  { id: "combo", name: "Corte + barba", detail: "60 min · R$ 60" },
]
const times = ["09:00", "10:00", "14:00", "15:00"]
type DemoBooking = { service: string; professional: string; time: string }

export function BookingDemo() {
  const [service, setService] = useState("corte")
  const [professional, setProfessional] = useState("Alex")
  const [time, setTime] = useState("10:00")
  const [booking, setBooking] = useState<DemoBooking | null>(null)

  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBooking({
      service: services.find((item) => item.id === service)!.name,
      professional,
      time,
    })
  }
  function reset() {
    setBooking(null)
    setService("corte")
    setProfessional("Alex")
    setTime("10:00")
  }

  return (
    <div className={styles.demo}>
      <form onSubmit={simulate} className={styles.customer}>
        <div className={styles.label}>
          <span>01</span>O CLIENTE ESCOLHE
        </div>
        <div className={styles.shop}>
          <span>
            <Scissors size={20} aria-hidden="true" />
          </span>
          <div>
            <h3>Barbearia Exemplo</h3>
            <p>Página de agendamento · simulação</p>
          </div>
        </div>
        <fieldset disabled={!!booking} className={styles.fieldset}>
          <legend>Escolha o serviço</legend>
          <div className={styles.services}>
            {services.map((item) => (
              <label
                key={item.id}
                className={`${styles.service} ${service === item.id ? styles.selected : ""}`}
              >
                <input
                  type="radio"
                  name="demo-service"
                  value={item.id}
                  checked={service === item.id}
                  onChange={() => setService(item.id)}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={styles.selectRow}>
          <label>
            Profissional
            <select
              value={professional}
              onChange={(event) => setProfessional(event.target.value)}
              disabled={!!booking}
            >
              <option>Alex</option>
              <option>Bruno</option>
            </select>
          </label>
          <label>
            Horário de exemplo
            <select
              value={time}
              onChange={(event) => setTime(event.target.value)}
              disabled={!!booking}
            >
              {times.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" disabled={!!booking} className={styles.submit}>
          {booking ? (
            <>
              <Check size={17} aria-hidden="true" />
              Simulação realizada
            </>
          ) : (
            <>
              Simular agendamento
              <ArrowRight size={17} aria-hidden="true" />
            </>
          )}
        </button>
        <p className={styles.disclaimer}>
          Valores fictícios de serviços. Não são preços do sistema.
        </p>
      </form>
      <div className={styles.owner}>
        <div className={styles.label}>
          <span>02</span>A BARBEARIA ACOMPANHA
        </div>
        <div className={styles.panelHeading}>
          <div>
            <h3>Agenda da equipe</h3>
            <p>Prévia ilustrativa do painel</p>
          </div>
          <CalendarCheck size={22} aria-hidden="true" />
        </div>
        <div className={styles.timeline}>
          <div className={styles.existing}>
            <time>08:00</time>
            <div>
              <strong>Cliente de exemplo</strong>
              <p>Corte · Bruno</p>
            </div>
            <span>Confirmado</span>
          </div>
          <div
            className={styles.result}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {booking ? (
              <div className={styles.newBooking}>
                <time>{booking.time}</time>
                <div>
                  <strong>Cliente da demonstração</strong>
                  <p>
                    {booking.service} · {booking.professional}
                  </p>
                  <span>Pendente · exemplo</span>
                </div>
                <Check size={19} aria-hidden="true" />
              </div>
            ) : (
              <div className={styles.empty}>
                <CalendarCheck size={29} strokeWidth={1.4} aria-hidden="true" />
                <h4>Seu próximo agendamento aparece aqui.</h4>
                <p>Use a simulação para ver o pedido chegar nesta prévia.</p>
              </div>
            )}
          </div>
        </div>
        {booking && (
          <div className={styles.success}>
            <p>
              <Check size={15} aria-hidden="true" />
              Pronto! Você viu o caminho do agendamento.
            </p>
            <button type="button" onClick={reset}>
              <RotateCcw size={14} aria-hidden="true" />
              Testar novamente
            </button>
          </div>
        )}
        <p className={styles.ownerNote}>
          No sistema, a equipe acompanha os pedidos e gerencia o status dos
          atendimentos.
        </p>
      </div>
    </div>
  )
}
