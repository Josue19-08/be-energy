import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cooperativeId = searchParams.get("cooperative_id")
  const status = searchParams.get("status")

  let query = supabase
    .from("meters")
    .select("*")
    .order("created_at", { ascending: false })

  if (cooperativeId) query = query.eq("cooperative_id", cooperativeId)
  if (status) query = query.eq("status", status)

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
      member_stellar_address,
      device_type,
      technology,
      capacity_kw,
      manufacturer,
      model,
      serial_number,
      location_lat,
      location_lng,
      installed_at,
    } = body

    if (!cooperative_id || !member_stellar_address || !device_type || !technology || !capacity_kw) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: cooperative_id, member_stellar_address, device_type, technology, capacity_kw",
        },
        { status: 400 }
      )
    }

    const validDeviceTypes = ["inverter", "bidirectional_meter", "smart_meter"]
    if (!validDeviceTypes.includes(device_type)) {
      return NextResponse.json(
        { error: `device_type must be one of: ${validDeviceTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const validTech = ["solar", "wind", "hydro", "biomass"]
    if (!validTech.includes(technology)) {
      return NextResponse.json(
        { error: `technology must be one of: ${validTech.join(", ")}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("meters")
      .insert({
        cooperative_id,
        member_stellar_address,
        device_type,
        technology,
        capacity_kw,
        manufacturer: manufacturer ?? null,
        model: model ?? null,
        serial_number: serial_number ?? null,
        location_lat: location_lat ?? null,
        location_lng: location_lng ?? null,
        installed_at: installed_at ?? null,
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
