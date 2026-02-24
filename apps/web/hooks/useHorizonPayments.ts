"use client"

import { useEffect, useState, useCallback } from "react"
import { STELLAR_CONFIG } from "@/lib/contracts-config"

export interface HorizonPayment {
  id: string
  type: string
  created_at: string
  transaction_hash: string
  asset_type: string
  asset_code?: string
  asset_issuer?: string
  from?: string
  to?: string
  amount?: string
  // For account_merge, path_payment, etc.
  source_amount?: string
  source_asset_code?: string
}

interface UseHorizonPaymentsResult {
  payments: HorizonPayment[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useHorizonPayments(address: string | null): UseHorizonPaymentsResult {
  const [payments, setPayments] = useState<HorizonPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    if (!address) {
      setPayments([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = `${STELLAR_CONFIG.HORIZON_URL}/accounts/${address}/payments?order=desc&limit=50`
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          // Account not yet funded on testnet — treat as empty
          setPayments([])
          return
        }
        throw new Error(`Horizon API error: ${response.status}`)
      }

      const data = await response.json()
      const records: HorizonPayment[] = data._embedded?.records ?? []
      setPayments(records)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch payments")
      setPayments([])
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return { payments, isLoading, error, refetch: fetchPayments }
}
