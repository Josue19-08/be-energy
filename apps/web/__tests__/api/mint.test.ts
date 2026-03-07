import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockSingle, mockFrom, mockUpdate, mockInsert } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq: ReturnType<typeof vi.fn> = vi.fn(() => ({ single: mockSingle, eq: mockEq }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockInsert = vi.fn(() => ({ error: null }))
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ eq: mockEq })),
    update: mockUpdate,
    insert: mockInsert,
  }))
  return { mockSingle, mockFrom, mockUpdate, mockInsert }
})

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}))

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: { Server: vi.fn() },
  Keypair: { fromSecret: vi.fn() },
  Contract: vi.fn(),
  TransactionBuilder: vi.fn(),
  nativeToScVal: vi.fn(),
  BASE_FEE: "100",
}))

vi.mock("@/lib/contracts-config", () => ({
  CONTRACTS: { ENERGY_TOKEN: "CFAKECONTRACT" },
  STELLAR_CONFIG: { RPC_URL: "https://fake-rpc.stellar.org" },
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}))

import { POST } from "@/app/api/mint/route"

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/mint", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/mint", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  it("rechaza sin reading_id ni certificate_id → 400", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/reading_id or certificate_id/)
  })

  it("rechaza si reading no existe → 404", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } })
    process.env.MINTER_SECRET_KEY = "SFAKE"

    const res = await POST(makeRequest({ reading_id: "nonexistent" }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/Reading not found/)
  })

  it("rechaza si la lectura ya fue minted → 400", async () => {
    process.env.MINTER_SECRET_KEY = "SFAKE"

    mockSingle.mockResolvedValueOnce({
      data: {
        id: "r1",
        status: "minted",
        kwh_generated: 5,
        prosumers: { stellar_address: "GABC" },
      },
      error: null,
    })

    const res = await POST(makeRequest({ reading_id: "r1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/minted/)
  })

  it("rechaza si MINTER_SECRET_KEY no está configurada → 500", async () => {
    delete process.env.MINTER_SECRET_KEY

    const res = await POST(makeRequest({ reading_id: "r1" }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/MINTER_SECRET_KEY/)
  })

  it("rechaza certificate con status != pending → 400", async () => {
    process.env.MINTER_SECRET_KEY = "SFAKE"

    mockSingle.mockResolvedValueOnce({
      data: {
        id: "c1",
        status: "available",
        total_kwh: 100,
        cooperatives: { admin_stellar_address: "GADMIN", token_contract_address: null },
      },
      error: null,
    })

    const res = await POST(makeRequest({ certificate_id: "c1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/available/)
  })
})
