import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const technology = searchParams.get("technology")

  let query = supabase
    .from("cooperatives")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)
  if (technology) query = query.eq("technology", technology)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, technology, admin_stellar_address, location, province } = body

    if (!name || !technology || !admin_stellar_address) {
      return NextResponse.json(
        { error: "Missing required fields: name, technology, admin_stellar_address" },
        { status: 400 }
      )
    }

    const validTech = ["solar", "wind", "hydro", "mixed"]
    if (!validTech.includes(technology)) {
      return NextResponse.json(
        { error: `technology must be one of: ${validTech.join(", ")}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("cooperatives")
      .insert({
        name,
        technology,
        admin_stellar_address,
        location: location ?? null,
        province: province ?? null,
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
