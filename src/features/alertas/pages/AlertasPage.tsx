import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, CheckCircle2, MoreHorizontal, Search, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getAlertasPaged, getAlertasResumen } from '@/features/alertas/api/alerta'
import type { AlertaResumen, AlertaStock } from '@/features/alertas/types/alerta'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { useFormatters } from '@/lib/useFormatters'

const PAGE_SIZE = 7
const isStockShortageAlert = (alert: AlertaStock) => alert.tipo === 'LOW_STOCK' || alert.tipo === 'OUT_OF_STOCK'
const isPriceAnomalyAlert = (alert: AlertaStock) => alert.tipo === 'PRICE_ANOMALY'
const isOverstockAlert = (alert: AlertaStock) => alert.tipo === 'OVERSTOCK'

const typeMeta: Record<string, { label: string; chipClass: string; dotClass: string; rowAccent: string }> = {
  OUT_OF_STOCK: {
    label: 'SIN STOCK',
    chipClass: 'bg-red-500/15 text-red-300',
    dotClass: 'text-red-400',
    rowAccent: 'before:bg-red-500',
  },
  LOW_STOCK: {
    label: 'STOCK BAJO',
    chipClass: 'bg-amber-500/15 text-amber-300',
    dotClass: 'text-amber-400',
    rowAccent: 'before:bg-amber-500',
  },
  OVERSTOCK: {
    label: 'SOBRESTOCK',
    chipClass: 'bg-orange-500/15 text-orange-300',
    dotClass: 'text-orange-400',
    rowAccent: 'before:bg-orange-500',
  },
  PRICE_ANOMALY: {
    label: 'ANOMALÍA PRECIO',
    chipClass: 'bg-violet-500/15 text-violet-300',
    dotClass: 'text-violet-400',
    rowAccent: 'before:bg-violet-500',
  },
}

export default function AlertasPage() {
  const { formatDateTime } = useFormatters()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [alerts, setAlerts] = useState<AlertaStock[]>([])
  const [alertsSummary, setAlertsSummary] = useState<AlertaResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [seenAlertIds, setSeenAlertIds] = useState<number[]>([])
  const seenStorageKey = useMemo(
    () => `nuv-alertas-seen:${user?.username ?? 'anon'}`,
    [user?.username],
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(seenStorageKey)
      if (!raw) {
        setSeenAlertIds([])
        return
      }
      const parsed = JSON.parse(raw)
      const ids = Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'number') : []
      setSeenAlertIds(ids)
    } catch {
      setSeenAlertIds([])
    }
  }, [seenStorageKey])

  useEffect(() => {
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(seenAlertIds))
    } catch {
      // noop
    }
  }, [seenAlertIds, seenStorageKey])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const resolvedFilter = filter === 'all' ? undefined : filter === 'resolved'
      const [tableData, summaryData] = await Promise.all([
        getAlertasPaged({
          resueltas: resolvedFilter,
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          offset,
        }),
        getAlertasResumen(),
      ])
      setAlerts(tableData.content)
      setTotal(tableData.total)
      setAlertsSummary(summaryData)
    } catch {
      toast.error('No se pudieron cargar las alertas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAlerts()
    const timer = window.setInterval(() => {
      void loadAlerts()
    }, 45000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadAlerts()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [filter, offset, search])

  const goToPedidosForRestock = (alert: AlertaStock) => {
    toast.info(`Abriendo pedidos para reponer stock de ${alert.productoNombre}`)
    navigate(`/pedidos?restockProductId=${alert.productoId}&autoCreate=1`)
  }

  const goToProductoForPriceFix = (alert: AlertaStock) => {
    toast.info(`Abriendo producto para corregir precio: ${alert.productoNombre}`)
    navigate(`/productos?editProductId=${alert.productoId}&focus=pricing`)
  }

  const goToProductoForOverstockFix = (alert: AlertaStock) => {
    toast.info(`Abriendo producto para ajustar stock máximo: ${alert.productoNombre}`)
    navigate(`/productos?editProductId=${alert.productoId}&focus=stock`) 
  }

  const isSeen = (alertId: number) => seenAlertIds.includes(alertId)

  const formatDate = (value: string | null) =>
    value
      ? formatDateTime(value, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—'

  const markSeen = (alertId: number) => {
    setSeenAlertIds((current) => (current.includes(alertId) ? current : [...current, alertId]))
  }

  const markUnseen = (alertId: number) => {
    setSeenAlertIds((current) => current.filter((id) => id !== alertId))
  }

  const counters = useMemo(() => {
    const critical = alertsSummary?.criticas ?? 0
    const low = alertsSummary?.stockBajo ?? 0
    const anomalies = alertsSummary?.anomalias ?? alertsSummary?.anomaliasPrecio ?? 0
    const resolvedLast7d = alertsSummary?.resueltasUltimos7Dias ?? 0
    return { critical, low, anomalies, resolvedLast7d }
  }, [alertsSummary])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  useEffect(() => {
    setOffset(0)
  }, [filter, search])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/15 p-2"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <div><p className="text-2xl font-bold text-red-600">{counters.critical}</p><p className="text-sm font-medium text-foreground">Críticas</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Solo productos sin stock</p>
          </article>

          <article className="rounded-lg bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/15 p-2"><Boxes className="h-5 w-5 text-amber-500" /></div>
              <div><p className="text-2xl font-bold text-amber-600">{counters.low}</p><p className="text-sm font-medium text-foreground">Stock bajo</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Debajo del mínimo</p>
          </article>

          <article className="rounded-lg bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-500/15 p-2"><TrendingUp className="h-5 w-5 text-violet-500" /></div>
              <div><p className="text-2xl font-bold text-violet-600">{counters.anomalies}</p><p className="text-sm font-medium text-foreground">Anomalías</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Precio o sobrestock</p>
          </article>

          <article className="rounded-lg bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-500/15 p-2"><CheckCircle2 className="h-5 w-5 text-cyan-500" /></div>
              <div><p className="text-2xl font-bold text-cyan-600">{counters.resolvedLast7d}</p><p className="text-sm font-medium text-foreground">Resueltas</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Últimos 7 días</p>
          </article>
        </section>

        <section className="rounded-lg bg-card p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar alertas..."
                className="pl-9"
              />
            </div>

            <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | 'open' | 'resolved')}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Abiertas</SelectItem>
                <SelectItem value="resolved">Resueltas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_140px_80px] items-center gap-3 px-3 text-sm text-muted-foreground">
              <div>Alerta</div>
              <div>Detectada</div>
              <div className="text-center">Acciones</div>
            </div>

            {loading ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-muted-foreground">Cargando alertas...</div>
            ) : alerts.length === 0 ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-muted-foreground">No hay alertas para mostrar.</div>
            ) : (
              alerts.map((alert) => {
                const meta = typeMeta[alert.tipo] ?? {
                  label: alert.tipo,
                  chipClass: 'bg-slate-500/20 text-slate-200',
                  dotClass: 'text-slate-300',
                  rowAccent: 'before:bg-slate-500',
                }

                const seen = isSeen(alert.id)
                const chipClass = seen ? 'bg-muted text-muted-foreground' : meta.chipClass
                const dotClass = seen ? 'text-muted-foreground' : meta.dotClass
                const rowAccent = seen ? 'before:bg-transparent' : meta.rowAccent

                return (
                  <article key={alert.id} className={`relative grid grid-cols-[1fr_140px_80px] items-center gap-3 rounded-lg bg-secondary/55 p-3 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-r-md ${rowAccent}`}>
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge className={chipClass}>{meta.label}</Badge>
                      </div>
                      <p className="truncate font-semibold text-foreground">{alert.productoNombre}</p>
                      <p className="truncate text-sm text-muted-foreground">{alert.mensaje}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Boxes className="h-3.5 w-3.5" /> Inventario</span>
                        <span className={`inline-flex items-center gap-1 ${dotClass}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {alert.resuelta ? 'Resuelta' : 'Abierta'}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-foreground">{formatDate(alert.creadaEn)}</div>

                    <div className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Acciones de alerta">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {seen ? (
                            <DropdownMenuItem onSelect={() => markUnseen(alert.id)}>
                              Marcar como no visto
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => markSeen(alert.id)}>
                              Marcar como visto
                            </DropdownMenuItem>
                          )}

                          {!alert.resuelta && isPriceAnomalyAlert(alert) ? (
                            <DropdownMenuItem onSelect={() => goToProductoForPriceFix(alert)}>
                              Corregir precio en producto
                            </DropdownMenuItem>
                          ) : null}

                          {!alert.resuelta && isOverstockAlert(alert) ? (
                            <DropdownMenuItem onSelect={() => goToProductoForOverstockFix(alert)}>
                              Ajustar stock máximo en producto
                            </DropdownMenuItem>
                          ) : null}

                          {!alert.resuelta && isStockShortageAlert(alert) ? (
                            <DropdownMenuItem onSelect={() => goToPedidosForRestock(alert)}>
                              Ir a pedidos para reponer
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Pagina {currentPage} de {totalPages} | {total} registros</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setOffset((prev) => (prev + PAGE_SIZE >= total ? prev : prev + PAGE_SIZE))}
              disabled={offset + PAGE_SIZE >= total}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
