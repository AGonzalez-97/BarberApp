-- Migration: fix daily_stats to use Buenos Aires timezone instead of UTC.
-- CURRENT_DATE in Postgres is UTC-based; cuts done after 21:00 Argentina time
-- (00:00 UTC) would fall on the next UTC day and be excluded from "today".

CREATE OR REPLACE VIEW daily_stats AS
SELECT
  c.tenant_id,
  (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS date,
  COUNT(*)                                                                  AS total_cuts,
  SUM(c.price_charged)                                                      AS total_revenue,
  AVG(c.price_charged)                                                      AS avg_revenue_per_cut
FROM cuts c
WHERE
  (c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date =
  (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
GROUP BY c.tenant_id;

-- Also fix weekly_stats: the rolling window boundary was UTC-based.

CREATE OR REPLACE VIEW weekly_stats AS
SELECT
  c.tenant_id,
  date_trunc('week', c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS week_start,
  COUNT(*)                                                                               AS total_cuts,
  SUM(c.price_charged)                                                                   AS total_revenue
FROM cuts c
WHERE
  (c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') >=
  date_trunc('week', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')) - INTERVAL '11 weeks'
GROUP BY c.tenant_id, date_trunc('week', c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
ORDER BY c.tenant_id, week_start;

-- Also fix monthly_stats for the same reason.

CREATE OR REPLACE VIEW monthly_stats AS
SELECT
  c.tenant_id,
  date_trunc('month', c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS month_start,
  COUNT(*)                                                                                AS total_cuts,
  SUM(c.price_charged)                                                                    AS total_revenue
FROM cuts c
WHERE
  (c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') >=
  date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')) - INTERVAL '11 months'
GROUP BY c.tenant_id, date_trunc('month', c.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
ORDER BY c.tenant_id, month_start;
