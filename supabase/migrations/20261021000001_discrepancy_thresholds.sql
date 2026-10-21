-- 20261021000001_discrepancy_thresholds.sql
-- Add configurable dual-threshold discrepancy alarm settings

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS discrepancy_alarm_volume_m3 NUMERIC NOT NULL DEFAULT 1.5 CHECK (discrepancy_alarm_volume_m3 > 0),
  ADD COLUMN IF NOT EXISTS discrepancy_alarm_percent NUMERIC NOT NULL DEFAULT 2.0 CHECK (discrepancy_alarm_percent > 0);

-- Migrate legacy acceptable_discrepancy_threshold_pct if present
UPDATE app_settings
SET discrepancy_alarm_percent = GREATEST(0.1, acceptable_discrepancy_threshold_pct)
WHERE discrepancy_alarm_percent IS NULL OR discrepancy_alarm_percent = 2.0 AND acceptable_discrepancy_threshold_pct != 2.0;

COMMENT ON COLUMN app_settings.discrepancy_alarm_volume_m3 IS 'Minimum negative volumetric difference (m3) to trigger alarm in OR logic';
COMMENT ON COLUMN app_settings.discrepancy_alarm_percent IS 'Minimum negative percentage difference (%) to trigger alarm in OR logic';
