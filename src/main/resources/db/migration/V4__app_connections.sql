-- V2: App Connections — support multiple Sandbox applications per user
-- Each user can save multiple Zoho IoT application domains and switch between them

ALTER TABLE users ADD COLUMN IF NOT EXISTS app_domain TEXT;

CREATE TABLE IF NOT EXISTS app_connections (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_domain  TEXT        NOT NULL,          -- e.g. https://app19310rjfay.zohoiot.in
    app_name    VARCHAR(255),                  -- friendly name, e.g. "Simulator"
    is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_app_domain UNIQUE (user_id, app_domain)
);

CREATE INDEX IF NOT EXISTS idx_app_connections_user_id ON app_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_app_connections_active  ON app_connections(user_id, is_active);
