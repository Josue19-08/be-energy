import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockSingle, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq: ReturnType<typeof vi.fn> = vi.fn(() => ({ single: mockSingle, eq: mockEq }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ eq: mockEq })),
    update: mockUpdate,
    insert: mockInsert,
  }))
  return { mockSingle, mockFrom }
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
}))

vi.mock("@/lib/contracts-config", () => ({
  CONTRACTS: { ENERGY_TOKEN: "CFAKECONTRACT" },
  STELLAR_CONFIG: { RPC_URL: "https://fake-rpc.stellar.org" },
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
}))

import { POST } from "@/app/api/certificates/retire/route"

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/certificates/retire", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/certificates/retire", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  it("rechaza sin campos requeridos → 400", async () => {
    const res = await POST(makeRequest({ certificate_id: "c1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Missing required/)
  })

  it("rechaza buyer_purpose inválido → 400", async () => {
    const res = await POST(
      makeRequest({
        certificate_id: "c1",
        buyer_address: "GBUYER",
        buyer_purpose: "fun",
      })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/buyer_purpose/)
  })

  it("rechaza certificado inexistente → 404", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } })

    const res = await POST(
      makeRequest({
        certificate_id: "nonexistent",
        buyer_address: "GBUYER",
        buyer_purpose: "esg_reporting",
      })
    )
    expect(res.status).toBe(404)
  })

  it("rechaza certificado con status != available → 400", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "c1", status: "pending", total_kwh: 100 },
      error: null,
    })

    const res = await POST(
      makeRequest({
        certificate_id: "c1",
        buyer_address: "GBUYER",
        buyer_purpose: "esg_reporting",
      })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/pending/)
  })

  it("rechaza sin MINTER_SECRET_KEY → 500", async () => {
    delete process.env.MINTER_SECRET_KEY

    mockSingle.mockResolvedValueOnce({
      data: { id: "c1", status: "available", total_kwh: 100 },
      error: null,
    })

    const res = await POST(
      makeRequest({
        certificate_id: "c1",
        buyer_address: "GBUYER",
        buyer_purpose: "esg_reporting",
      })
    )
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/MINTER_SECRET_KEY/)
  })
})
