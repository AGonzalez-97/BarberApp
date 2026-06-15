-- Supabase Advisor fixes (batch)

-- ── 1. REVOKE complete_cut from PUBLIC ───────────────────────────────────────
-- PostgreSQL grants EXECUTE to PUBLIC by default on new functions.
-- Migration 20240014 revoked from anon + authenticated but not PUBLIC.
REVOKE EXECUTE ON FUNCTION complete_cut(uuid, uuid) FROM PUBLIC;

-- ── 2. Fix search_path on SECURITY DEFINER functions ─────────────────────────
-- Mutable search_path on SECURITY DEFINER functions allows an attacker to
-- shadow system objects via schema injection. SET search_path locks it.

CREATE OR REPLACE FUNCTION complete_cut(
  p_booking_id  uuid,
  p_tenant_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking         bookings%ROWTYPE;
  v_service         services%ROWTYPE;
  v_loyalty         loyalty_config%ROWTYPE;
  v_last_reset_id   uuid;
  v_cycle_count     int;
  v_price_charged   numeric;
  v_is_free         boolean := false;
  v_has_discount    boolean := false;
  v_cut_id          uuid;
  v_new_cycle_count int;
BEGIN
  SELECT * INTO v_booking FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found for tenant %', p_booking_id, p_tenant_id;
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Booking % has status %, expected confirmed', p_booking_id, v_booking.status;
  END IF;

  SELECT * INTO v_service FROM services WHERE id = v_booking.service_id;
  SELECT * INTO v_loyalty FROM loyalty_config WHERE tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    v_loyalty.discount_at     := 3;
    v_loyalty.free_at         := 6;
    v_loyalty.discount_pct    := 15;
    v_loyalty.reset_on_redeem := true;
  END IF;

  SELECT id INTO v_last_reset_id
  FROM loyalty_ledger
  WHERE tenant_id = p_tenant_id AND client_id = v_booking.client_id AND event = 'cycle_reset'
  ORDER BY created_at DESC LIMIT 1;

  IF v_last_reset_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cycle_count
    FROM loyalty_ledger ll
    WHERE ll.tenant_id = p_tenant_id
      AND ll.client_id = v_booking.client_id
      AND ll.event     = 'cut_completed'
      AND ll.created_at > (SELECT created_at FROM loyalty_ledger WHERE id = v_last_reset_id);
  ELSE
    SELECT COUNT(*) INTO v_cycle_count
    FROM loyalty_ledger
    WHERE tenant_id = p_tenant_id AND client_id = v_booking.client_id AND event = 'cut_completed';
  END IF;

  v_new_cycle_count := v_cycle_count + 1;
  v_price_charged   := v_service.price_ars;

  IF v_new_cycle_count = v_loyalty.free_at THEN
    v_price_charged := 0;
    v_is_free       := true;
  ELSIF v_new_cycle_count = v_loyalty.discount_at THEN
    v_price_charged := v_service.price_ars * (1 - v_loyalty.discount_pct / 100.0);
    v_has_discount  := true;
  END IF;

  INSERT INTO cuts (tenant_id, booking_id, client_id, service_id, price_charged, loyalty_discount_applied)
  VALUES (p_tenant_id, p_booking_id, v_booking.client_id, v_booking.service_id, v_price_charged, v_has_discount OR v_is_free)
  RETURNING id INTO v_cut_id;

  INSERT INTO loyalty_ledger (tenant_id, client_id, event, counter_value)
  VALUES (p_tenant_id, v_booking.client_id, 'cut_completed', v_new_cycle_count);

  IF v_is_free AND v_loyalty.reset_on_redeem THEN
    INSERT INTO loyalty_ledger (tenant_id, client_id, event, counter_value)
    VALUES (p_tenant_id, v_booking.client_id, 'cycle_reset', 0);
  END IF;

  UPDATE bookings SET status = 'completed' WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'cut_id',          v_cut_id,
    'price_charged',   v_price_charged,
    'is_free',         v_is_free,
    'has_discount',    v_has_discount,
    'new_cycle_count', v_new_cycle_count
  );
END;
$$;

-- Re-grant only to service_role (same as migration 20240014)
GRANT EXECUTE ON FUNCTION complete_cut(uuid, uuid) TO service_role;

-- ── 3. Fix search_path on get_available_slots ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id  uuid,
  p_date       date
)
RETURNS TABLE(slot_time timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant         tenants%ROWTYPE;
  v_start_hour     int;
  v_end_hour       int;
  v_day_bit        int;
  v_slot_interval  interval := '30 minutes';
  v_current_slot   timestamptz;
  v_day_start      timestamptz;
  v_day_end        timestamptz;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;

  v_day_bit := EXTRACT(DOW FROM p_date)::int;
  IF (v_tenant.available_days & (1 << v_day_bit)) = 0 THEN
    RETURN;
  END IF;

  v_start_hour := COALESCE((v_tenant.settings->>'start_hour')::int, 9);
  v_end_hour   := COALESCE((v_tenant.settings->>'end_hour')::int, 19);

  v_day_start := ((p_date::text || ' ' || v_start_hour || ':00:00')::timestamp)
                 AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_day_end   := ((p_date::text || ' ' || v_end_hour   || ':00:00')::timestamp)
                 AT TIME ZONE 'America/Argentina/Buenos_Aires';

  v_current_slot := v_day_start;

  WHILE v_current_slot < v_day_end LOOP
    IF NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.tenant_id = p_tenant_id
        AND b.starts_at = v_current_slot
        AND b.status IN ('pending', 'confirmed')
    ) THEN
      slot_time := v_current_slot;
      RETURN NEXT;
    END IF;
    v_current_slot := v_current_slot + v_slot_interval;
  END LOOP;

  RETURN;
END;
$$;

-- ── 4. Fix RLS policy always-true on bookings ────────────────────────────────
-- The anon INSERT policy had WITH CHECK (true) — no tenant scope.
-- Since all booking creation goes through our API (service_role), the anon
-- policy is unused and a liability. Drop it.
DROP POLICY IF EXISTS "bookings: anon insert" ON bookings;
DROP POLICY IF EXISTS "bookings: deny anon read" ON bookings;

-- ── 5. Index unindexed foreign keys ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bookings_service_id_idx    ON bookings(service_id);
CREATE INDEX IF NOT EXISTS cuts_service_id_idx        ON cuts(service_id);
CREATE INDEX IF NOT EXISTS loyalty_ledger_client_idx  ON loyalty_ledger(client_id);

-- ── 6. Drop redundant unused index on loyalty_ledger ─────────────────────────
-- idx_loyalty_ledger_cycle (tenant_id, client_id, event, created_at) is a
-- superset — loyalty_ledger_tenant_client_idx is fully covered by it.
DROP INDEX IF EXISTS loyalty_ledger_tenant_client_idx;
