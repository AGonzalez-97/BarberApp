UPDATE tenants
SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{end_hour}', '21')
WHERE id = '00000000-0000-0000-0000-000000000001';
