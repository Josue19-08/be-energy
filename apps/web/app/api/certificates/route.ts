import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cooperativeId = searchParams.get("cooperative_id")
  const technology = searchParams.get("technology")
  const status = searchParams.get("status")
  const periodStart = searchParams.get("period_start")
  const periodEnd = searchParams.get("period_end")

  let query = supabase
    .from("certificates")
    .select("*, cooperatives(name, technology, location)")
    .order("created_at", { ascending: false })

  if (cooperativeId) query = query.eq("cooperative_id", cooperativeId)
  if (technology) query = query.eq("technology", technology)
  if (status) query = query.eq("status", status)
  if (periodStart) query = query.gte("generation_period_start", periodStart)
  if (periodEnd) query = query.lte("generation_period_end", periodEnd)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      cooperative_id,
      generation_period_start,
      generation_period_end,
      total_kwh,
      technology,
      location,
    } = body

    if (!cooperative_id || !generation_period_start || !generation_period_end || !total_kwh || !technology) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: cooperative_id, generation_period_start, generation_period_end, total_kwh, technology",
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("certificates")
      .insert({
        cooperative_id,
        generation_period_start,
        generation_period_end,
        total_kwh,
        technology,
        location: location ?? null,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
