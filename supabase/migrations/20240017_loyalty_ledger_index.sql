-- Performance: cycle count queries filter on tenant_id + client_id + event + created_at.
-- The existing index covers (tenant_id, client_id) but not event or created_at,
-- causing full scans on the filtered set at scale.
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_cycle
  ON loyalty_ledger (tenant_id, client_id, event, created_at);
