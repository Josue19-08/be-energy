"use client"

import { usePathname, useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n-context"
import { Home, History, LogOut, Leaf, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/lib/wallet-context"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { disconnectWallet } = useWallet()
  const { t } = useI18n()

  const handleDisconnect = () => {
    disconnectWallet()
    router.push("/")
  }

  const menuItems = [
    { icon: Home, label: t("sidebar.dashboard"), href: "/dashboard", enabled: true },
    { icon: History, label: t("sidebar.activity"), href: "/activity", enabled: true },
    { icon: Zap, label: t("sidebar.consumption"), href: "/consumption", enabled: true },
  ]

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#F2C230] rounded-full flex items-center justify-center">
            <Leaf className="w-6 h-6 text-[#0300AB]" />
          </div>
          <span className="text-2xl font-bold">BeEnergy</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <button
              key={item.href}
              onClick={() => item.enabled && router.push(item.href)}
              disabled={!item.enabled}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                isActive && "bg-primary/10 text-primary font-semibold",
                !isActive && item.enabled && "hover:bg-muted text-foreground",
                !item.enabled && "opacity-50 cursor-not-allowed text-muted-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          onClick={handleDisconnect}
          variant="outline"
          className="w-full justify-start gap-3 bg-transparent text-sm h-10"
        >
          <LogOut className="w-4 h-4" />
          {t("sidebar.disconnect")}
        </Button>
      </div>
    </aside>
  )
}
