import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as fc from "fast-check"
import { getStellarExpertUrl } from "@/lib/utils"

describe("getStellarExpertUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_STELLAR_NETWORK

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
    } else {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalEnv
    }
  })

  it("returns testnet URL for a known hash when NEXT_PUBLIC_STELLAR_NETWORK is TESTNET", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "TESTNET"
    const result = getStellarExpertUrl("abc123")
    expect(result).toBe("https://stellar.expert/explorer/testnet/tx/abc123")
  })

  it("returns mainnet URL for a known hash when NEXT_PUBLIC_STELLAR_NETWORK is MAINNET", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "MAINNET"
    const result = getStellarExpertUrl("abc123")
    expect(result).toBe("https://stellar.expert/explorer/public/tx/abc123")
  })

  it("defaults to testnet URL when NEXT_PUBLIC_STELLAR_NETWORK is not set", () => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
    const result = getStellarExpertUrl("abc123")
    expect(result).toBe("https://stellar.expert/explorer/testnet/tx/abc123")
  })

  it("does not crash and URL ends with empty string when hash is empty", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "TESTNET"
    const result = getStellarExpertUrl("")
    expect(result).toBe("https://stellar.expert/explorer/testnet/tx/")
    expect(result.endsWith("")).toBe(true)
  })
})

describe("getStellarExpertUrl — property-based tests", () => {
  const TESTNET_PREFIX = "https://stellar.expert/explorer/testnet/tx/"
  const MAINNET_PREFIX = "https://stellar.expert/explorer/public/tx/"

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
  })

  it(
    "Feature: stellar-expert-url, Property 1: Testnet URL structure",
    () => {
      fc.assert(
        fc.property(fc.string(), (hash) => {
          process.env.NEXT_PUBLIC_STELLAR_NETWORK = "TESTNET"
          const url = getStellarExpertUrl(hash)
          expect(url.startsWith(TESTNET_PREFIX)).toBe(true)
          expect(url.endsWith(hash)).toBe(true)
        })
      )
    }
  )

  it(
    "Feature: stellar-expert-url, Property 2: Mainnet URL structure",
    () => {
      fc.assert(
        fc.property(fc.string(), (hash) => {
          process.env.NEXT_PUBLIC_STELLAR_NETWORK = "MAINNET"
          const url = getStellarExpertUrl(hash)
          expect(url.startsWith(MAINNET_PREFIX)).toBe(true)
          expect(url.endsWith(hash)).toBe(true)
        })
      )
    }
  )

  it(
    "Feature: stellar-expert-url, Property 3: Unknown network defaults to testnet",
    () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.oneof(
            fc.constant(undefined),
            fc.string().filter((s) => s !== "TESTNET" && s !== "MAINNET")
          ),
          (hash, envValue) => {
            if (envValue === undefined) {
              delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
            } else {
              process.env.NEXT_PUBLIC_STELLAR_NETWORK = envValue
            }
            const url = getStellarExpertUrl(hash)
            expect(url.startsWith(TESTNET_PREFIX)).toBe(true)
          }
        )
      )
    }
  )

  it(
    "Feature: stellar-expert-url, Property 4: Hash is preserved verbatim",
    () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom("TESTNET", "MAINNET", "OTHER", undefined as unknown as string),
          (hash, envValue) => {
            if (envValue === undefined) {
              delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
            } else {
              process.env.NEXT_PUBLIC_STELLAR_NETWORK = envValue
            }
            const url = getStellarExpertUrl(hash)
            expect(url.endsWith(hash)).toBe(true)
          }
        )
      )
    }
  )
})
