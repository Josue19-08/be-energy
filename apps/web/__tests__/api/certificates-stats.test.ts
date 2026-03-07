import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockFrom, mockCertsResult, mockRetirementsResult } = vi.hoisted(() => {
  const mockCertsResult = { data: [] as unknown[], error: null }
  const mockRetirementsResult = { data: [] as unknown[], error: null }

  const mockEq = vi.fn(() => mockRetirementsResult)
  const mockFrom = vi.fn((table: string) => {
    if (table === "certificates") {
      return {
        select: vi.fn(() => mockCertsResult),
      }
    }
    // retirements
    return {
      select: vi.fn(() => ({ eq: mockEq, ...mockRetirementsResult })),
    }
  })
  return { mockFrom, mockCertsResult, mockRetirementsResult }
})

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}))

import { GET } from "@/app/api/certificates/stats/route"

function makeGet(params = "") {
  return new NextRequest(`http://localhost/api/certificates/stats${params}`)
}

describe("GET /api/certificates/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCertsResult.data = []
    mockCertsResult.error = null
    mockRetirementsResult.data = []
    mockRetirementsResult.error = null
  })

  it("retorna stats vacías sin datos", async () => {
    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.total_kwh_certified).toBe(0)
    expect(json.total_kwh_retired).toBe(0)
    expect(json.co2_avoided_kg).toBe(0)
    expect(json.certificates_available).toBe(0)
    expect(json.certificates_retired).toBe(0)
  })

  it("calcula stats correctamente", async () => {
    mockCertsResult.data = [
      { id: "c1", total_kwh: 100, technology: "solar", cooperative_id: "coop1", status: "available", cooperatives: { name: "Coop A" } },
      { id: "c2", total_kwh: 50, technology: "wind", cooperative_id: "coop2", status: "retired", cooperatives: { name: "Coop B" } },
    ]
    mockRetirementsResult.data = [
      { certificate_id: "c2", kwh_retired: 50, buyer_address: "GBUYER", buyer_purpose: "esg_reporting" },
    ]

    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.total_kwh_certified).toBe(150)
    expect(json.total_kwh_retired).toBe(50)
    expect(json.co2_avoided_kg).toBe(20) // 50 * 0.4
    expect(json.certificates_available).toBe(1)
    expect(json.certificates_retired).toBe(1)
    expect(json.by_technology.solar.certified_kwh).toBe(100)
    expect(json.by_technology.wind.retired_kwh).toBe(50)
  })
})
