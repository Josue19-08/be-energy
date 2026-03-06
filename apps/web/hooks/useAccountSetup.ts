"use client"

import { useState, useCallback, useEffect } from "react"
import { useWallet } from "@/lib/wallet-context"
import { STELLAR_CONFIG } from "@/lib/contracts-config"

const isTestnet = STELLAR_CONFIG.NETWORK === "TESTNET"

export function useAccountSetup() {
  const { address } = useWallet()
  const [accountExists, setAccountExists] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkAccountExists = useCallback(async (addr: string): Promise<boolean> => {
    try {
      const res = await fetch(`${STELLAR_CONFIG.HORIZON_URL}/accounts/${addr}`)
      return res.ok
    } catch {
      return false
    }
  }, [])

  const checkAccount = useCallback(async () => {
    if (!address) {
      setAccountExists(null)
      return
    }
    setIsLoading(true)
    try {
      const exists = await checkAccountExists(address)
      setAccountExists(exists)
    } finally {
      setIsLoading(false)
    }
  }, [address, checkAccountExists])

  useEffect(() => {
    checkAccount()
  }, [checkAccount])

  const fundAccount = useCallback(async () => {
    if (!address || !isTestnet) return

    setIsFunding(true)
    setError(null)
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${address}`)
      if (!res.ok) {
        const body = await res.text()
        // Friendbot returns 400 if already funded — that's fine
        if (!body.includes("createAccountAlreadyExist")) {
          throw new Error("Friendbot falló. Intentá de nuevo.")
        }
      }
      setAccountExists(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al fondear la cuenta")
    } finally {
      setIsFunding(false)
    }
  }, [address])

  return {
    accountExists,
    isLoading,
    isFunding,
    error,
    isTestnet,
    fundAccount,
    recheckAccount: checkAccount,
  }
}
