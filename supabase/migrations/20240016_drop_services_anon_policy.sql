-- Security fix: services anon read policy is unused and unnecessarily exposes
-- service data without tenant_id scoping. All public-facing routes use the
-- service_role key directly, so anon SELECT on services is never needed.
DROP POLICY IF EXISTS "services: anon read active" ON services;
