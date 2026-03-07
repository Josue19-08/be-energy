"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Home, History, Settings, LogOut, Leaf, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/lib/wallet-context"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function MobileSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { disconnectWallet } = useWallet()
  const [open, setOpen] = useState(false)

  const handleDisconnect = () => {
    disconnectWallet()
    router.push("/")
    setOpen(false)
  }

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", enabled: true },
    { icon: History, label: "Historial", href: "/historial", enabled: false },
    { icon: Settings, label: "Configuración", href: "/config", enabled: false },
  ]

  const handleNavigate = (href: string, enabled: boolean) => {
    if (enabled) {
      router.push(href)
      setOpen(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full">
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
                  onClick={() => handleNavigate(item.href, item.enabled)}
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

          {/* Disconnect Button */}
          <div className="p-4 border-t border-border">
            <Button onClick={handleDisconnect} variant="outline" className="w-full justify-start gap-3 bg-transparent">
              <LogOut className="w-5 h-5" />
              Desconectar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
