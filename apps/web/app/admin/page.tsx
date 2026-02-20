"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/lib/wallet-context"
import { ADMIN_ADDRESS } from "@/lib/contracts-config"
import { MintTokenPanel } from "@/components/admin/mint-token-panel"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { ShieldX } from "lucide-react"

export default function AdminPage() {
  const { isConnected, address, isPending } = useWallet()
  const router = useRouter()

  // Redirect unauthenticated users to the landing page.
  useEffect(() => {
    if (!isPending && !isConnected) {
      router.push("/")
    }
  }, [isPending, isConnected, router])

  // Wait for the wallet context to finish its initial poll before rendering.
  if (isPending || !isConnected) {
    return null
  }

  // Security gate: address must exactly match the on-chain admin.
  if (address !== ADMIN_ADDRESS) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:ml-64">
          <DashboardHeader />
          <div className="p-4 md:p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="text-center space-y-4 max-w-md">
              <div className="flex justify-center">
                <ShieldX className="w-16 h-16 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground text-sm">
                This page is restricted to the contract administrator. Your
                connected wallet does not have admin privileges.
              </p>
              {address && (
                <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded-md break-all">
                  Connected: {address}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-64">
        <DashboardHeader />
        <div className="p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage HDROP token issuance for the BeEnergy cooperative.
            </p>
          </div>
          <MintTokenPanel />
        </div>
      </main>
    </div>
  )
}
