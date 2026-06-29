ALTER TABLE devices ADD COLUMN IF NOT EXISTS sandbox_id UUID;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS model_id UUID;

CREATE TABLE IF NOT EXISTS models (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sandbox_id      UUID NOT NULL REFERENCES app_connections(id) ON DELETE CASCADE,
    zoho_model_id   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255),
    module_api_name VARCHAR(100) DEFAULT 'devices',
    status          VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sandbox_model UNIQUE (sandbox_id, zoho_model_id)
);

CREATE TABLE IF NOT EXISTS datapoints (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id            UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    zoho_datapoint_id   VARCHAR(255),
    name                VARCHAR(255) NOT NULL,
    parsing_key         VARCHAR(255) NOT NULL,
    data_type           VARCHAR(100),
    unit                VARCHAR(100),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_model_datapoint_parsing_key UNIQUE (model_id, parsing_key),
    CONSTRAINT uq_model_datapoint_zoho_id UNIQUE (model_id, zoho_datapoint_id)
);

UPDATE devices d
SET sandbox_id = a.id
FROM app_connections a
WHERE d.sandbox_id IS NULL
  AND d.user_id = a.user_id
  AND d.app_domain = a.app_domain;

ALTER TABLE devices DROP CONSTRAINT IF EXISTS uq_user_device_app;

ALTER TABLE devices
    ADD CONSTRAINT fk_devices_sandbox FOREIGN KEY (sandbox_id) REFERENCES app_connections(id) ON DELETE CASCADE;

ALTER TABLE devices
    ADD CONSTRAINT fk_devices_model FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_devices_sandbox_zoho_device_id
    ON devices(sandbox_id, zoho_device_id)
    WHERE sandbox_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_models_sandbox_id ON models(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_datapoints_model_id ON datapoints(model_id);
CREATE INDEX IF NOT EXISTS idx_devices_sandbox_id ON devices(sandbox_id);
