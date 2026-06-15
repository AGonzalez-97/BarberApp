-- Fix: get_available_slots was casting slot timestamps without an explicit timezone,
-- causing PostgreSQL to interpret start_hour/end_hour as UTC instead of Argentina local time.
-- This produced slots 3 hours early (e.g. 9am configured = 6am shown to users).

CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id  uuid,
  p_date       date
)
RETURNS TABLE(slot_time timestamptz)
LANGUAGE plpgsql
STABLE
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

  -- Cast as local Argentina time, then convert to UTC timestamptz.
  -- ::timestamp (no zone) + AT TIME ZONE = interprets the value as that zone → returns UTC.
  v_day_start  := ((p_date::text || ' ' || v_start_hour || ':00:00')::timestamp)
                  AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_day_end    := ((p_date::text || ' ' || v_end_hour   || ':00:00')::timestamp)
                  AT TIME ZONE 'America/Argentina/Buenos_Aires';

  v_current_slot := v_day_start;

  WHILE v_current_slot < v_day_end LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM   bookings b
      WHERE  b.tenant_id  = p_tenant_id
        AND  b.starts_at  = v_current_slot
        AND  b.status     IN ('pending', 'confirmed')
    ) THEN
      slot_time := v_current_slot;
      RETURN NEXT;
    END IF;

    v_current_slot := v_current_slot + v_slot_interval;
  END LOOP;

  RETURN;
END;
$$;
