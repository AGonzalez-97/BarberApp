-- Migration: clients table
-- Represents customers who book appointments with a tenant.
-- Phone stored in E.164 format (e.g. +5491112345678).

CREATE TABLE IF NOT EXISTS clients (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  phone       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clients_tenant_phone_unique UNIQUE (tenant_id, phone)
);

CREATE INDEX IF NOT EXISTS clients_tenant_id_idx ON clients(tenant_id);

-- RLS: service role only — clients are PII, never exposed to anon
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients: deny anon"
  ON clients
  FOR ALL
  TO anon
  USING (false);

CREATE POLICY "clients: service role full access"
  ON clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
