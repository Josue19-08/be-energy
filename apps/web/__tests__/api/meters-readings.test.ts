import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockSingle, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ data: [], error: null }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
    insert: mockInsert,
  }))
  return { mockSingle, mockSelect, mockFrom }
})

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}))

import { POST } from "@/app/api/meters/readings/route"

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/meters/readings", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/meters/readings (bulk)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rechaza sin meter_id → 400", async () => {
    const res = await POST(makeRequest({ readings: [{ kwh_generated: 1 }] }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/meter_id/)
  })

  it("rechaza sin readings array → 400", async () => {
    const res = await POST(makeRequest({ meter_id: "m1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/readings/)
  })

  it("rechaza readings vacío → 400", async () => {
    const res = await POST(makeRequest({ meter_id: "m1", readings: [] }))
    expect(res.status).toBe(400)
  })

  it("rechaza meter inexistente → 404", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } })

    const res = await POST(
      makeRequest({
        meter_id: "nonexistent",
        readings: [{ kwh_generated: 1, reading_timestamp: "2025-01-01T12:00:00Z" }],
      })
    )
    expect(res.status).toBe(404)
  })

  it("rechaza meter inactivo → 400", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "m1", cooperative_id: "c1", status: "maintenance" },
      error: null,
    })

    const res = await POST(
      makeRequest({
        meter_id: "m1",
        readings: [{ kwh_generated: 1, reading_timestamp: "2025-01-01T12:00:00Z" }],
      })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/maintenance/)
  })

  it("inserta readings en batch → 201", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "m1", cooperative_id: "c1", status: "active" },
      error: null,
    })
    const inserted = [
      { id: "r1", kwh_generated: 1.5 },
      { id: "r2", kwh_generated: 2.0 },
    ]
    mockSelect.mockReturnValueOnce({ data: inserted, error: null })

    const res = await POST(
      makeRequest({
        meter_id: "m1",
        readings: [
          { kwh_generated: 1.5, reading_timestamp: "2025-01-01T12:00:00Z" },
          { kwh_generated: 2.0, reading_timestamp: "2025-01-01T12:15:00Z" },
        ],
      })
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.inserted).toBe(2)
  })
})
