-- V1: Initial Zoho IoT Platform Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- users: OAuth-authenticated Zoho users
-- ============================================================
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zoho_user_id      VARCHAR(100) NOT NULL UNIQUE,
    email             VARCHAR(255) NOT NULL,
    display_name      VARCHAR(255),
    region            VARCHAR(10)  NOT NULL DEFAULT 'in',
    access_token      TEXT,           -- AES-256 encrypted
    refresh_token     TEXT,           -- AES-256 encrypted
    token_expires_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- devices: Synced from Zoho IoT Devices API
-- ============================================================
CREATE TABLE devices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zoho_device_id   VARCHAR(100) NOT NULL,
    name             VARCHAR(255) NOT NULL,
    device_type      VARCHAR(100),
    connectivity     VARCHAR(50),
    mqtt_client_id   VARCHAR(255),
    mqtt_username    VARCHAR(255),
    mqtt_password    TEXT,            -- AES-256 encrypted
    publish_topic    VARCHAR(500),
    status           VARCHAR(20) NOT NULL DEFAULT 'STOPPED',
    last_synced_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_device UNIQUE (user_id, zoho_device_id)
);
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- ============================================================
-- datapoints: Synced from Zoho IoT Datapoints API
-- ============================================================
CREATE TABLE datapoints (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id      UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    zoho_dp_id     VARCHAR(100),
    name           VARCHAR(255) NOT NULL,
    unit           VARCHAR(50),
    data_type      VARCHAR(50) NOT NULL DEFAULT 'NUMERIC',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_device_datapoint UNIQUE (device_id, name)
);
CREATE INDEX idx_datapoints_device_id ON datapoints(device_id);

-- ============================================================
-- simulation_configs: Per-datapoint pattern configuration
-- ============================================================
CREATE TABLE simulation_configs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datapoint_id         UUID NOT NULL UNIQUE REFERENCES datapoints(id) ON DELETE CASCADE,
    pattern              VARCHAR(20) NOT NULL DEFAULT 'RANDOM',
    min_value            DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_value            DOUBLE PRECISION NOT NULL DEFAULT 100,
    start_value          DOUBLE PRECISION NOT NULL DEFAULT 0,
    step_value           DOUBLE PRECISION NOT NULL DEFAULT 1,
    publish_interval_ms  INTEGER NOT NULL DEFAULT 5000
);

-- ============================================================
-- telemetry_cache: Rolling last-100 points per datapoint
-- ============================================================
CREATE TABLE telemetry_cache (
    id              BIGSERIAL PRIMARY KEY,
    device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    datapoint_name  VARCHAR(255) NOT NULL,
    value           DOUBLE PRECISION,
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_telemetry_device_dp_time
    ON telemetry_cache(device_id, datapoint_name, recorded_at DESC);
