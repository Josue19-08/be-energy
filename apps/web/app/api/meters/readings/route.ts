import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { meter_id, readings } = body

    if (!meter_id || !Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: meter_id, readings (non-empty array)" },
        { status: 400 }
      )
    }

    // Validate meter exists and is active
    const { data: meter, error: meterError } = await supabase
      .from("meters")
      .select("id, cooperative_id, status")
      .eq("id", meter_id)
      .single()

    if (meterError || !meter) {
      return NextResponse.json({ error: "Meter not found" }, { status: 404 })
    }

    if (meter.status !== "active") {
      return NextResponse.json(
        { error: `Meter status is '${meter.status}', expected 'active'` },
        { status: 400 }
      )
    }

    // Build rows for batch insert
    const rows = readings.map(
      (r: {
        kwh_generated: number
        reading_timestamp?: string
        reading_date?: string
        power_watts?: number
        interval_minutes?: number
        kwh_self_consumed?: number
      }) => ({
        meter_id,
        cooperative_id: meter.cooperative_id,
        kwh_generated: r.kwh_generated,
        kwh_self_consumed: r.kwh_self_consumed ?? null,
        power_watts: r.power_watts ?? null,
        interval_minutes: r.interval_minutes ?? 15,
        reading_timestamp: r.reading_timestamp ?? null,
        reading_date: r.reading_date ?? null,
        source: "meter",
        status: "pending",
      })
    )

    const { data, error: insertError } = await supabase
      .from("readings")
      .insert(rows)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      { inserted: data?.length ?? 0, readings: data },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
