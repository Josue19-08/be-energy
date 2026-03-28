import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin, isSession } from "@/lib/auth/middleware"
import { validateBody } from "@/lib/validation/validate"
import { createCertificateSchema } from "@/lib/validation/schemas"
import { safeDbError, safeCatchError } from "@/lib/errors/safe-error"

// GET: public (transparency)
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

  if (error) return safeDbError(error)

  return NextResponse.json(data)
}

// POST: admin — creates pending certificate for cooperative
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const v = validateBody(createCertificateSchema, body)
    if (!v.success) return v.response

    const session = await requireAdmin(v.data.cooperative_id)
    if (!isSession(session)) return session

    // Check for verified readings in the certificate period
    const { data: verifiedReadings, error: readingsError } = await supabase
      .from("readings")
      .select("id")
      .eq("cooperative_id", v.data.cooperative_id)
      .eq("status", "verified")
      .gte("reading_date", v.data.generation_period_start)
      .lte("reading_date", v.data.generation_period_end)
      .limit(1)

    if (readingsError) return safeDbError(readingsError)

    if (!verifiedReadings || verifiedReadings.length === 0) {
      return NextResponse.json(
        { error: "No verified readings for this period" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("certificates")
      .insert({
        cooperative_id: v.data.cooperative_id,
        generation_period_start: v.data.generation_period_start,
        generation_period_end: v.data.generation_period_end,
        total_kwh: v.data.total_kwh,
        technology: v.data.technology,
        location: v.data.location ?? null,
        status: "pending",
      })
      .select()
      .single()

    if (error) return safeDbError(error)

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return safeCatchError(err)
  }
}
