-- CreateTable for Maintenance Alerts
CREATE TABLE IF NOT EXISTS "sensor_maintenance_logs" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "sensor_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL CHECK (alert_type IN ('FLATLINE', 'HIGH_VARIANCE', 'DROPOUT')),
    "severity" TEXT NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    "description" TEXT,
    "detected_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "acknowledged" BOOLEAN DEFAULT FALSE,
    "acknowledged_by" UUID REFERENCES auth.users(id),
    "acknowledged_at" TIMESTAMP WITH TIME ZONE,
    "resolution_notes" TEXT
);

-- CreateTable for Computed Health Scores
CREATE TABLE IF NOT EXISTS "sensor_health_scores" (
    "sensor_id" TEXT PRIMARY KEY,
    "health_score" INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    "last_evaluated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "uptime_percentage" DECIMAL(5,2) DEFAULT 100.00
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "idx_maintenance_logs_sensor_id" ON "sensor_maintenance_logs"("sensor_id");
CREATE INDEX IF NOT EXISTS "idx_maintenance_logs_acknowledged" ON "sensor_maintenance_logs"("acknowledged");

-- RLS Policies
ALTER TABLE "sensor_maintenance_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON "sensor_maintenance_logs" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update for admins" ON "sensor_maintenance_logs" FOR UPDATE USING (auth.role() = 'authenticated');
