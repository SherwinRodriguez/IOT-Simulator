ALTER TABLE devices ADD COLUMN IF NOT EXISTS app_domain TEXT;

ALTER TABLE devices DROP CONSTRAINT IF EXISTS uq_user_device;

ALTER TABLE devices
    ADD CONSTRAINT uq_user_device_app UNIQUE (user_id, zoho_device_id, app_domain);

CREATE INDEX IF NOT EXISTS idx_devices_user_app_domain ON devices(user_id, app_domain);
