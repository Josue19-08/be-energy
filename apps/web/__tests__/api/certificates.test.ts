import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockSingle, mockOrder, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockOrder = vi.fn(() => ({ data: [], error: null }))
  const mockEq: ReturnType<typeof vi.fn> = vi.fn(() => ({
    order: mockOrder,
    eq: mockEq,
    gte: vi.fn(() => ({ lte: vi.fn(() => ({ data: [], error: null })), order: mockOrder, eq: mockEq })),
    lte: vi.fn(() => ({ data: [], error: null })),
  }))
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ order: mockOrder, eq: mockEq })),
    insert: mockInsert,
  }))
  return { mockSingle, mockOrder, mockFrom }
})

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}))

import { GET, POST } from "@/app/api/certificates/route"

function makeGet(params = "") {
  return new NextRequest(`http://localhost/api/certificates${params}`)
}

function makePost(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/certificates", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("GET /api/certificates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lista certificados", async () => {
    const fakeCerts = [{ id: "1", total_kwh: 100, status: "available" }]
    mockOrder.mockReturnValueOnce({ data: fakeCerts, error: null })

    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
  })
})

describe("POST /api/certificates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rechaza sin campos requeridos → 400", async () => {
    const res = await POST(makePost({ cooperative_id: "coop-1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Missing required/)
  })

  it("crea certificado válido → 201", async () => {
    const fakeCert = {
      id: "cert-1",
      cooperative_id: "coop-1",
      total_kwh: 150,
      technology: "solar",
      status: "pending",
    }
    mockSingle.mockResolvedValueOnce({ data: fakeCert, error: null })

    const res = await POST(
      makePost({
        cooperative_id: "coop-1",
        generation_period_start: "2025-01-01",
        generation_period_end: "2025-01-31",
        total_kwh: 150,
        technology: "solar",
      })
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.total_kwh).toBe(150)
    expect(json.status).toBe("pending")
  })
})
