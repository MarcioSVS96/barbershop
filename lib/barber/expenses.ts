export const expenseCategories = ["supplies", "rent", "bills", "other"] as const

export const expenseLabels = {
  supplies: "Produtos e materiais",
  rent: "Aluguel",
  bills: "Contas",
  other: "Outros",
} satisfies Record<(typeof expenseCategories)[number], string>

export type CashExpense = {
  id: string
  description: string
  category: (typeof expenseCategories)[number]
  amount: number
  paid_on: string
  created_at: string
  voided_at: string | null
}
