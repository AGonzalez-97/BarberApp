-- Migration: tenants table
-- Stores one row per barbershop/salon using this platform.

CREATE TABLE IF NOT EXISTS tenants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  booking_mode    text        NOT NULL DEFAULT 'request'
                              CHECK (booking_mode IN ('request', 'slots')),
  payment_alias   text        NOT NULL DEFAULT 'Leo.barber4316',
  available_days  int2        NOT NULL DEFAULT 62,
  -- Bitmask: bit 1 = Monday ... bit 6 = Saturday
  -- 62 decimal = 0b0111110 = Mon–Sat
  settings        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed: default tenant used by all seed data in subsequent migrations
INSERT INTO tenants (id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Leo Barber',
  'leo-barber'
)
ON CONFLICT (id) DO NOTHING;

-- RLS: enabled; only service role may access this table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- No policies for anon — service role bypasses RLS by default in Supabase
-- Add an explicit deny-all for anon to make the intent clear
CREATE POLICY "tenants: deny anon"
  ON tenants
  FOR ALL
  TO anon
  USING (false);
