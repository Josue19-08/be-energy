"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/lib/wallet-context"
import { useI18n } from "@/lib/i18n-context"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Copy, Check, RefreshCw, ArrowDownLeft, ArrowUpRight, Users, Zap, TrendingUp, AlertCircle, AlertTriangle, Award, Leaf, Flame, Gauge, FileText, Building2 } from "lucide-react"
import { InfoTooltip } from "@/components/shared/info-tooltip"
import { useAuth } from "@/lib/auth-context"
import { RegisterCooperativeModal } from "@/components/modals/register-cooperative-modal"
import { useEnergyToken } from "@/hooks/useEnergyToken"
import { useAccountSetup } from "@/hooks/useAccountSetup"
import { useHorizonPayments } from "@/hooks/useHorizonPayments"
import { useEnergyDistribution } from "@/hooks/useEnergyDistribution"
import { useCertificateStats } from "@/hooks/useCertificateStats"
import { useMyMeters } from "@/hooks/useMyMeters"
import { useMyReadings } from "@/hooks/useMyReadings"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
  const { isConnected, isPending: walletPending, userProfile, address } = useWallet()
  const { session, refreshSession } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [showRegisterCoop, setShowRegisterCoop] = useState(false)
  const { getBalance, isLoading: isBalanceLoading, error: balanceError } = useEnergyToken()
  const { accountExists, isLoading: accountLoading, isFunding, error: fundError, isTestnet, fundAccount } = useAccountSetup()
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)

  const { payments, isLoading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = useHorizonPayments(address)
  const { getTotalGenerated, getMemberList, getMemberInfo } = useEnergyDistribution()
  const { stats: certStats, loading: certLoading, error: certError } = useCertificateStats()
  const { meters, loading: metersLoading } = useMyMeters()
  const { readings, loading: readingsLoading } = useMyReadings(address)

  const [communityStats, setCommunityStats] = useState<{
    totalKwh: number
    memberCount: number
    userPercent: number | null
  } | null>(null)
  const [communityFetchError, setCommunityFetchError] = useState<string | null>(null)
  const [communityLoadingLocal, setCommunityLoadingLocal] = useState(false)

  const loadBalance = useCallback(async () => {
    if (!address) return
    try {
      const value = await getBalance(address)
      setTokenBalance(Number.parseFloat(value))
    } catch (err) {
      console.error("Error loading balance", err)
      setTokenBalance(0)
    }
  }, [address, getBalance])

  useEffect(() => {
    if (isConnected && address) {
      loadBalance()
    } else {
      setTokenBalance(null)
    }
  }, [isConnected, address, loadBalance])

  // Fetch community stats — catch errors gracefully, with timeout
  // eslint-disable-next-line react-hooks/exhaustive-deps -- hook fns are stable by identity
  useEffect(() => {
    if (!isConnected || !address) return

    let cancelled = false

    const fetchCommunityStats = async () => {
      try {
        setCommunityFetchError(null)
        setCommunityLoadingLocal(true)

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 8000)
        )

        const [totalKwh, members] = await Promise.race([
          Promise.all([getTotalGenerated(), getMemberList()]),
          timeout,
        ]) as [number, string[]]

        if (cancelled) return

        let userPercent: number | null = null
        try {
          const info = await getMemberInfo(address)
          if (info.isMember) {
            userPercent = info.percent
          }
        } catch {
          // not a member
        }
        setCommunityStats({
          totalKwh,
          memberCount: members.length,
          userPercent,
        })
      } catch (err) {
        if (cancelled) return
        console.error("Error fetching community stats:", err)
        setCommunityFetchError("No se pudo conectar al contrato de comunidad")
      } finally {
        if (!cancelled) setCommunityLoadingLocal(false)
      }
    }

    fetchCommunityStats()
    return () => { cancelled = true }
  }, [isConnected, address])

  const [copied, setCopied] = useState(false)
  const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : null

  useEffect(() => {
    if (!walletPending && !isConnected) {
      router.push("/")
    }
  }, [walletPending, isConnected, router])

  const handleCopyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = address
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isConnected) {
    return null
  }

  const recentPayments = payments.slice(0, 5)

  const technologyChartData = certStats
    ? Object.entries(certStats.by_technology).map(([tech, data]) => ({
        name: tech.charAt(0).toUpperCase() + tech.slice(1),
        certificados: Math.round(data.certified_kwh),
        retirados: Math.round(data.retired_kwh),
      }))
    : []

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:ml-64">
        <DashboardHeader />

        <div className="p-4 md:p-6">
          {/* 1. Welcome Card */}
          {userProfile && (
            <Card id="user-info-section" className="mb-6 scroll-mt-4">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-solar-yellow/20 flex items-center justify-center overflow-hidden border-2 border-solar-yellow/30">
                    {userProfile.avatar ? (
                      <img
                        src={userProfile.avatar || "/placeholder.svg"}
                        alt={userProfile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-solar-yellow" />
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
                          className={`ml-2 p-1.5 rounded-md transition-all duration-200 active:scale-95 ${
                            copied ? "bg-success/10 text-success" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <span className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded-md bg-foreground text-background shadow-md whitespace-nowrap transition-all duration-200 ${
                          copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}>
                          {copied ? t("common.copied") : t("common.copyAddress")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account activation banner */}
          {!accountLoading && accountExists === false && (
            <Card className="mb-4 md:mb-6 border-2 border-warning/30 bg-warning/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {isTestnet
                      ? "Tu cuenta no está activada en Stellar Testnet"
                      : "Tu cuenta necesita XLM para operar en Stellar"}
                  </p>
                  {fundError && <p className="text-xs text-destructive mt-1">{fundError}</p>}
                </div>
                {isTestnet && (
                  <Button size="sm" variant="outline" onClick={fundAccount} disabled={isFunding}>
                    {isFunding ? (<><Spinner className="size-4 mr-1" />Activando…</>) : "Activar cuenta (Friendbot)"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Register cooperative CTA */}
          {session && session.admin_cooperative_ids.length === 0 && (
            <Card className="mb-4 md:mb-6 border border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("registerCoop.cta")}</p>
                  <p className="text-xs text-muted-foreground">{t("registerCoop.ctaDesc")}</p>
                </div>
                <Button size="sm" onClick={() => setShowRegisterCoop(true)}>
                  {t("registerCoop.title")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 2. Balance de tokens */}
          <Card className="mb-4 md:mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl md:text-2xl">{t("dashboard.balance")}</CardTitle>
                <InfoTooltip text="Tu balance de tokens de energía en la red Stellar" />
              </div>
            </CardHeader>
            <CardContent>
              {isBalanceLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner className="size-5" />
                </div>
              )}
              {!isBalanceLoading && balanceError && (
                <div className="space-y-2">
                  <p className="text-destructive text-sm">{balanceError}</p>
                  <Button variant="outline" size="sm" onClick={loadBalance} disabled={isBalanceLoading} className="gap-2">
                    <RefreshCw className="size-4" />
                    Reintentar
                  </Button>
                </div>
              )}
              {!isBalanceLoading && !balanceError && tokenBalance !== null && (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{tokenBalance.toLocaleString("es-ES", { maximumFractionDigits: 2 })}</span>
                  <span className="text-lg text-muted-foreground">kWh tokenizados</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Certification Stats */}
          <Card className="mb-4 md:mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-energy-green" />
                <CardTitle className="text-lg md:text-xl">{t("dashboard.certificationStats")}</CardTitle>
                <InfoTooltip text="Estadísticas de los proto-certificados emitidos y retirados por las cooperativas" />
              </div>
            </CardHeader>
            <CardContent>
              {certLoading && (
                <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                  <Spinner className="size-5" />
                </div>
              )}
              {certError && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No se pudieron cargar las estadísticas de certificación
                </div>
              )}
              {certStats && !certError && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-4 rounded-lg bg-energy-green/10 border border-energy-green/20">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Zap className="w-5 h-5 text-energy-green" />
                        <InfoTooltip text="Total de kWh con certificado emitido en blockchain" />
                      </div>
                      <p className="text-xl font-bold text-energy-green">{certStats.total_kwh_certified.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("certificates.stats.certified")}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-solar-orange/10 border border-solar-orange/20">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Flame className="w-5 h-5 text-solar-orange" />
                        <InfoTooltip text="kWh cuyo certificado fue comprado y retirado por un comprador" />
                      </div>
                      <p className="text-xl font-bold text-solar-orange">{certStats.total_kwh_retired.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("certificates.stats.retired")}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-web3-purple/10 border border-web3-purple/20">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Leaf className="w-5 h-5 text-web3-purple" />
                        <InfoTooltip text="Estimación de CO₂ evitado por la generación renovable certificada" />
                      </div>
                      <p className="text-xl font-bold text-web3-purple">{certStats.co2_avoided_kg.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("certificates.stats.co2")}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-solar-yellow/10 border border-solar-yellow/20">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Award className="w-5 h-5 text-solar-yellow" />
                        <InfoTooltip text="Certificados emitidos que aún no han sido comprados" />
                      </div>
                      <p className="text-xl font-bold text-solar-yellow">{certStats.certificates_available}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("certificates.stats.available")}</p>
                    </div>
                  </div>

                  {technologyChartData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">{t("certificates.byTechnology")}</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={technologyChartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                          <Bar dataKey="certificados" fill="#3DDC97" radius={[4, 4, 0, 0]} name="Certificados" />
                          <Bar dataKey="retirados" fill="#FA9A4B" radius={[4, 4, 0, 0]} name="Retirados" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
              {!certLoading && !certError && !certStats && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t("certificates.noData")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Community Stats + Recent Transactions */}
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            {/* Community Stats */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-energy-green" />
                  <CardTitle className="text-lg md:text-xl">Comunidad</CardTitle>
                  <InfoTooltip text="Datos on-chain del contrato de distribución energética de tu cooperativa" />
                </div>
                <CardDescription>Estadísticas on-chain</CardDescription>
              </CardHeader>
              <CardContent>
                {communityLoadingLocal && !communityStats && !communityFetchError && (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Spinner className="size-5" />
                  </div>
                )}
                {communityFetchError && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>{communityFetchError}</p>
                    <p className="text-xs mt-1">Se mostrará cuando el contrato esté desplegado</p>
                  </div>
                )}
                {communityStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-energy-green/10 border border-energy-green/20">
                        <Zap className="w-6 h-6 text-energy-green mx-auto mb-2" />
                        <p className="text-2xl font-bold text-energy-green">{communityStats.totalKwh.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">kWh generados</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted border border-border">
                        <Users className="w-6 h-6 text-foreground mx-auto mb-2" />
                        <p className="text-2xl font-bold">{communityStats.memberCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Miembros activos</p>
                      </div>
                    </div>

                    {communityStats.userPercent !== null && (
                      <div className="bg-energy-green/5 border border-energy-green/20 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-energy-green" />
                            <span className="text-sm font-medium">Tu participación</span>
                          </div>
                          <span className="text-lg font-bold text-energy-green">{communityStats.userPercent}%</span>
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
                {!communityLoadingLocal && !communityFetchError && !communityStats && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay datos de comunidad disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg md:text-xl">Últimas transacciones</CardTitle>
                    <InfoTooltip text="Pagos reales registrados en la red Stellar (Horizon API)" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={refetchPayments} disabled={paymentsLoading} className="gap-1 text-xs">
                    <RefreshCw className={`size-3 ${paymentsLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <CardDescription>Stellar Horizon</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading && payments.length === 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Spinner className="size-5" />
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
                        <div key={payment.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isIncoming ? "bg-energy-green/10 text-energy-green" : "bg-solar-orange/10 text-solar-orange"
                          }`}>
                            {isIncoming ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{isIncoming ? "Recibido" : "Enviado"}</p>
                            <p className="text-xs text-muted-foreground">{formatRelativeTime(payment.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${isIncoming ? "text-energy-green" : "text-foreground"}`}>
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

          {/* 5. My Meters & My Readings */}
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
            {/* My Meters */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-solar-orange" />
                  <CardTitle className="text-lg md:text-xl">{t("dashboard.myMeters")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {metersLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                    <Spinner className="size-5" />
                  </div>
                )}
                {!metersLoading && meters.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Gauge className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>{t("dashboard.noMeters")}</p>
                  </div>
                )}
                {meters.length > 0 && (
                  <div className="space-y-3">
                    {meters.map((meter) => (
                      <div key={meter.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-solar-orange/10 flex items-center justify-center">
                          <Gauge className="w-4 h-4 text-solar-orange" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{meter.device_type}</p>
                          <p className="text-xs text-muted-foreground">{meter.technology}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{meter.capacity_kw} kW</p>
                          <p className="text-xs text-muted-foreground">{meter.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Readings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-web3-purple" />
                  <CardTitle className="text-lg md:text-xl">{t("dashboard.myReadings")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {readingsLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                    <Spinner className="size-5" />
                  </div>
                )}
                {!readingsLoading && readings.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>{t("dashboard.noReadings")}</p>
                  </div>
                )}
                {readings.length > 0 && (
                  <div className="space-y-3">
                    {readings.slice(0, 5).map((reading) => (
                      <div key={reading.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-web3-purple/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-web3-purple" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{reading.kwh_generated} kWh</p>
                          <p className="text-xs text-muted-foreground">
                            {reading.reading_date
                              ? new Date(reading.reading_date).toLocaleDateString()
                              : formatRelativeTime(reading.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            reading.status === "verified"
                              ? "bg-energy-green/10 text-energy-green"
                              : "bg-solar-yellow/10 text-solar-yellow"
                          }`}>
                            {reading.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <RegisterCooperativeModal
        isOpen={showRegisterCoop}
        onClose={() => setShowRegisterCoop(false)}
        onSuccess={refreshSession}
      />
    </div>
  )
}
