"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ReceiptText,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCashExpense, voidCashExpense } from "@/lib/barber/actions"
import {
  expenseCategories,
  expenseLabels,
  type CashExpense,
} from "@/lib/barber/expenses"
import { money, shopDate } from "@/lib/barber/time"
import type { Appointment, Payment } from "@/lib/types"
import { BarberSheet, fieldClass, FormError, primaryClass } from "./forms"

const panel = "overflow-hidden rounded-2xl border border-slate-200 bg-white"
const dateLabel = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
})
const paymentMethods = { pix: "Pix", card: "Cartão", cash: "Dinheiro" }
const sumCents = (items: { amount: number }[]) =>
  items.reduce(
    (total, item) => total + Math.round(Number(item.amount) * 100),
    0,
  )

function shortDate(value: string) {
  return dateLabel.format(new Date(`${value}T12:00:00`))
}

function weekStart(date: string) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7))
  return value.toISOString().slice(0, 10)
}

type Props = {
  shopId: string
  shopTotals: boolean
  professional: string
  professionalFilter: ReactNode
  payments: Payment[]
  expenses: CashExpense[]
  unpaid: Appointment[]
  appointments: Appointment[]
  loadErrors: string[]
  recordReceipt: (id: string) => void
}

export function CashView({
  shopId,
  shopTotals,
  professional,
  professionalFilter,
  payments,
  expenses,
  unpaid,
  appointments,
  loadErrors,
  recordReceipt,
}: Props) {
  const router = useRouter()
  const today = shopDate()
  const [period, setPeriod] = useState("day")
  const [range, setRange] = useState({ from: today, to: today })
  const [newExpense, setNewExpense] = useState<{ id: string }>()
  const [expenseToVoid, setExpenseToVoid] = useState<CashExpense>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const from =
    period === "custom"
      ? range.from
      : period === "month"
        ? `${today.slice(0, 7)}-01`
        : period === "week"
          ? weekStart(today)
          : today
  const to = period === "custom" ? range.to : today
  const validPeriod = !!from && !!to && from <= to && to <= today
  const receiptsAvailable = !loadErrors.includes("recebimentos")
  const expensesAvailable = !loadErrors.includes("despesas")
  const appointmentsById = new Map(appointments.map((item) => [item.id, item]))
  const received = validPeriod
    ? payments.filter((item) => {
        if (
          !item.payment_date ||
          (professional && item.appointments?.barber_id !== professional)
        )
          return false
        const day = shopDate(new Date(item.payment_date))
        return day >= from && day <= to
      })
    : []
  const spent =
    validPeriod && shopTotals
      ? expenses.filter((item) => item.paid_on >= from && item.paid_on <= to)
      : []
  const totalReceived = sumCents(received)
  const totalSpent = sumCents(spent.filter((item) => !item.voided_at))
  const movements = [
    ...received.map((p) => {
      const appointment = appointmentsById.get(p.appointment_id)
      const day = shopDate(new Date(p.payment_date))
      return {
        id: p.id,
        title: appointment?.clients?.name || "Atendimento",
        note: [paymentMethods[p.payment_method], appointment?.barbers?.name]
          .filter(Boolean)
          .join(" · "),
        day,
        recorded: p.payment_date,
        amount: p.amount,
        expense: undefined,
      }
    }),
    ...spent.map((expense) => ({
      id: expense.id,
      title: expense.description,
      note: expenseLabels[expense.category],
      day: expense.paid_on,
      recorded: expense.created_at,
      amount: expense.amount,
      expense,
    })),
  ].sort(
    (a, b) =>
      b.day.localeCompare(a.day) || b.recorded.localeCompare(a.recorded),
  )

  function dismiss() {
    if (busy) return
    setNewExpense(undefined)
    setExpenseToVoid(undefined)
    setError("")
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newExpense || busy) return
    const form = new FormData(event.currentTarget)
    const paidOn = String(form.get("paidOn"))
    setBusy(true)
    setError("")
    try {
      const result = await createCashExpense({
        id: newExpense.id,
        shopId,
        description: form.get("description"),
        amount: Number(form.get("amount")),
        category: form.get("category"),
        paidOn,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (!validPeriod || paidOn < from || paidOn > to) {
        setRange({ from: paidOn, to: paidOn })
        setPeriod("custom")
      }
      setNewExpense(undefined)
      setMessage("Despesa registrada.")
      router.refresh()
    } catch {
      setError(
        "Não foi possível confirmar o lançamento. Tente novamente neste formulário.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function confirmVoid() {
    if (!expenseToVoid || busy) return
    setBusy(true)
    setError("")
    try {
      const result = await voidCashExpense({ shopId, id: expenseToVoid.id })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setExpenseToVoid(undefined)
      setMessage("Despesa cancelada. O lançamento ficou no histórico.")
      router.refresh()
    } catch {
      setError("Não foi possível confirmar o cancelamento. Atualize o caixa.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <section
        className={`${panel} px-4 py-4 sm:px-5`}
        aria-label="Filtros do caixa"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="cash-period"
                className="text-xs font-medium text-slate-600"
              >
                Período
              </Label>
              <select
                id="cash-period"
                className={`${fieldClass} min-w-36`}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="day">Hoje</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {professionalFilter}
          </div>
          {shopTotals && expensesAvailable ? (
            <Button
              className={primaryClass}
              onClick={() => {
                setError("")
                setMessage("")
                setNewExpense({ id: crypto.randomUUID() })
              }}
            >
              <Plus aria-hidden /> Registrar despesa
            </Button>
          ) : null}
        </div>
        {period === "custom" ? (
          <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="cash-from">Data inicial</Label>
              <Input
                id="cash-from"
                type="date"
                value={range.from}
                max={today}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="cash-to">Data final</Label>
              <Input
                id="cash-to"
                type="date"
                value={range.to}
                max={today}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
            </div>
          </div>
        ) : null}
      </section>
      {message ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {message}
        </p>
      ) : null}
      {!validPeriod ? (
        <FormError error="Escolha um período válido até hoje." />
      ) : null}

      {validPeriod ? (
        <>
          <div
            className={`grid gap-3 ${shopTotals ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            {shopTotals ? (
              <section className="rounded-2xl bg-[#16243b] p-5 text-white">
                <p className="flex items-center gap-2 text-sm text-slate-200">
                  <Wallet aria-hidden className="size-4" /> Saldo do período
                </p>
                <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
                  {receiptsAvailable && expensesAvailable
                    ? money((totalReceived - totalSpent) / 100)
                    : "Indisponível"}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Entradas menos despesas registradas
                </p>
              </section>
            ) : null}
            <section className={`${panel} p-5`}>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <ArrowDownLeft
                  aria-hidden
                  className="size-4 text-emerald-700"
                />{" "}
                Recebido no período
              </p>
              <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
                {receiptsAvailable
                  ? money(totalReceived / 100)
                  : "Indisponível"}
              </p>
            </section>
            {shopTotals ? (
              <section className={`${panel} p-5`}>
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <ArrowUpRight aria-hidden className="size-4 text-amber-800" />{" "}
                  Despesas pagas
                </p>
                <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
                  {expensesAvailable ? money(totalSpent / 100) : "Indisponível"}
                </p>
              </section>
            ) : (
              <section className={`${panel} p-5`}>
                <p className="text-sm text-slate-600">Atendimentos a receber</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {receiptsAvailable && !loadErrors.includes("agendamentos")
                    ? unpaid.length
                    : "Indisponível"}
                </p>
              </section>
            )}
          </div>

          {receiptsAvailable && unpaid.length ? (
            <section className={panel}>
              <h2 className="border-b border-slate-200 px-4 py-4 font-semibold sm:px-5">
                Concluídos a receber
              </h2>
              <ul className="divide-y divide-slate-100">
                {unpaid.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">
                        {item.clients?.name || "Cliente"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {shortDate(item.appointment_date)} ·{" "}
                        {item.services?.name || "Serviço"} ·{" "}
                        {money(item.service_price_at_booking)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => recordReceipt(item.id)}
                    >
                      Registrar recebimento
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={panel}>
            <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:px-5">
              <h2 className="font-semibold">
                {shopTotals ? "Movimentações" : "Recebimentos registrados"}
              </h2>
              <span className="text-xs text-slate-600">
                {shortDate(from)}–{shortDate(to)}
              </span>
            </header>
            {movements.length ? (
              <ul className="divide-y divide-slate-100">
                {movements.map((item) => {
                  const expense = item.expense
                  return (
                    <li
                      key={`${expense ? "expense" : "receipt"}-${item.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`hidden size-8 shrink-0 place-items-center rounded-lg sm:grid ${expense ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}
                        >
                          {expense ? (
                            <ArrowUpRight aria-hidden className="size-4" />
                          ) : (
                            <ArrowDownLeft aria-hidden className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="mt-0.5 break-words text-xs text-slate-600">
                            {shortDate(item.day)} · {item.note}
                            {expense?.voided_at ? " · Cancelada" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 text-right">
                        <p
                          className={`text-sm font-semibold tabular-nums ${expense?.voided_at ? "text-slate-500 line-through" : expense ? "text-amber-900" : "text-emerald-800"}`}
                        >
                          {money((expense ? -1 : 1) * item.amount)}
                        </p>
                        {expense && !expense.voided_at ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-slate-600 underline-offset-4 hover:bg-transparent hover:underline"
                            onClick={() => {
                              setError("")
                              setExpenseToVoid(expense)
                            }}
                            aria-label={`Cancelar despesa ${expense.description}`}
                          >
                            Cancelar
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="space-y-2 px-5 py-9 text-center">
                <ReceiptText
                  aria-hidden
                  className="mx-auto size-5 text-slate-500"
                />
                <p className="text-sm font-medium">
                  Sem lançamentos no período
                </p>
                <p className="text-sm text-slate-600">
                  {shopTotals
                    ? "Os recebimentos e as despesas pagas aparecem aqui."
                    : "Registre um recebimento após concluir um atendimento."}
                </p>
              </div>
            )}
          </section>
        </>
      ) : null}

      {newExpense ? (
        <BarberSheet
          title="Registrar despesa"
          description="Lance um valor pago pela barbearia."
          close={dismiss}
        >
          <form onSubmit={submitExpense}>
            <fieldset disabled={busy} className="min-w-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense-description">Descrição</Label>
                <Input
                  id="expense-description"
                  name="description"
                  placeholder="Ex. Lâminas e toalhas"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-category">Categoria</Label>
                <select
                  id="expense-category"
                  name="category"
                  className={fieldClass}
                  defaultValue="supplies"
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {expenseLabels[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="expense-amount">Valor pago (R$)</Label>
                  <Input
                    id="expense-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    max="999999.99"
                    step="0.01"
                    inputMode="decimal"
                    required
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="expense-date">Data do pagamento</Label>
                  <Input
                    id="expense-date"
                    name="paidOn"
                    type="date"
                    max={today}
                    defaultValue={today}
                    required
                  />
                </div>
              </div>
              <FormError error={error} />
              <Button type="submit" className={primaryClass}>
                {busy ? "Registrando…" : "Registrar despesa"}
              </Button>
            </fieldset>
          </form>
        </BarberSheet>
      ) : null}

      {expenseToVoid ? (
        <BarberSheet
          title="Cancelar despesa?"
          description="O valor sai do saldo, e o lançamento fica no histórico."
          close={dismiss}
        >
          <p className="rounded-lg bg-slate-100 p-3 text-sm">
            <strong>{expenseToVoid.description}</strong> ·{" "}
            {money(expenseToVoid.amount)}
          </p>
          <FormError error={error} />
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={busy} onClick={confirmVoid}>
              {busy ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={dismiss}>
              Voltar
            </Button>
          </div>
        </BarberSheet>
      ) : null}
    </div>
  )
}
