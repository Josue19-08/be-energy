import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { STELLAR_CONFIG } from "@/lib/contracts-config"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch certificate with cooperative info
  const { data: cert, error } = await supabase
    .from("certificates")
    .select("*, cooperatives(name, technology, location, admin_stellar_address)")
    .eq("id", id)
    .single()

  if (error || !cert) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }

  // Fetch retirement if exists
  const { data: retirement } = await supabase
    .from("retirements")
    .select("*")
    .eq("certificate_id", id)
    .single()

  // Build Stellar Expert link for the mint tx
  const network = STELLAR_CONFIG.NETWORK === "TESTNET" ? "testnet" : "public"
  const stellarExpertLink = cert.mint_tx_hash
    ? `https://stellar.expert/explorer/${network}/tx/${cert.mint_tx_hash}`
    : null

  return NextResponse.json({
    ...cert,
    retirement: retirement ?? null,
    stellar_expert_link: stellarExpertLink,
  })
}
