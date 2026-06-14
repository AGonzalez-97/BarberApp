-- Migration: analytics views
-- Read-only, non-materialized views for dashboard stats.
-- All views are tenant-scoped; callers must filter by tenant_id.

-- ─── daily_stats ─────────────────────────────────────────────────────────────
-- Aggregates for today only (useful for the live dashboard widget).

CREATE OR REPLACE VIEW daily_stats AS
SELECT
  c.tenant_id,
  CURRENT_DATE                          AS date,
  COUNT(*)                              AS total_cuts,
  SUM(c.price_charged)                  AS total_revenue,
  AVG(c.price_charged)                  AS avg_revenue_per_cut
FROM cuts c
WHERE c.created_at::date = CURRENT_DATE
GROUP BY c.tenant_id;

-- ─── weekly_stats ────────────────────────────────────────────────────────────
-- Rolling 12-week window, grouped by ISO week start (Monday).

CREATE OR REPLACE VIEW weekly_stats AS
SELECT
  c.tenant_id,
  date_trunc('week', c.created_at)::date  AS week_start,
  COUNT(*)                                AS total_cuts,
  SUM(c.price_charged)                    AS total_revenue
FROM cuts c
WHERE c.created_at >= date_trunc('week', now()) - INTERVAL '11 weeks'
GROUP BY c.tenant_id, date_trunc('week', c.created_at)
ORDER BY c.tenant_id, week_start;

-- ─── monthly_stats ───────────────────────────────────────────────────────────
-- Rolling 12-month window.

CREATE OR REPLACE VIEW monthly_stats AS
SELECT
  c.tenant_id,
  date_trunc('month', c.created_at)::date AS month_start,
  COUNT(*)                                AS total_cuts,
  SUM(c.price_charged)                    AS total_revenue
FROM cuts c
WHERE c.created_at >= date_trunc('month', now()) - INTERVAL '11 months'
GROUP BY c.tenant_id, date_trunc('month', c.created_at)
ORDER BY c.tenant_id, month_start;

-- ─── low_traffic_slots ───────────────────────────────────────────────────────
-- Identifies day/hour combinations with below-average booking volume.
-- Computed from confirmed/completed bookings in the last 90 days.
-- Use to suggest promotional slots or off-peak discounts.

CREATE OR REPLACE VIEW low_traffic_slots AS
WITH slot_counts AS (
  SELECT
    tenant_id,
    EXTRACT(DOW FROM starts_at)::int   AS day_of_week,   -- 0=Sun, 6=Sat
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
  sc.booking_count                AS avg_bookings
FROM slot_counts sc
JOIN tenant_avg ta USING (tenant_id)
WHERE sc.booking_count < ta.avg_bookings
ORDER BY sc.tenant_id, sc.booking_count ASC;
