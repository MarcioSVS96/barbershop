-- Insert sample barbers
INSERT INTO public.barbers (name, email, phone, specialty) VALUES
  ('João Silva', 'joao@barbershop.com', '(11) 98765-4321', 'Cortes clássicos'),
  ('Pedro Santos', 'pedro@barbershop.com', '(11) 98765-4322', 'Barba e degradê'),
  ('Carlos Oliveira', 'carlos@barbershop.com', '(11) 98765-4323', 'Cortes modernos')
ON CONFLICT (email) DO NOTHING;

-- Added is_active field to services for enable/disable functionality
-- Insert sample services
INSERT INTO public.services (name, duration, price, description, is_active) VALUES
  ('Corte Simples', 30, 35.00, 'Corte de cabelo masculino tradicional', true),
  ('Corte + Barba', 45, 50.00, 'Corte de cabelo + barba completa', true),
  ('Barba', 20, 25.00, 'Apenas barba', true),
  ('Corte Degradê', 40, 45.00, 'Corte degradê moderno', true),
  ('Sobrancelha', 15, 15.00, 'Design de sobrancelha', true),
  ('Pigmentação', 60, 80.00, 'Pigmentação de barba ou cabelo', true)
ON CONFLICT DO NOTHING;
