import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, CheckCircle2, MoreHorizontal, Search, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getAlertas, resolverAlerta } from '@/api/alerta'
import type { AlertaStock } from '@/types/alerta'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 20
const isStockShortageAlert = (alert: AlertaStock) => alert.tipo === 'LOW_STOCK' || alert.tipo === 'OUT_OF_STOCK'
const canResolveManually = (alert: AlertaStock) => !isStockShortageAlert(alert)

const typeMeta: Record<string, { label: string; chipClass: string; dotClass: string; rowAccent: string }> = {
  OUT_OF_STOCK: {
    label: 'OUT OF STOCK',
    chipClass: 'bg-red-500/15 text-red-300',
    dotClass: 'text-red-400',
    rowAccent: 'before:bg-red-500',
  },
  LOW_STOCK: {
    label: 'LOW STOCK',
    chipClass: 'bg-amber-500/15 text-amber-300',
    dotClass: 'text-amber-400',
    rowAccent: 'before:bg-amber-500',
  },
  PRICE_ANOMALY: {
    label: 'PRICE ANOMALY',
    chipClass: 'bg-violet-500/15 text-violet-300',
    dotClass: 'text-violet-400',
    rowAccent: 'before:bg-violet-500',
  },
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export default function AlertasPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuthStore()
  const canResolve = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [alerts, setAlerts] = useState<AlertaStock[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [offset, setOffset] = useState(0)
  const [selectedAlertIds, setSelectedAlertIds] = useState<number[]>([])
  const [search, setSearch] = useState('')

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const data = await getAlertas(filter === 'all' ? undefined : filter === 'resolved')
      setAlerts(data)
      setSelectedAlertIds([])
    } catch {
      toast.error('No se pudieron cargar las alertas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAlerts()
  }, [filter])

  const resolve = async (id: number) => {
    setResolving(true)
    try {
      await resolverAlerta(id)
      toast.success('Alerta marcada como resuelta')
      await loadAlerts()
    } catch {
      toast.error('No se pudo resolver la alerta')
    } finally {
      setResolving(false)
    }
  }

  const resolveSelected = async () => {
    if (selectedAlertIds.length === 0) return
    const eligibleAlertIds = selectedAlertIds.filter((id) => {
      const alert = alerts.find((candidate) => candidate.id === id)
      return alert ? canResolveManually(alert) : false
    })
    if (eligibleAlertIds.length === 0) {
      toast.info('Las alertas de stock bajo o sin stock se resuelven al reponer inventario')
      return
    }
    setResolving(true)
    try {
      await Promise.all(eligibleAlertIds.map((id) => resolverAlerta(id)))
      toast.success(`${eligibleAlertIds.length} alertas marcadas como resueltas`)
      await loadAlerts()
    } catch {
      toast.error('No se pudieron resolver todas las alertas seleccionadas')
    } finally {
      setResolving(false)
    }
  }

  const goToPedidosForRestock = (alert: AlertaStock) => {
    toast.info(`Abriendo pedidos para reponer stock de ${alert.productoNombre}`)
    navigate('/pedidos')
  }

  const counters = useMemo(() => {
    const open = alerts.filter((alert) => !alert.resuelta).length
    const resolved = alerts.filter((alert) => alert.resuelta).length
    const critical = alerts.filter((alert) => !alert.resuelta && alert.tipo === 'OUT_OF_STOCK').length
    const low = alerts.filter((alert) => !alert.resuelta && alert.tipo === 'LOW_STOCK').length
    const anomalies = alerts.filter((alert) => !alert.resuelta && alert.tipo === 'PRICE_ANOMALY').length
    const resolvedLast7d = alerts.filter((alert) => {
      if (!alert.resuelta || !alert.resueltaEn) return false
      const resolvedAt = new Date(alert.resueltaEn).getTime()
      if (!Number.isFinite(resolvedAt)) return false
      return Date.now() - resolvedAt <= 7 * 24 * 60 * 60 * 1000
    }).length
    return { open, resolved, critical, low, anomalies, resolvedLast7d }
  }, [alerts])

  const filteredAlerts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return alerts
    return alerts.filter((alert) =>
      alert.productoNombre.toLowerCase().includes(term) ||
      alert.productoSku.toLowerCase().includes(term) ||
      alert.mensaje.toLowerCase().includes(term) ||
      alert.tipo.toLowerCase().includes(term)
    )
  }, [alerts, search])

  const total = filteredAlerts.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedAlerts = useMemo(() => filteredAlerts.slice(offset, offset + PAGE_SIZE), [filteredAlerts, offset])
  const openAlertsInPage = useMemo(
    () => paginatedAlerts.filter((alert) => !alert.resuelta && canResolveManually(alert)),
    [paginatedAlerts]
  )
  const allOpenSelectedInPage =
    openAlertsInPage.length > 0 && openAlertsInPage.every((alert) => selectedAlertIds.includes(alert.id))
  const showSelection = canResolve && filter !== 'resolved'

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
          <article className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/15 p-2"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <div><p className="text-2xl font-bold text-red-600">{counters.critical}</p><p className="text-sm font-medium text-foreground">Críticas</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Requieren atención</p>
          </article>

          <article className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/15 p-2"><Boxes className="h-5 w-5 text-amber-500" /></div>
              <div><p className="text-2xl font-bold text-amber-600">{counters.low}</p><p className="text-sm font-medium text-foreground">Stock bajo</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Monitorea inventario</p>
          </article>

          <article className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-500/15 p-2"><TrendingUp className="h-5 w-5 text-violet-500" /></div>
              <div><p className="text-2xl font-bold text-violet-600">{counters.anomalies}</p><p className="text-sm font-medium text-foreground">Anomalías</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Cambios detectados</p>
          </article>

          <article className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-500/15 p-2"><CheckCircle2 className="h-5 w-5 text-cyan-500" /></div>
              <div><p className="text-2xl font-bold text-cyan-600">{counters.resolvedLast7d}</p><p className="text-sm font-medium text-foreground">Resueltas</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Últimos 7 días</p>
          </article>
        </section>

        <section className="rounded-lg border bg-card p-4">
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

            {canResolve ? (
              <Button
                variant="outline"
                disabled={selectedAlertIds.length === 0 || resolving}
                onClick={() => void resolveSelected()}
              >
                {resolving ? 'Resolviendo...' : `Resolver seleccionadas (${selectedAlertIds.length})`}
              </Button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[40px_1fr_140px_80px] items-center gap-3 px-3 text-sm text-muted-foreground">
              <div className="text-center">
                {showSelection ? (
                  <input
                    type="checkbox"
                    checked={allOpenSelectedInPage}
                    disabled={resolving}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedAlertIds((current) => {
                          const next = new Set(current)
                          openAlertsInPage.forEach((alert) => next.add(alert.id))
                          return Array.from(next)
                        })
                      } else {
                        setSelectedAlertIds((current) =>
                          current.filter((id) => !openAlertsInPage.some((alert) => alert.id === id))
                        )
                      }
                    }}
                    aria-label="Seleccionar alertas abiertas de esta página"
                  />
                ) : null}
              </div>
              <div>Alerta</div>
              <div>Detectada</div>
              <div className="text-center">Acciones</div>
            </div>

            {loading ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-muted-foreground">Cargando alertas...</div>
            ) : paginatedAlerts.length === 0 ? (
              <div className="rounded-lg border bg-card px-4 py-10 text-center text-muted-foreground">No hay alertas para mostrar.</div>
            ) : (
              paginatedAlerts.map((alert) => {
                const meta = typeMeta[alert.tipo] ?? {
                  label: alert.tipo,
                  chipClass: 'bg-slate-500/20 text-slate-200',
                  dotClass: 'text-slate-300',
                  rowAccent: 'before:bg-slate-500',
                }

                return (
                  <article key={alert.id} className={`relative grid grid-cols-[40px_1fr_140px_80px] items-center gap-3 rounded-lg border bg-card p-3 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-r-md ${meta.rowAccent}`}>
                    <div className="text-center">
                      {!alert.resuelta && canResolveManually(alert) && showSelection ? (
                        <input
                          type="checkbox"
                          checked={selectedAlertIds.includes(alert.id)}
                          disabled={resolving}
                          onChange={(event) => {
                            setSelectedAlertIds((current) =>
                              event.target.checked
                                ? [...current, alert.id]
                                : current.filter((id) => id !== alert.id)
                            )
                          }}
                          aria-label={`Seleccionar alerta ${alert.id}`}
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge className={meta.chipClass}>{meta.label}</Badge>
                      </div>
                      <p className="truncate font-semibold text-foreground">{alert.productoNombre}</p>
                      <p className="truncate text-sm text-muted-foreground">{alert.mensaje}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Boxes className="h-3.5 w-3.5" /> Inventario</span>
                        <span className={`inline-flex items-center gap-1 ${meta.dotClass}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {alert.resuelta ? 'Resuelta' : 'Abierta'}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-foreground">{formatDate(alert.creadaEn)}</div>

                    <div className="text-center">
                      {!alert.resuelta && canResolve ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" disabled={resolving} aria-label="Acciones de alerta">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canResolveManually(alert) ? (
                              <DropdownMenuItem onSelect={() => void resolve(alert.id)}>
                                Resolver
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => goToPedidosForRestock(alert)}>
                                Ir a pedidos para reponer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
