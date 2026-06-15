-- get_available_slots is SECURITY DEFINER and called only via service_role
-- from the /api/slots Next.js route. Public/anon callers should not be able
-- to invoke it directly via PostgREST /rpc/get_available_slots.
REVOKE EXECUTE ON FUNCTION get_available_slots(uuid, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_available_slots(uuid, date) TO service_role;
