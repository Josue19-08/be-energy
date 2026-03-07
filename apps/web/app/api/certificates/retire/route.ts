import { NextRequest, NextResponse } from "next/server"
import * as StellarSdk from "@stellar/stellar-sdk"
import { supabase } from "@/lib/supabase"
import { CONTRACTS, STELLAR_CONFIG, NETWORK_PASSPHRASE } from "@/lib/contracts-config"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { certificate_id, buyer_address, buyer_name, buyer_purpose } = body

    if (!certificate_id || !buyer_address || !buyer_purpose) {
      return NextResponse.json(
        { error: "Missing required fields: certificate_id, buyer_address, buyer_purpose" },
        { status: 400 }
      )
    }

    const validPurposes = [
      "esg_reporting",
      "carbon_offset",
      "voluntary_commitment",
      "regulatory_compliance",
      "other",
    ]
    if (!validPurposes.includes(buyer_purpose)) {
      return NextResponse.json(
        { error: `buyer_purpose must be one of: ${validPurposes.join(", ")}` },
        { status: 400 }
      )
    }

    // Fetch certificate
    const { data: cert, error: certError } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", certificate_id)
      .single()

    if (certError || !cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
    }

    if (cert.status !== "available") {
      return NextResponse.json(
        { error: `Certificate status is '${cert.status}', expected 'available'` },
        { status: 400 }
      )
    }

    const minterSecret = process.env.MINTER_SECRET_KEY
    if (!minterSecret) {
      return NextResponse.json({ error: "MINTER_SECRET_KEY not configured" }, { status: 500 })
    }

    const contractAddress = CONTRACTS.ENERGY_TOKEN
    if (!contractAddress) {
      return NextResponse.json({ error: "ENERGY_TOKEN contract not configured" }, { status: 500 })
    }

    // Burn on-chain
    const amountInStroops = BigInt(Math.round(cert.total_kwh * 1e7))
    const server = new StellarSdk.rpc.Server(STELLAR_CONFIG.RPC_URL)
    const minterKeypair = StellarSdk.Keypair.fromSecret(minterSecret)
    const minterPublic = minterKeypair.publicKey()
    const minterAccount = await server.getAccount(minterPublic)
    const contract = new StellarSdk.Contract(contractAddress)

    const transaction = new StellarSdk.TransactionBuilder(minterAccount, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "burn_energy",
          StellarSdk.nativeToScVal(buyer_address, { type: "address" }),
          StellarSdk.nativeToScVal(amountInStroops, { type: "i128" }),
          StellarSdk.nativeToScVal(minterPublic, { type: "address" })
        )
      )
      .setTimeout(30)
      .build()

    const preparedTx = await server.prepareTransaction(transaction)
    preparedTx.sign(minterKeypair)

    const sendResult = await server.sendTransaction(preparedTx)

    if (sendResult.status === "ERROR") {
      return NextResponse.json({ error: "Burn transaction failed to submit" }, { status: 500 })
    }

    // Poll for confirmation
    let txResponse = await server.getTransaction(sendResult.hash)
    while (txResponse.status === "NOT_FOUND") {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      txResponse = await server.getTransaction(sendResult.hash)
    }

    if (txResponse.status !== "SUCCESS") {
      return NextResponse.json(
        { error: `Burn transaction failed: ${txResponse.status}` },
        { status: 500 }
      )
    }

    const burnTxHash = sendResult.hash

    // Create retirement record
    const { data: retirement, error: retireError } = await supabase
      .from("retirements")
      .insert({
        certificate_id,
        buyer_address,
        buyer_name: buyer_name ?? null,
        buyer_purpose,
        kwh_retired: cert.total_kwh,
        burn_tx_hash: burnTxHash,
      })
      .select()
      .single()

    if (retireError) {
      return NextResponse.json({ error: retireError.message }, { status: 500 })
    }

    // Update certificate status
    await supabase
      .from("certificates")
      .update({ status: "retired" })
      .eq("id", certificate_id)

    return NextResponse.json({
      success: true,
      retirement,
      burn_tx_hash: burnTxHash,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
