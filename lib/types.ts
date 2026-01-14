export interface Barber {
  id: string
  name: string
  email: string
  phone: string | null
  specialty: string | null
  created_at: string
}

export interface Service {
  id: string
  name: string
  duration: number
  price: number
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string
  notes: string | null
  created_at: string
}

export interface Appointment {
  id: string
  client_id: string
  barber_id: string
  service_id: string
  appointment_date: string
  appointment_time: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  notes: string | null
  service_price_at_booking: number
  service_duration_at_booking: number
  created_at: string
  clients?: Client
  barbers?: Barber
  services?: Service
}

export interface Payment {
  id: string
  appointment_id: string
  amount: number
  payment_method: "cash" | "card" | "pix"
  payment_date: string
  barber_commission: number
  barbershop_revenue: number
  notes: string | null
  appointments?: Appointment
}
