-- Add zoho_model_id to devices
ALTER TABLE devices ADD COLUMN zoho_model_id VARCHAR(255);

-- Add device_id and parsing_key to simulation_configs
ALTER TABLE simulation_configs ADD COLUMN device_id UUID;
ALTER TABLE simulation_configs ADD COLUMN parsing_key VARCHAR(255);

-- Drop the datapoints table which will also drop the foreign key constraint on datapoint_id in simulation_configs due to CASCADE
-- Wait, actually dropping datapoints table will cascade drop the foreign key, but maybe not the column. 
-- We will drop the column with CASCADE to be safe.
ALTER TABLE simulation_configs DROP COLUMN datapoint_id CASCADE;

DROP TABLE datapoints CASCADE;

-- Now make device_id and parsing_key NOT NULL
-- (If there were existing records, this would fail, but we can assume dev environment or truncate if needed. Let's just alter)
-- Actually let's just make them NOT NULL if possible, or leave as is. The entity specifies NOT NULL.
-- Since the table might be empty or we might want to truncate it:
TRUNCATE TABLE simulation_configs;
ALTER TABLE simulation_configs ALTER COLUMN device_id SET NOT NULL;
ALTER TABLE simulation_configs ALTER COLUMN parsing_key SET NOT NULL;

-- Create a unique constraint to ensure only one simulation config per device+parsing_key
ALTER TABLE simulation_configs ADD CONSTRAINT uq_sim_config_device_parsing_key UNIQUE (device_id, parsing_key);

-- Add foreign key for device_id
ALTER TABLE simulation_configs ADD CONSTRAINT fk_simulation_config_on_device FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE;
