import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cooperativeId = searchParams.get("cooperative_id")

  let query = supabase
    .from("prosumers")
    .select("*")
    .order("created_at", { ascending: false })

  if (cooperativeId) query = query.eq("cooperative_id", cooperativeId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { stellar_address, cooperative_id, name, panel_capacity_kw, role } = body

    if (!stellar_address || !cooperative_id) {
      return NextResponse.json(
        { error: "Missing required fields: stellar_address, cooperative_id" },
        { status: 400 }
      )
    }

    // Check if address already exists
    const { data: existing } = await supabase
      .from("prosumers")
      .select("id")
      .eq("stellar_address", stellar_address)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "A member with this stellar_address already exists" },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from("prosumers")
      .insert({
        stellar_address,
        cooperative_id,
        name: name ?? null,
        panel_capacity_kw: panel_capacity_kw ?? null,
        role: role ?? "prosumer",
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
