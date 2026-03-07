import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockSingle, mockOrder, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockOrder = vi.fn(() => ({ data: [], error: null }))
  const mockEq: ReturnType<typeof vi.fn> = vi.fn(() => ({ order: mockOrder, eq: mockEq }))
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

import { GET, POST } from "@/app/api/meters/route"

function makeGet(params = "") {
  return new NextRequest(`http://localhost/api/meters${params}`)
}

function makePost(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/meters", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("GET /api/meters", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lista medidores", async () => {
    const fakeMeters = [{ id: "1", device_type: "inverter" }]
    mockOrder.mockReturnValueOnce({ data: fakeMeters, error: null })

    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
  })
})

describe("POST /api/meters", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rechaza sin campos requeridos → 400", async () => {
    const res = await POST(makePost({ cooperative_id: "coop-1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Missing required/)
  })

  it("rechaza device_type inválido → 400", async () => {
    const res = await POST(
      makePost({
        cooperative_id: "coop-1",
        member_stellar_address: "GABC",
        device_type: "toaster",
        technology: "solar",
        capacity_kw: 5,
      })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/device_type/)
  })

  it("rechaza technology inválida → 400", async () => {
    const res = await POST(
      makePost({
        cooperative_id: "coop-1",
        member_stellar_address: "GABC",
        device_type: "inverter",
        technology: "nuclear",
        capacity_kw: 5,
      })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/technology/)
  })

  it("crea medidor válido → 201", async () => {
    const fakeMeter = {
      id: "meter-1",
      cooperative_id: "coop-1",
      device_type: "inverter",
      technology: "solar",
      capacity_kw: 5,
    }
    mockSingle.mockResolvedValueOnce({ data: fakeMeter, error: null })

    const res = await POST(
      makePost({
        cooperative_id: "coop-1",
        member_stellar_address: "GABC",
        device_type: "inverter",
        technology: "solar",
        capacity_kw: 5,
      })
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.device_type).toBe("inverter")
  })
})
