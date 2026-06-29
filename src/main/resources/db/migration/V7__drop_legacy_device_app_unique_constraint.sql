DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'devices'
          AND c.contype = 'u'
          AND (
              SELECT array_agg(a.attname ORDER BY a.attname)
              FROM unnest(c.conkey) AS cols(attnum)
              JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
          ) = ARRAY['app_domain'::name, 'user_id'::name, 'zoho_device_id'::name]
    LOOP
        EXECUTE format('ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

DROP INDEX IF EXISTS idx_devices_user_app_domain;

UPDATE devices d
SET sandbox_id = a.id
FROM app_connections a
WHERE d.sandbox_id IS NULL
  AND d.user_id = a.user_id
  AND d.app_domain = a.app_domain;
