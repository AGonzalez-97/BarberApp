-- Security fix: views were created without explicit SECURITY INVOKER, causing
-- PostgreSQL to run them with the owner's privileges (SECURITY DEFINER behavior).
-- This bypasses RLS policies on the underlying tables.
-- Recreating all analytics views with security_invoker = true ensures they run
-- with the caller's role and respect RLS.

CREATE OR REPLACE VIEW daily_stats
  WITH (security_invoker = true)
AS
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

CREATE OR REPLACE VIEW weekly_stats
  WITH (security_invoker = true)
AS
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

CREATE OR REPLACE VIEW monthly_stats
  WITH (security_invoker = true)
AS
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

CREATE OR REPLACE VIEW low_traffic_slots
  WITH (security_invoker = true)
AS
WITH slot_counts AS (
  SELECT
    tenant_id,
    EXTRACT(DOW FROM starts_at)::int   AS day_of_week,
    EXTRACT(HOUR FROM starts_at)::int  AS hour_of_day,
    COUNT(*)                           AS booking_count
  FROM bookings
  WHERE
    starts_at >= now() - INTERVAL '90 days'
    AND status IN ('confirmed', 'completed')
  GROUP BY tenant_id, day_of_week, hour_of_day
),
tenant_avg AS (
  SELECT
    tenant_id,
    AVG(booking_count) AS avg_bookings
  FROM slot_counts
  GROUP BY tenant_id
)
SELECT
  sc.tenant_id,
  sc.day_of_week,
  sc.hour_of_day,
  sc.booking_count AS avg_bookings
FROM slot_counts sc
JOIN tenant_avg ta USING (tenant_id)
WHERE sc.booking_count < ta.avg_bookings
ORDER BY sc.tenant_id, sc.booking_count ASC;
