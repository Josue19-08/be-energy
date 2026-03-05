import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("offers")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false})

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { seller_address, amount_kwh, price_per_kwh, total_xlm } = body

        if (!seller_address || !amount_kwh || !price_per_kwh || !total_xlm) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (typeof amount_kwh !== "number" || amount_kwh <= 0 ||
            typeof price_per_kwh !== "number" || price_per_kwh <= 0 ||
            typeof total_xlm !== "number" || total_xlm <= 0) {
            return NextResponse.json({ error: "Numeric fields must be positive numbers" }, { status: 400 })
        }

        const seller_short = `${seller_address.slice(0, 4)}...${seller_address.slice(-4)}`

        const { data, error } = await supabase
            .from("offers")
            .insert({
                seller_address,
                seller_short,
                amount_kwh,
                price_per_kwh,
                total_xlm,
                status: "active"
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: "Failed to create offer" }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { id, status, tx_hash } = body

        if (!id || !status) {
            return NextResponse.json({ error: "Missing required fields: id and status" }, { status: 400 })
        }

        if (status !== "sold") {
            return NextResponse.json({ error: "Invalid status transition. Allowed: sold" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("offers")
            .update({ status, tx_hash })
            .eq("id", id)
            .select()
            .single()
        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: "Failed to update offer" }, { status: 500 })
    }
}

