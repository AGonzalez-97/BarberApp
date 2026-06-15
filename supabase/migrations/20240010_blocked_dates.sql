-- Fix available_days bitmask: 62 (Tue-Sat) → 63 (Mon-Sat).
-- Bit 1 = Monday was missing from the original seed.
UPDATE tenants
SET available_days = 63
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND available_days = 62;

-- Blocked dates: lets the admin mark specific dates as unavailable
-- (holidays, vacations, etc.) regardless of the weekly bitmask.
CREATE TABLE IF NOT EXISTS blocked_dates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date       date NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, date)
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON blocked_dates
  FOR ALL
  USING (false)
  WITH CHECK (false);
