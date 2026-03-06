"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/lib/wallet-context"
import { useI18n } from "@/lib/i18n-context"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { BalanceDisplay } from "@/components/balance-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Copy, Check, RefreshCw, ArrowDownLeft, ArrowUpRight, Users, Zap, TrendingUp, AlertCircle, AlertTriangle } from "lucide-react"
import { useEnergyToken } from "@/hooks/useEnergyToken"
import { useAccountSetup } from "@/hooks/useAccountSetup"
import { useDefindex } from "@/hooks/useDefindex"
import { useHorizonPayments } from "@/hooks/useHorizonPayments"
import { useEnergyDistribution } from "@/hooks/useEnergyDistribution"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Ahora"
  if (diffMin < 60) return `Hace ${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `Hace ${diffD}d`
}

export default function DashboardPage() {
  const { isConnected, userProfile, address } = useWallet()
  const { t } = useI18n()
  const router = useRouter()
  const { getBalance, isLoading: isBalanceLoading, error: balanceError } = useEnergyToken()
  const { accountExists, isLoading: accountLoading, isFunding, error: fundError, isTestnet, fundAccount } = useAccountSetup()
  const [hdropBalance, setHdropBalance] = useState<number | null>(null)

  // Real data hooks
  const { stats: defindexStats, vaultInfo, loading: defindexLoading, error: defindexError } = useDefindex()
  const { payments, isLoading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = useHorizonPayments(address)
  const { getTotalGenerated, getMemberList, getMemberInfo, isLoading: communityLoading, error: communityError } = useEnergyDistribution()

  // Community stats
  const [communityStats, setCommunityStats] = useState<{
    totalKwh: number
    memberCount: number
    userPercent: number | null
  } | null>(null)
  const [communityFetchError, setCommunityFetchError] = useState<string | null>(null)

  const hasDefindexVault = !!process.env.NEXT_PUBLIC_DEFINDEX_VAULT_ADDRESS

  const loadBalance = useCallback(async () => {
    if (!address) return
    try {
      const value = await getBalance(address)
      setHdropBalance(Number.parseFloat(value))
    } catch (err) {
      console.error("Error loading balance", err)
      setHdropBalance(0)
    }
  }, [address, getBalance])

  useEffect(() => {
    if (isConnected && address) {
      loadBalance()
    } else {
      setHdropBalance(null)
    }
  }, [isConnected, address, loadBalance])

  // Fetch community stats
  useEffect(() => {
    if (!isConnected || !address) return

    const fetchCommunityStats = async () => {
      try {
        setCommunityFetchError(null)
        const [totalKwh, members] = await Promise.all([
          getTotalGenerated(),
          getMemberList(),
        ])
        let userPercent: number | null = null
        try {
          const info = await getMemberInfo(address)
          if (info.isMember) {
            userPercent = info.percent
          }
        } catch {
          // User is not a member, that's ok
        }
        setCommunityStats({
          totalKwh,
          memberCount: members.length,
          userPercent,
        })
      } catch (err) {
        console.error("Error fetching community stats:", err)
        setCommunityFetchError(err instanceof Error ? err.message : "Error cargando datos de comunidad")
      }
    }

    fetchCommunityStats()
  }, [isConnected, address, getTotalGenerated, getMemberList, getMemberInfo])

  const [copied, setCopied] = useState(false)
  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : null

  useEffect(() => {
    if (!isConnected) {
      router.push("/")
    }
  }, [isConnected, router])

  const handleCopyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {console.error("Failed to copy:", err)}
  }

  if (!isConnected) {
    return null
  }

  // Last 5 payments for display
  const recentPayments = payments.slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:ml-64">
        <DashboardHeader />

        <div className="p-4 md:p-6">
          {/* 1. Welcome Card */}
          {userProfile && (
            <Card
              id="user-info-section"
              className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 scroll-mt-4"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-2 border-primary/30">
                    {userProfile.avatar ? (
                      <img
                        src={userProfile.avatar || "/placeholder.svg"}
                        alt={userProfile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      {t("dashboard.welcome")} {userProfile.name}!
                    </h2>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground text-sm md:text-base">{shortAddress || "No conectado"}</p>
                      <div className="relative flex items-center group">
                        <button
                          onClick={handleCopyAddress}
                          disabled={!address}
                          className={`
                            ml-2 p-1.5 rounded-md transition-all duration-200 active:scale-95
                            ${copied
                              ? "bg-success/10 text-success"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/10"}
                          `}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Tooltip custom abajo */}
                        {(copied || !copied) && (
                          <span
                            className={`
                              absolute top-full mt-2 left-1/2 -translate-x-1/2
                              text-xs px-2 py-1 rounded-md
                              bg-card border border-border text-foreground
                              shadow-md whitespace-nowrap
                              transition-all duration-200
                              ${copied
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"}
                            `}
                          >
                            {copied ? t("common.copied") : t("common.copyAddress")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account activation banner */}
          {!accountLoading && accountExists === false && (
            <Card className="mb-4 md:mb-6 border-2 border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {isTestnet
                      ? "Tu cuenta no está activada en Stellar Testnet"
                      : "Tu cuenta necesita XLM para operar en Stellar"}
                  </p>
                  {fundError && (
                    <p className="text-xs text-destructive mt-1">{fundError}</p>
                  )}
                </div>
                {isTestnet && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/10"
                    onClick={fundAccount}
                    disabled={isFunding}
                  >
                    {isFunding ? (
                      <>
                        <Spinner className="size-4 mr-1" />
                        Activando…
                      </>
                    ) : (
                      "Activar cuenta (Friendbot)"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* 2. Balance HDROP + DeFindex Yield */}
          <Card className="glass-card border-2 border-primary/20 mb-4 md:mb-6">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">{t("dashboard.balance")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isBalanceLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner className="size-5" />
                  {t("common.loading")}…
                </div>
              )}
              {!isBalanceLoading && balanceError && (
                <div className="space-y-2">
                  <p className="text-destructive text-sm">{balanceError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadBalance}
                    disabled={isBalanceLoading}
                    className="gap-2"
                  >
                    <RefreshCw className="size-4" />
                    {t("common.retry")}
                  </Button>
                </div>
              )}
              {!isBalanceLoading && !balanceError && hdropBalance !== null && (
                <BalanceDisplay amount={hdropBalance} symbol="HDROP" />
              )}

              {/* DeFindex Yield Section — only if vault is configured */}
              {hasDefindexVault && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">D</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">DeFindex Yield</h3>
                        <p className="text-xs text-muted-foreground">
                          {vaultInfo ? vaultInfo.name : "Generando rendimiento automático"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {defindexLoading ? (
                        <Spinner className="size-5" />
                      ) : defindexError ? (
                        <div className="flex items-center gap-1 text-destructive text-xs">
                          <AlertCircle className="size-3" />
                          Error
                        </div>
                      ) : defindexStats ? (
                        <>
                          <div className="text-2xl font-bold text-success">{defindexStats.apy.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">APY anual</div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  {defindexStats && !defindexError && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Interés hoy</p>
                        <p className="text-lg font-bold text-success">+${defindexStats.interestToday.toFixed(3)}</p>
                      </div>
                      <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Este mes</p>
                        <p className="text-lg font-bold text-success">+${defindexStats.interestThisMonth.toFixed(2)}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 col-span-2 md:col-span-1">
                        <p className="text-xs text-muted-foreground mb-1">En vault</p>
                        <p className="text-lg font-bold text-primary">{defindexStats.balance.toLocaleString()} HDROP</p>
                      </div>
                    </div>
                  )}

                  {/* Info note */}
                  <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                    <span className="text-purple-500">ℹ️</span>
                    <p>
                      Tus fondos están generando rendimiento automático en{" "}
                      <a
                        href="https://defindex.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-purple-500 hover:underline"
                      >
                        DeFindex
                      </a>
                      , con estrategias auditadas y seguras en Stellar.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Community Stats + 4. Recent Transactions */}
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            {/* Community Stats */}
            <Card className="glass-card border-2 border-success/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-success" />
                    Comunidad
                  </CardTitle>
                  <Zap className="w-5 h-5 text-success" />
                </div>
                <CardDescription>Estadísticas on-chain de la comunidad</CardDescription>
              </CardHeader>
              <CardContent>
                {communityLoading && !communityStats && (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Spinner className="size-5" />
                    {t("common.loading")}…
                  </div>
                )}
                {communityFetchError && !communityStats && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive">{communityFetchError}</p>
                  </div>
                )}
                {communityStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
                        <Zap className="w-6 h-6 text-success mx-auto mb-2" />
                        <p className="text-2xl font-bold text-success">{communityStats.totalKwh.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">kWh generados</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-primary">{communityStats.memberCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Miembros activos</p>
                      </div>
                    </div>

                    {communityStats.userPercent !== null && (
                      <div className="bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-success" />
                            <span className="text-sm font-medium">Tu participación</span>
                          </div>
                          <span className="text-lg font-bold text-success">{communityStats.userPercent}%</span>
                        </div>
                      </div>
                    )}

                    {communityStats.userPercent === null && (
                      <div className="text-center text-xs text-muted-foreground border border-border rounded-lg p-3">
                        Aún no eres miembro de la comunidad energética
                      </div>
                    )}
                  </div>
                )}
                {!communityLoading && !communityFetchError && !communityStats && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay datos de comunidad disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions (Horizon) */}
            <Card className="glass-card border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl">Últimas transacciones</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refetchPayments}
                    disabled={paymentsLoading}
                    className="gap-1 text-xs"
                  >
                    <RefreshCw className={`size-3 ${paymentsLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <CardDescription>Pagos reales desde Stellar Horizon</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading && payments.length === 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Spinner className="size-5" />
                    {t("common.loading")}…
                  </div>
                )}
                {paymentsError && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive">{paymentsError}</p>
                  </div>
                )}
                {!paymentsLoading && !paymentsError && recentPayments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay transacciones aún
                  </div>
                )}
                {recentPayments.length > 0 && (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => {
                      const isIncoming = payment.to === address
                      const amount = payment.amount || payment.source_amount || "?"
                      const asset = payment.asset_code || (payment.asset_type === "native" ? "XLM" : "?")

                      return (
                        <div
                          key={payment.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isIncoming
                              ? "bg-success/10 text-success"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {isIncoming ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {isIncoming ? "Recibido" : "Enviado"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(payment.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${isIncoming ? "text-success" : "text-foreground"}`}>
                              {isIncoming ? "+" : "-"}{Number(amount).toLocaleString("es-ES", { maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">{asset}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
