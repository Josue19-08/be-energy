"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@/lib/wallet-context"
import { useI18n } from "@/lib/i18n-context"
import { useHorizonPayments } from "@/hooks/useHorizonPayments"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ShoppingCart, Send, ArrowDownLeft, ArrowUpRight, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export default function ActivityPage() {
  const { isConnected, address } = useWallet()
  const { t } = useI18n()
  const router = useRouter()
  const { payments, isLoading, error, refetch } = useHorizonPayments(address)

  useEffect(() => {
    if (!isConnected) {
      router.push("/")
    }
  }, [isConnected, router])

  if (!isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:ml-64">
        <DashboardHeader />

        <div className="p-4 md:p-6 space-y-6">
          <Button onClick={() => router.push("/dashboard")} variant="ghost" className="mb-2 hover:bg-muted">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>

          {/* Navigation cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Link href="/activity/purchases">
              <Card className="hover:bg-muted/50 transition-all cursor-pointer h-full group border-2 hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
                      <ShoppingCart className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t("activity.purchases")}</CardTitle>
                      <CardDescription>{t("activity.purchasesDescription")}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t("activity.lastTwoMonths")}</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/activity/sales">
              <Card className="hover:bg-muted/50 transition-all cursor-pointer h-full group border-2 hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Send className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t("activity.sales")}</CardTitle>
                      <CardDescription>{t("activity.salesDescription")}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t("activity.lastTwoMonths")}</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent payments from Horizon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("activity.recentPayments")}</CardTitle>
              <CardDescription>{t("activity.recentPaymentsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("activity.loading")}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span>{t("activity.errorFetching")}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={refetch}>
                    {t("activity.retry")}
                  </Button>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t("activity.noTransactions")}</div>
              ) : (
                <div className="space-y-3">
                  {payments.slice(0, 10).map((payment) => {
                    const isIncoming = payment.to === address
                    const assetLabel =
                      payment.asset_type === "native"
                        ? "XLM"
                        : payment.asset_code ?? payment.asset_type

                    return (
                      <div
                        key={payment.id}
                        className="flex items-center gap-3 p-4 rounded-lg hover:bg-muted transition-colors border border-border"
                      >
                        <div className="flex-shrink-0">
                          {isIncoming ? (
                            <ArrowDownLeft className="w-5 h-5 text-success" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base capitalize">
                            {payment.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {formatDate(payment.created_at)} · {formatTime(payment.created_at)}
                          </p>
                        </div>
                        <div
                          className={`flex-shrink-0 font-semibold text-sm md:text-base ${
                            isIncoming ? "text-success" : "text-primary"
                          }`}
                        >
                          {isIncoming ? "+" : "-"}
                          {payment.amount ?? payment.source_amount ?? "–"} {assetLabel}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
