"use client"

import { useEffect, useState } from "react"
import { availableBookingTimes } from "@/lib/barber/actions"

export function useBookingTimes({
  shopId,
  barberId,
  serviceId,
  date,
  panel = false,
  appointmentId,
}: {
  shopId: string
  barberId: string
  serviceId: string
  date: string
  panel?: boolean
  appointmentId?: string
}) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    key: string
    times: string[]
    error?: string
  }>()
  const key =
    barberId && serviceId && date
      ? [shopId, barberId, serviceId, date, panel, appointmentId, attempt].join(
          "/",
        )
      : ""

  useEffect(() => {
    if (!key) return
    let current = true
    availableBookingTimes({
      shopId,
      barberId,
      serviceId,
      date,
      panel,
      appointmentId,
    })
      .then((response) => {
        if (!current) return
        setResult(
          response.ok
            ? { key, times: response.times }
            : { key, times: [], error: response.error },
        )
      })
      .catch(() => {
        if (current)
          setResult({
            key,
            times: [],
            error: "Não foi possível consultar os horários.",
          })
      })
    return () => {
      current = false
    }
  }, [key, shopId, barberId, serviceId, date, panel, appointmentId])

  return {
    times: result?.key === key ? result.times : [],
    error: result?.key === key ? result.error : undefined,
    loading: !!key && result?.key !== key,
    refresh: () => setAttempt((value) => value + 1),
  }
}
