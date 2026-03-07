import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockSingle, mockOrder, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockOrder = vi.fn(() => ({ data: [], error: null }))
  const mockEq: ReturnType<typeof vi.fn> = vi.fn(() => ({ order: mockOrder, eq: mockEq, single: mockSingle }))
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

import { GET, POST } from "@/app/api/members/route"

function makeGet(params = "") {
  return new NextRequest(`http://localhost/api/members${params}`)
}

function makePost(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/members", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("GET /api/members", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lista miembros", async () => {
    const fakeMembers = [{ id: "1", stellar_address: "GA1" }]
    mockOrder.mockReturnValueOnce({ data: fakeMembers, error: null })

    const res = await GET(makeGet())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
  })
})

describe("POST /api/members", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rechaza sin campos requeridos → 400", async () => {
    const res = await POST(makePost({ name: "Test" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/stellar_address, cooperative_id/)
  })

  it("rechaza address duplicada → 409", async () => {
    // First .single() call is for the duplicate check: .select("id").eq(...).single()
    mockSingle.mockResolvedValueOnce({ data: { id: "existing" }, error: null })

    const res = await POST(
      makePost({ stellar_address: "GABC", cooperative_id: "coop-1" })
    )
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already exists/)
  })

  it("crea miembro válido → 201", async () => {
    const fakeMember = { id: "uuid-1", stellar_address: "GABC", cooperative_id: "coop-1" }
    // First .single() → duplicate check returns nothing
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } })
    // Second .single() → insert result
    mockSingle.mockResolvedValueOnce({ data: fakeMember, error: null })

    const res = await POST(
      makePost({ stellar_address: "GABC", cooperative_id: "coop-1" })
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.stellar_address).toBe("GABC")
  })
})
