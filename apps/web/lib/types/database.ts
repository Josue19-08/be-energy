export interface Cooperative {
  id: string
  name: string
  location: string | null
  province: string | null
  country: string
  technology: "solar" | "wind" | "hydro" | "mixed"
  admin_stellar_address: string
  token_contract_address: string | null
  distribution_contract_address: string | null
  status: "active" | "inactive"
  created_at: string
}

export interface Member {
  id: string
  stellar_address: string
  name: string | null
  hive_id: string
  panel_capacity_kw: number | null
  cooperative_id: string | null
  role: "prosumer" | "copropietario" | "mixed"
  created_at: string
}

export interface Meter {
  id: string
  cooperative_id: string
  member_stellar_address: string
  device_type: "inverter" | "bidirectional_meter" | "smart_meter"
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  location_lat: number | null
  location_lng: number | null
  technology: "solar" | "wind" | "hydro" | "biomass"
  capacity_kw: number
  installed_at: string | null
  status: "active" | "inactive" | "maintenance"
  created_at: string
}

export interface Reading {
  id: string
  prosumer_id: string | null
  meter_id: string | null
  cooperative_id: string | null
  kwh_generated: number
  kwh_self_consumed: number | null
  power_watts: number | null
  interval_minutes: number
  reading_date: string | null
  reading_timestamp: string | null
  source: string
  status: string
  tx_hash: string | null
  created_at: string
}

export interface Certificate {
  id: string
  cooperative_id: string
  generation_period_start: string
  generation_period_end: string
  total_kwh: number
  technology: string
  location: string | null
  mint_tx_hash: string | null
  token_amount: number | null
  status: "pending" | "available" | "sold" | "retired"
  created_at: string
}

export interface Retirement {
  id: string
  certificate_id: string
  buyer_address: string
  buyer_name: string | null
  buyer_purpose:
    | "esg_reporting"
    | "carbon_offset"
    | "voluntary_commitment"
    | "regulatory_compliance"
    | "other"
  kwh_retired: number
  burn_tx_hash: string | null
  retired_at: string
}

export interface MintLog {
  id: string
  reading_id: string | null
  certificate_id: string | null
  prosumer_address: string
  amount_hdrop: number
  tx_hash: string
  minted_at: string
}
