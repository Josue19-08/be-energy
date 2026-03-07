import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      stellar_address,
      meter_id,
      // Support both old and new field names
      kwh_injected,
      kwh_generated,
      kwh_consumed,
      kwh_self_consumed,
      reading_date,
      reading_timestamp,
      power_watts,
      interval_minutes,
      cooperative_id,
    } = body

    const kwhGen = kwh_generated ?? kwh_injected
    const kwhSelf = kwh_self_consumed ?? kwh_consumed

    if (!stellar_address && !meter_id) {
      return NextResponse.json(
        { error: "Missing required field: stellar_address or meter_id" },
        { status: 400 }
      )
    }

    if (kwhGen == null || (!reading_date && !reading_timestamp)) {
      return NextResponse.json(
        { error: "Missing required fields: kwh_generated (or kwh_injected), reading_date (or reading_timestamp)" },
        { status: 400 }
      )
    }

    if (kwhGen <= 0 || kwhGen >= 1000) {
      return NextResponse.json(
        { error: "kwh_generated must be > 0 and < 1000" },
        { status: 400 }
      )
    }

    let prosumerId: string | null = null
    let coopId: string | null = cooperative_id ?? null

    if (stellar_address) {
      // Legacy path: lookup prosumer
      const { data: prosumer, error: prosumerError } = await supabase
        .from("prosumers")
        .select("id, cooperative_id")
        .eq("stellar_address", stellar_address)
        .single()

      if (prosumerError || !prosumer) {
        return NextResponse.json(
          { error: "Prosumer not found for this stellar_address" },
          { status: 404 }
        )
      }

      prosumerId = prosumer.id
      if (!coopId) coopId = prosumer.cooperative_id
    }

    if (meter_id) {
      // New path: lookup meter for cooperative_id
      const { data: meter } = await supabase
        .from("meters")
        .select("cooperative_id")
        .eq("id", meter_id)
        .single()

      if (meter && !coopId) coopId = meter.cooperative_id
    }

    // Check for duplicate reading on the same date (legacy compat)
    if (prosumerId && reading_date) {
      const { data: existing } = await supabase
        .from("readings")
        .select("id")
        .eq("prosumer_id", prosumerId)
        .eq("reading_date", reading_date)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: "A reading already exists for this prosumer on this date" },
          { status: 409 }
        )
      }
    }

    const { data: reading, error: insertError } = await supabase
      .from("readings")
      .insert({
        prosumer_id: prosumerId,
        meter_id: meter_id ?? null,
        cooperative_id: coopId,
        kwh_generated: kwhGen,
        kwh_self_consumed: kwhSelf ?? null,
        power_watts: power_watts ?? null,
        interval_minutes: interval_minutes ?? 15,
        reading_date: reading_date ?? null,
        reading_timestamp: reading_timestamp ?? null,
        source: meter_id ? "meter" : "manual",
        status: "pending",
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(reading, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
