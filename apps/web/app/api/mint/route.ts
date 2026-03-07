import { NextRequest, NextResponse } from "next/server"
import * as StellarSdk from "@stellar/stellar-sdk"
import { supabase } from "@/lib/supabase"
import { CONTRACTS, STELLAR_CONFIG, NETWORK_PASSPHRASE } from "@/lib/contracts-config"

async function markFailed(readingId: string, reason: string) {
  await supabase
    .from("readings")
    .update({ status: "failed" })
    .eq("id", readingId)
  return NextResponse.json({ error: reason }, { status: 500 })
}

async function mintOnChain(
  toAddress: string,
  amountKwh: number,
  minterSecret: string,
  contractAddress: string
) {
  const amountInStroops = BigInt(Math.round(amountKwh * 1e7))
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
        "mint_energy",
        StellarSdk.nativeToScVal(toAddress, { type: "address" }),
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
    throw new Error("Transaction failed to submit")
  }

  let txResponse = await server.getTransaction(sendResult.hash)
  while (txResponse.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    txResponse = await server.getTransaction(sendResult.hash)
  }

  if (txResponse.status !== "SUCCESS") {
    throw new Error(`Transaction failed with status: ${txResponse.status}`)
  }

  return sendResult.hash
}

export async function POST(req: NextRequest) {
  let readingId: string | undefined

  try {
    const body = await req.json()
    readingId = body.reading_id
    const certificateId: string | undefined = body.certificate_id

    if (!readingId && !certificateId) {
      return NextResponse.json(
        { error: "Missing reading_id or certificate_id" },
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

    // --- Certificate flow ---
    if (certificateId) {
      const { data: cert, error: certError } = await supabase
        .from("certificates")
        .select("*, cooperatives(admin_stellar_address, token_contract_address)")
        .eq("id", certificateId)
        .single()

      if (certError || !cert) {
        return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
      }

      if (cert.status !== "pending") {
        return NextResponse.json(
          { error: `Certificate status is '${cert.status}', expected 'pending'` },
          { status: 400 }
        )
      }

      const coop = cert.cooperatives as {
        admin_stellar_address: string
        token_contract_address: string | null
      }
      const mintTo = coop.admin_stellar_address
      const tokenContract = coop.token_contract_address || contractAddress

      const txHash = await mintOnChain(mintTo, cert.total_kwh, minterSecret, tokenContract)

      // Update certificate
      await supabase
        .from("certificates")
        .update({
          status: "available",
          mint_tx_hash: txHash,
          token_amount: cert.total_kwh,
        })
        .eq("id", certificateId)

      // Log
      await supabase.from("mint_log").insert({
        certificate_id: certificateId,
        prosumer_address: mintTo,
        amount_hdrop: cert.total_kwh,
        tx_hash: txHash,
      })

      return NextResponse.json({
        success: true,
        tx_hash: txHash,
        certificate_id: certificateId,
        amount_kwh: cert.total_kwh,
        mint_to: mintTo,
      })
    }

    // --- Legacy reading flow ---
    const { data: reading, error: readingError } = await supabase
      .from("readings")
      .select("*, prosumers(stellar_address)")
      .eq("id", readingId!)
      .single()

    if (readingError || !reading) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 })
    }

    if (reading.status !== "pending") {
      return NextResponse.json(
        { error: `Reading status is '${reading.status}', expected 'pending'` },
        { status: 400 }
      )
    }

    const prosumerAddress = reading.prosumers.stellar_address
    // Support both old and new column names
    const kwhAmount = reading.kwh_generated ?? reading.kwh_injected

    const txHash = await mintOnChain(prosumerAddress, kwhAmount, minterSecret, contractAddress)

    await supabase
      .from("readings")
      .update({ status: "minted", tx_hash: txHash })
      .eq("id", readingId!)

    await supabase.from("mint_log").insert({
      reading_id: readingId,
      prosumer_address: prosumerAddress,
      amount_hdrop: kwhAmount,
      tx_hash: txHash,
    })

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      amount_hdrop: kwhAmount,
      prosumer_address: prosumerAddress,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    if (readingId) {
      return markFailed(readingId, message)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
