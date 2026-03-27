CREATE TABLE public.password_reset_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pin text NOT NULL,
  backup_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.password_reset_pins ENABLE ROW LEVEL SECURITY;