import "dotenv/config"

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000"

interface Meter {
  id: string
  cooperative_id: string
  capacity_kw: number
  technology: string
  status: string
}

/**
 * Solar generation curve — Gaussian centered at 13:00, sigma ~3h.
 * Returns a factor 0..1 representing generation intensity at a given hour.
 */
function solarFactor(hour: number): number {
  const peak = 13
  const sigma = 3
  return Math.exp(-0.5 * ((hour - peak) / sigma) ** 2)
}

/**
 * Generate realistic kWh for a 15-minute interval.
 */
function generateReading(capacityKw: number, timestamp: Date): {
  kwh_generated: number
  power_watts: number
} {
  const hour = timestamp.getHours() + timestamp.getMinutes() / 60
  const solar = solarFactor(hour)

  // No generation at night
  if (solar < 0.01) {
    return { kwh_generated: 0, power_watts: 0 }
  }

  // Weather/cloud factor: 0.6 to 1.0
  const weatherFactor = 0.6 + Math.random() * 0.4

  // Power in kW at this instant
  const powerKw = capacityKw * solar * weatherFactor

  // Energy over 15 minutes = powerKw * (15/60) hours
  const kwhGenerated = powerKw * (15 / 60)

  return {
    kwh_generated: Math.round(kwhGenerated * 1000) / 1000,
    power_watts: Math.round(powerKw * 1000),
  }
}

async function fetchActiveMeters(cooperativeId: string): Promise<Meter[]> {
  const url = `${API_BASE}/api/meters?cooperative_id=${cooperativeId}&status=active`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch meters: ${res.statusText}`)
  return res.json()
}

async function postReadings(
  meterId: string,
  readings: Array<{
    kwh_generated: number
    reading_timestamp: string
    power_watts: number
    interval_minutes: number
  }>
) {
  const res = await fetch(`${API_BASE}/api/meters/readings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meter_id: meterId, readings }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`POST readings failed: ${(err as { error?: string }).error || res.statusText}`)
  }
  return res.json()
}

/**
 * Generate readings for a single meter for a full day.
 */
function generateDayReadings(meter: Meter, date: Date) {
  const readings = []
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const ts = new Date(date)
    ts.setHours(0, 0, 0, 0)
    ts.setMinutes(minutes)

    const { kwh_generated, power_watts } = generateReading(meter.capacity_kw, ts)

    // Skip zero-generation intervals to reduce noise
    if (kwh_generated === 0) continue

    readings.push({
      kwh_generated,
      power_watts,
      reading_timestamp: ts.toISOString(),
      interval_minutes: 15,
    })
  }
  return readings
}

async function backfill(cooperativeId: string, days: number) {
  console.log(`Backfilling ${days} days for cooperative ${cooperativeId}...`)

  const meters = await fetchActiveMeters(cooperativeId)
  if (meters.length === 0) {
    console.log("No active meters found.")
    return
  }

  console.log(`Found ${meters.length} active meter(s).`)

  const now = new Date()
  for (let d = days; d >= 1; d--) {
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    const dateStr = date.toISOString().split("T")[0]

    for (const meter of meters) {
      const readings = generateDayReadings(meter, date)
      if (readings.length === 0) continue

      const totalKwh = readings.reduce((s, r) => s + r.kwh_generated, 0)
      try {
        const result = await postReadings(meter.id, readings)
        console.log(
          `  ${dateStr} | meter ${meter.id.slice(0, 8)}… | ${readings.length} readings | ${totalKwh.toFixed(2)} kWh | inserted: ${result.inserted}`
        )
      } catch (err) {
        console.error(`  ${dateStr} | meter ${meter.id.slice(0, 8)}… | ERROR: ${err}`)
      }
    }
  }

  console.log("Backfill complete.")
}

async function continuous(cooperativeId: string) {
  console.log(`Starting continuous mode for cooperative ${cooperativeId}...`)
  console.log("Sending readings every 15 minutes. Press Ctrl+C to stop.\n")

  const tick = async () => {
    const meters = await fetchActiveMeters(cooperativeId)
    const now = new Date()

    for (const meter of meters) {
      const { kwh_generated, power_watts } = generateReading(meter.capacity_kw, now)
      if (kwh_generated === 0) {
        console.log(`  ${now.toISOString()} | meter ${meter.id.slice(0, 8)}… | 0 kWh (night)`)
        continue
      }

      try {
        await postReadings(meter.id, [
          {
            kwh_generated,
            power_watts,
            reading_timestamp: now.toISOString(),
            interval_minutes: 15,
          },
        ])
        console.log(
          `  ${now.toISOString()} | meter ${meter.id.slice(0, 8)}… | ${kwh_generated} kWh | ${power_watts}W`
        )
      } catch (err) {
        console.error(`  ERROR meter ${meter.id.slice(0, 8)}…: ${err}`)
      }
    }
  }

  await tick()
  setInterval(tick, 15 * 60 * 1000)
}

// --- CLI ---
async function main() {
  const args = process.argv.slice(2)
  const cooperativeId = process.env.COOPERATIVE_ID

  if (!cooperativeId) {
    console.error("Set COOPERATIVE_ID env var (UUID of the target cooperative)")
    process.exit(1)
  }

  if (args.includes("--backfill")) {
    const idx = args.indexOf("--backfill")
    const days = parseInt(args[idx + 1] || "7", 10)
    await backfill(cooperativeId, days)
  } else if (args.includes("--continuous")) {
    await continuous(cooperativeId)
  } else {
    console.log("Usage:")
    console.log("  npx tsx scripts/smart-meter-mock.ts --backfill [days]")
    console.log("  npx tsx scripts/smart-meter-mock.ts --continuous")
    console.log("\nSet COOPERATIVE_ID env var before running.")
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
