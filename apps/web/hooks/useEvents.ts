"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface Event {
  id: string
  type: "mint" | "burn"
  amount: number
  tx_hash: string
  cooperative_id: string | null
  stellar_address: string
  created_at: string
}

interface UseEventsResult {
  events: Event[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useEvents(address: string | null): UseEventsResult {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!address) {
      setEvents([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from("events")
        .select("*")
        .eq("stellar_address", address)
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setEvents(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events")
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, isLoading, error, refetch: fetchEvents }
}
