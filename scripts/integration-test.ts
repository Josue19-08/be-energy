/**
 * Integration test — circuito completo BeEnergy en Stellar Testnet
 *
 * Flujo real:
 *   1. Crear wallets + fondear con Friendbot
 *   2. Crear cooperativa (admin = wallet A)
 *   3. Agregar prosumer (wallet B) + crear meter
 *   4. Enviar readings + crear certificado + mint on-chain
 *   5. Retirar certificado (burn on-chain)
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import * as StellarSdk from "@stellar/stellar-sdk"

config({ path: "apps/web/.env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org"
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
const CONTRACT = process.env.NEXT_PUBLIC_ENERGY_TOKEN_CONTRACT!
const MINTER_SECRET = process.env.MINTER_SECRET_KEY!

// ─── Helpers ───

function log(test: number, msg: string) {
  console.log(`\n[Test ${test}/5] ${msg}`)
}

function ok(test: number, msg: string) {
  console.log(`  ✅ ${msg}`)
}

function fail(test: number, msg: string) {
  console.error(`  ❌ ${msg}`)
  process.exit(1)
}

async function fundWithFriendbot(address: string) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${address}`)
  if (!res.ok) throw new Error(`Friendbot failed for ${address}: ${res.status}`)
}

async function mintOnChain(toAddress: string, amountKwh: number): Promise<string> {
  const amountInStroops = BigInt(Math.round(amountKwh * 1e7))
  const server = new StellarSdk.rpc.Server(RPC_URL)
  const minterKeypair = StellarSdk.Keypair.fromSecret(MINTER_SECRET)
  const minterPublic = minterKeypair.publicKey()
  const minterAccount = await server.getAccount(minterPublic)
  const contract = new StellarSdk.Contract(CONTRACT)

  const tx = new StellarSdk.TransactionBuilder(minterAccount, {
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

  let prepared: StellarSdk.Transaction
  try {
    prepared = await server.prepareTransaction(tx) as StellarSdk.Transaction
  } catch (e: any) {
    console.error("  ⚠️  Mint prepareTransaction error:", e?.message || e)
    throw e
  }
  prepared.sign(minterKeypair)

  const sendResult = await server.sendTransaction(prepared)
  if (sendResult.status === "ERROR") {
    console.error("  ⚠️  Mint sendTransaction error:", JSON.stringify(sendResult, null, 2))
    throw new Error("Mint tx failed to submit")
  }

  let response = await server.getTransaction(sendResult.hash)
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1500))
    response = await server.getTransaction(sendResult.hash)
  }

  if (response.status !== "SUCCESS") {
    console.error("  ⚠️  Mint tx failed on-chain:", JSON.stringify(response, null, 2))
    throw new Error(`Mint tx failed: ${response.status}`)
  }
  return sendResult.hash
}

async function burnOnChain(amountKwh: number): Promise<string> {
  const amountInStroops = BigInt(Math.round(amountKwh * 1e7))
  const server = new StellarSdk.rpc.Server(RPC_URL)
  const minterKeypair = StellarSdk.Keypair.fromSecret(MINTER_SECRET)
  const minterPublic = minterKeypair.publicKey()
  const minterAccount = await server.getAccount(minterPublic)
  const contract = new StellarSdk.Contract(CONTRACT)

  // Burn from minter's own address (custodial model: minter holds tokens)
  const tx = new StellarSdk.TransactionBuilder(minterAccount, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "burn_energy",
        StellarSdk.nativeToScVal(minterPublic, { type: "address" }),
        StellarSdk.nativeToScVal(amountInStroops, { type: "i128" })
      )
    )
    .setTimeout(30)
    .build()

  let prepared: StellarSdk.Transaction
  try {
    prepared = await server.prepareTransaction(tx) as StellarSdk.Transaction
  } catch (e: any) {
    console.error("  ⚠️  Burn prepareTransaction error:", e?.message || e)
    throw e
  }
  prepared.sign(minterKeypair)

  const sendResult = await server.sendTransaction(prepared)
  if (sendResult.status === "ERROR") {
    console.error("  ⚠️  Burn sendTransaction error:", JSON.stringify(sendResult, null, 2))
    throw new Error("Burn tx failed to submit")
  }

  let response = await server.getTransaction(sendResult.hash)
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1500))
    response = await server.getTransaction(sendResult.hash)
  }

  if (response.status !== "SUCCESS") {
    console.error("  ⚠️  Burn tx failed on-chain:", JSON.stringify(response, null, 2))
    throw new Error(`Burn tx failed: ${response.status}`)
  }
  return sendResult.hash
}

// ─── State shared between tests ───

let adminKeypair: StellarSdk.Keypair
let memberKeypair: StellarSdk.Keypair
let buyerKeypair: StellarSdk.Keypair
let cooperativeId: string
let meterId: string
let readingId: string
let certificateId: string

// ─── Test 1: Create wallets + fund ───

async function test1() {
  log(1, "Crear wallets Stellar y fondear con Friendbot")

  adminKeypair = StellarSdk.Keypair.random()
  memberKeypair = StellarSdk.Keypair.random()
  buyerKeypair = StellarSdk.Keypair.random()

  console.log(`  Admin:  ${adminKeypair.publicKey()}`)
  console.log(`  Member: ${memberKeypair.publicKey()}`)
  console.log(`  Buyer:  ${buyerKeypair.publicKey()}`)

  await fundWithFriendbot(adminKeypair.publicKey())
  ok(1, `Admin fondeado`)

  await fundWithFriendbot(memberKeypair.publicKey())
  ok(1, `Member fondeado`)

  await fundWithFriendbot(buyerKeypair.publicKey())
  ok(1, `Buyer fondeado`)

  // Verify balance
  const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org")
  const account = await server.loadAccount(adminKeypair.publicKey())
  const xlm = account.balances.find((b) => b.asset_type === "native")
  ok(1, `Admin balance: ${xlm?.balance} XLM`)
}

// ─── Test 2: Create cooperative in Supabase ───

async function test2() {
  log(2, "Crear cooperativa con admin wallet")

  const { data, error } = await supabase
    .from("cooperatives")
    .insert({
      name: `IntTest Coop ${Date.now()}`,
      technology: "solar",
      admin_stellar_address: adminKeypair.publicKey(),
      location: "Buenos Aires",
      province: "BA",
      token_contract_address: CONTRACT,
    })
    .select()
    .single()

  if (error) fail(2, `Insert cooperativa: ${error.message}`)
  cooperativeId = data.id
  ok(2, `Cooperativa creada: ${cooperativeId}`)

  // Add prosumer member
  const { data: prosumer, error: pErr } = await supabase
    .from("prosumers")
    .insert({
      stellar_address: memberKeypair.publicKey(),
      cooperative_id: cooperativeId,
      name: "Test Prosumer",
      role: "prosumer",
    })
    .select()
    .single()

  if (pErr) fail(2, `Insert prosumer: ${pErr.message}`)
  ok(2, `Prosumer agregado: ${prosumer.id}`)
}

// ─── Test 3: Create meter + submit readings ───

async function test3() {
  log(3, "Crear medidor y enviar lecturas")

  const { data: meter, error: mErr } = await supabase
    .from("meters")
    .insert({
      cooperative_id: cooperativeId,
      member_stellar_address: memberKeypair.publicKey(),
      device_type: "smart_meter",
      technology: "solar",
      capacity_kw: 5.0,
    })
    .select()
    .single()

  if (mErr) fail(3, `Insert meter: ${mErr.message}`)
  meterId = meter.id
  ok(3, `Meter creado: ${meterId}`)

  // Submit 3 readings
  const readings = [
    { kwh_generated: 12.5, reading_timestamp: "2026-03-01T10:00:00Z", reading_date: "2026-03-01" },
    { kwh_generated: 14.2, reading_timestamp: "2026-03-01T10:15:00Z", reading_date: "2026-03-01" },
    { kwh_generated: 11.8, reading_timestamp: "2026-03-01T10:30:00Z", reading_date: "2026-03-01" },
  ]

  const rows = readings.map((r) => ({
    meter_id: meterId,
    cooperative_id: cooperativeId,
    kwh_generated: r.kwh_generated,
    kwh_injected: r.kwh_generated, // legacy column (NOT NULL)
    reading_timestamp: r.reading_timestamp,
    reading_date: r.reading_date, // legacy column (NOT NULL)
    interval_minutes: 15,
    source: "meter",
    status: "pending",
  }))

  const { data: inserted, error: rErr } = await supabase
    .from("readings")
    .insert(rows)
    .select()

  if (rErr) fail(3, `Insert readings: ${rErr.message}`)
  readingId = inserted![0].id
  ok(3, `${inserted!.length} lecturas insertadas (total: ${readings.reduce((s, r) => s + r.kwh_generated, 0)} kWh)`)
}

// ─── Test 4: Create certificate + mint on-chain ───

async function test4() {
  log(4, "Crear certificado y mintear tokens en Stellar Testnet")

  const totalKwh = 38.5 // sum of readings

  const { data: cert, error: cErr } = await supabase
    .from("certificates")
    .insert({
      cooperative_id: cooperativeId,
      generation_period_start: "2026-03-01",
      generation_period_end: "2026-03-01",
      total_kwh: totalKwh,
      technology: "solar",
      location: "Buenos Aires",
      status: "pending",
    })
    .select()
    .single()

  if (cErr) fail(4, `Insert certificate: ${cErr.message}`)
  certificateId = cert.id
  ok(4, `Certificado creado: ${certificateId} (${totalKwh} kWh, pending)`)

  // Mint on-chain (tokens go to minter — custodial model)
  const minterPublic = StellarSdk.Keypair.fromSecret(MINTER_SECRET).publicKey()
  console.log(`  ⏳ Minteando ${totalKwh} kWh en contrato ${CONTRACT.slice(0, 10)}...`)
  const txHash = await mintOnChain(minterPublic, totalKwh)

  // Update certificate in DB
  await supabase
    .from("certificates")
    .update({ status: "available", mint_tx_hash: txHash, token_amount: totalKwh })
    .eq("id", certificateId)

  await supabase.from("mint_log").insert({
    certificate_id: certificateId,
    prosumer_address: adminKeypair.publicKey(),
    amount_hdrop: totalKwh,
    tx_hash: txHash,
  })

  ok(4, `Mint exitoso → tx: ${txHash}`)
  ok(4, `https://stellar.expert/explorer/testnet/tx/${txHash}`)

  // Verify certificate status
  const { data: updated } = await supabase
    .from("certificates")
    .select("status, mint_tx_hash")
    .eq("id", certificateId)
    .single()

  if (updated?.status !== "available") fail(4, `Status esperado 'available', got '${updated?.status}'`)
  ok(4, `Certificado ahora en status 'available'`)
}

// ─── Test 5: Retire certificate (burn on-chain) ───

async function test5() {
  log(5, "Retirar certificado — burn tokens en Stellar Testnet")

  // Fetch certificate
  const { data: cert } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", certificateId)
    .single()

  if (!cert) fail(5, "Certificado no encontrado")

  // Burn on-chain (from minter's address — custodial model)
  console.log(`  ⏳ Quemando ${cert.total_kwh} kWh (retirement para buyer ${buyerKeypair.publicKey().slice(0, 10)}...)`)
  const burnHash = await burnOnChain(cert.total_kwh)

  // Create retirement record
  const { data: retirement, error: retErr } = await supabase
    .from("retirements")
    .insert({
      certificate_id: certificateId,
      buyer_address: buyerKeypair.publicKey(),
      buyer_name: "ESG Fund Test",
      buyer_purpose: "esg_reporting",
      kwh_retired: cert.total_kwh,
      burn_tx_hash: burnHash,
    })
    .select()
    .single()

  if (retErr) fail(5, `Insert retirement: ${retErr.message}`)

  // Update certificate status
  await supabase
    .from("certificates")
    .update({ status: "retired" })
    .eq("id", certificateId)

  ok(5, `Burn exitoso → tx: ${burnHash}`)
  ok(5, `https://stellar.expert/explorer/testnet/tx/${burnHash}`)
  ok(5, `Retirement ID: ${retirement.id}`)

  // Verify final state
  const { data: final } = await supabase
    .from("certificates")
    .select("status")
    .eq("id", certificateId)
    .single()

  if (final?.status !== "retired") fail(5, `Status esperado 'retired', got '${final?.status}'`)
  ok(5, `Certificado retirado correctamente — ciclo completo ✅`)
}

// ─── Run ───

async function main() {
  console.log("═══════════════════════════════════════════════════")
  console.log("  BeEnergy Integration Test — Stellar Testnet")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Contract: ${CONTRACT}`)
  console.log(`  RPC:      ${RPC_URL}`)

  const start = Date.now()

  try {
    await test1()
    await test2()
    await test3()
    await test4()
    await test5()

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log("\n═══════════════════════════════════════════════════")
    console.log(`  ✅ 5/5 tests passed (${elapsed}s)`)
    console.log("═══════════════════════════════════════════════════\n")
  } catch (err) {
    console.error("\n❌ Test failed:", err instanceof Error ? err.message : err)
    process.exit(1)
  } finally {
    // Cleanup: delete test data from Supabase
    if (certificateId) {
      await supabase.from("retirements").delete().eq("certificate_id", certificateId)
      await supabase.from("mint_log").delete().eq("certificate_id", certificateId)
      await supabase.from("certificates").delete().eq("id", certificateId)
    }
    if (meterId) {
      await supabase.from("readings").delete().eq("meter_id", meterId)
      await supabase.from("meters").delete().eq("id", meterId)
    }
    if (cooperativeId) {
      await supabase.from("prosumers").delete().eq("cooperative_id", cooperativeId)
      await supabase.from("cooperatives").delete().eq("id", cooperativeId)
    }
    console.log("  🧹 Test data cleaned up from Supabase")
  }
}

main()
