"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/lib/wallet-context"
import { generateIdenticon } from "@/lib/utils"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"

export function DashboardHeader() {
  const router = useRouter()
  const { address, shortAddress, userProfile } = useWallet()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const identiconColor = address ? generateIdenticon(address) : "#8DE8F2"

  const goToProfile = () => {
    router.push("/profile")
  }

  return (
    <header className="bg-card border-b border-border p-2 md:p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <MobileSidebar />
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <ThemeToggle />
          {userProfile?.avatar ? (
            <button
              onClick={goToProfile}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0 hover:border-primary transition-colors cursor-pointer"
            >
              <img
                src={userProfile.avatar || "/placeholder.svg"}
                alt={userProfile.name}
                className="w-full h-full object-cover"
              />
            </button>
          ) : (
            <button
              onClick={goToProfile}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0 hover:ring-2 hover:ring-primary transition-all cursor-pointer"
              style={{ backgroundColor: identiconColor }}
            >
              {shortAddress?.slice(0, 2) || "BE"}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
