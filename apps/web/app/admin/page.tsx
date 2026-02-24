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
          {/* pb-16 shifts the card above true center — standard optical centering */}
          <div className="p-4 md:p-6 flex items-center justify-center min-h-[calc(100vh-64px)] pb-16">
            <div className="relative w-full max-w-md">
              {/* Subtle destructive glow behind the card */}
              <div className="absolute -inset-4 rounded-3xl bg-destructive/5 blur-2xl -z-10" />

              <div className="glass-card rounded-2xl p-6 md:p-8 w-full shadow-2xl border-2 border-destructive/20 text-center">
                {/* Icon container */}
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <ShieldX className="w-6 h-6 text-destructive" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold tracking-tight mb-2">
                  Access Denied
                </h1>

                <p className="text-sm text-muted-foreground">
                  Your wallet does not have admin privileges.
                </p>
              </div>
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
