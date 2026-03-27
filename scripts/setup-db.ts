import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

// Load env from apps/web/.env.local (run from repo root)
config({ path: "apps/web/.env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const SQL = `
-- ============================================
-- BeEnergy Schema v2 — Certification Model
-- Handles both fresh installs and migrations
-- ============================================

-- 1. New tables
CREATE TABLE IF NOT EXISTS cooperatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  province TEXT,
  country TEXT DEFAULT 'AR',
  technology TEXT NOT NULL CHECK (technology IN ('solar', 'wind', 'hydro', 'mixed')),
  admin_stellar_address TEXT NOT NULL,
  token_contract_address TEXT,
  distribution_contract_address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  member_stellar_address TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('inverter', 'bidirectional_meter', 'smart_meter')),
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  location_lat REAL,
  location_lng REAL,
  technology TEXT NOT NULL CHECK (technology IN ('solar', 'wind', 'hydro', 'biomass')),
  capacity_kw REAL NOT NULL,
  installed_at DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  generation_period_start DATE NOT NULL,
  generation_period_end DATE NOT NULL,
  total_kwh REAL NOT NULL,
  technology TEXT NOT NULL,
  location TEXT,
  mint_tx_hash TEXT,
  token_amount REAL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'sold', 'retired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id),
  buyer_address TEXT NOT NULL,
  buyer_name TEXT,
  buyer_purpose TEXT NOT NULL CHECK (buyer_purpose IN (
    'esg_reporting', 'carbon_offset', 'voluntary_commitment',
    'regulatory_compliance', 'other'
  )),
  kwh_retired REAL NOT NULL,
  burn_tx_hash TEXT,
  retired_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Migrate existing prosumers table (add new columns if missing)
ALTER TABLE prosumers ADD COLUMN IF NOT EXISTS cooperative_id UUID REFERENCES cooperatives(id);
ALTER TABLE prosumers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'prosumer';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'prosumers_role_check'
  ) THEN
    ALTER TABLE prosumers ADD CONSTRAINT prosumers_role_check
      CHECK (role IN ('prosumer', 'copropietario', 'mixed'));
  END IF;
END $$;

-- 3. Migrate existing readings table (add new columns if missing)
ALTER TABLE readings ADD COLUMN IF NOT EXISTS meter_id UUID REFERENCES meters(id);
ALTER TABLE readings ADD COLUMN IF NOT EXISTS cooperative_id UUID REFERENCES cooperatives(id);
ALTER TABLE readings ADD COLUMN IF NOT EXISTS kwh_generated REAL;
ALTER TABLE readings ADD COLUMN IF NOT EXISTS kwh_self_consumed REAL;
ALTER TABLE readings ADD COLUMN IF NOT EXISTS power_watts REAL;
ALTER TABLE readings ADD COLUMN IF NOT EXISTS interval_minutes INTEGER DEFAULT 15;
ALTER TABLE readings ADD COLUMN IF NOT EXISTS reading_timestamp TIMESTAMPTZ;

-- Copy legacy data to new columns (only rows that haven't been migrated)
UPDATE readings SET kwh_generated = kwh_injected WHERE kwh_generated IS NULL AND kwh_injected IS NOT NULL;
UPDATE readings SET kwh_self_consumed = kwh_consumed WHERE kwh_self_consumed IS NULL AND kwh_consumed IS NOT NULL;

-- Make kwh_generated NOT NULL after migration (with default for safety)
ALTER TABLE readings ALTER COLUMN kwh_generated SET DEFAULT 0;
UPDATE readings SET kwh_generated = 0 WHERE kwh_generated IS NULL;
ALTER TABLE readings ALTER COLUMN kwh_generated SET NOT NULL;

-- 4. Migrate existing mint_log table
ALTER TABLE mint_log ADD COLUMN IF NOT EXISTS certificate_id UUID;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'mint_log_certificate_id_fkey'
  ) THEN
    ALTER TABLE mint_log ADD CONSTRAINT mint_log_certificate_id_fkey
      FOREIGN KEY (certificate_id) REFERENCES certificates(id);
  END IF;
END $$;

-- 5. Drop legacy P2P table
DROP TABLE IF EXISTS offers;

-- 6. Auth challenges (wallet signature auth)
CREATE TABLE IF NOT EXISTS auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_address TEXT NOT NULL,
  challenge TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Rate limiting (serverless-compatible)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

-- 8. Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Events table (for activity feed)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('mint', 'burn')),
  amount REAL NOT NULL,
  tx_hash TEXT NOT NULL,
  cooperative_id UUID REFERENCES cooperatives(id),
  stellar_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
`

async function main() {
  console.log("Creating tables (certification model v2)...")
  const { error } = await supabase.rpc("exec_sql", { query: SQL })

  if (error) {
    console.error("Could not execute SQL via RPC:", error.message)
    console.log("\nRun the following SQL directly in the Supabase SQL Editor:\n")
    console.log(SQL)
    process.exit(1)
  }

  console.log("Tables created successfully!")
}

main()
