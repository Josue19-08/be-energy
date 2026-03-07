import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Legacy endpoint — proxies to the prosumers table (now with cooperative support)
// Prefer /api/members for new integrations

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { stellar_address, name, panel_capacity_kw, cooperative_id, role } = body

    if (!stellar_address) {
      return NextResponse.json(
        { error: "Missing required field: stellar_address" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("prosumers")
      .select("id")
      .eq("stellar_address", stellar_address)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "A prosumer with this stellar_address already exists" },
        { status: 409 }
      )
    }

    const { data: prosumer, error } = await supabase
      .from("prosumers")
      .insert({
        stellar_address,
        name: name ?? null,
        panel_capacity_kw: panel_capacity_kw ?? null,
        cooperative_id: cooperative_id ?? null,
        role: role ?? "prosumer",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(prosumer, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("prosumers")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
