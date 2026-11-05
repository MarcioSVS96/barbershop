-- Expenses belong to the shop, independently of any professional's receipts.
CREATE TABLE public.cash_expenses (
  id uuid PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershop_settings(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 2 AND 120),
  category text NOT NULL CHECK (category IN ('supplies', 'rent', 'bills', 'other')),
  amount numeric(8,2) NOT NULL CHECK (amount > 0 AND amount <= 999999.99),
  paid_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at timestamptz
);

CREATE INDEX cash_expenses_shop_period ON public.cash_expenses (barbershop_id, paid_on DESC, id);

ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cash_expenses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cash_expenses TO authenticated;
GRANT INSERT (id, barbershop_id, description, category, amount, paid_on) ON public.cash_expenses TO authenticated;
GRANT UPDATE (voided_at) ON public.cash_expenses TO authenticated;
GRANT ALL ON public.cash_expenses TO service_role;

CREATE POLICY cash_expenses_read_owner ON public.cash_expenses
  FOR SELECT TO authenticated
  USING (public.role_in_shop(barbershop_id) = 'owner');

CREATE POLICY cash_expenses_create_owner ON public.cash_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.role_in_shop(barbershop_id) = 'owner'
    AND created_by = (SELECT auth.uid())
    AND voided_at IS NULL
    AND paid_on <= (now() AT TIME ZONE 'America/Fortaleza')::date
  );

CREATE POLICY cash_expenses_void_owner ON public.cash_expenses
  FOR UPDATE TO authenticated
  USING (public.role_in_shop(barbershop_id) = 'owner' AND voided_at IS NULL)
  WITH CHECK (public.role_in_shop(barbershop_id) = 'owner' AND voided_at IS NOT NULL);
