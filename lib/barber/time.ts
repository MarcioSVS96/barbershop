export const SHOP_TIME_ZONE = "America/Fortaleza"

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SHOP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
const moneyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function shopDate(date = new Date()) {
  return dateFormat.format(date)
}

export function shopTime(date = new Date()) {
  return timeFormat.format(date)
}

export function money(value: number | null | undefined) {
  return moneyFormat.format(Number(value || 0))
}

export function endOfService(start: string, duration: number | null) {
  const [h, m] = start.split(":").map(Number)
  const end = h * 60 + m + (duration ?? 30)
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return (digits.length === 12 || digits.length === 13) &&
    digits.startsWith("55")
    ? digits.slice(2)
    : digits
}
