import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getAlertas, resolverAlerta } from '@/api/alerta'
import type { AlertaStock } from '@/types/alerta'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 20
const isStockShortageAlert = (alert: AlertaStock) => alert.tipo === 'LOW_STOCK' || alert.tipo === 'OUT_OF_STOCK'
const canResolveManually = (alert: AlertaStock) => !isStockShortageAlert(alert)
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
    return { open, resolved }
  }, [alerts])

  const total = alerts.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedAlerts = useMemo(() => alerts.slice(offset, offset + PAGE_SIZE), [alerts, offset])
  const openAlertsInPage = useMemo(
    () => paginatedAlerts.filter((alert) => !alert.resuelta && canResolveManually(alert)),
    [paginatedAlerts]
  )
  const allOpenSelectedInPage =
    openAlertsInPage.length > 0 && openAlertsInPage.every((alert) => selectedAlertIds.includes(alert.id))
  const showSelection = canResolve && filter !== 'resolved'

  useEffect(() => {
    setOffset(0)
  }, [filter])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestiona alertas de stock y anomalías.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="destructive">Abiertas: {counters.open}</Badge>
            <Badge variant="secondary">Resueltas: {counters.resolved}</Badge>
            <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | 'open' | 'resolved')}>
              <SelectTrigger className="w-40">
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
                size="sm"
                disabled={selectedAlertIds.length === 0 || resolving}
                onClick={() => void resolveSelected()}
              >
                {resolving ? 'Resolviendo...' : `Resolver seleccionadas (${selectedAlertIds.length})`}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
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
                </TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Producto</TableHead>
                <TableHead className="text-center">Mensaje</TableHead>
                <TableHead className="text-center">Creada</TableHead>
                <TableHead className="text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando alertas...</TableCell>
                </TableRow>
              ) : paginatedAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay alertas para mostrar.</TableCell>
                </TableRow>
              ) : (
                paginatedAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="text-center">
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
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={alert.resuelta ? 'secondary' : 'destructive'}>{alert.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{alert.productoNombre}</TableCell>
                    <TableCell className="text-center">{alert.mensaje}</TableCell>
                    <TableCell className="text-center">{formatDate(alert.creadaEn)}</TableCell>
                    <TableCell className="text-center">
                      {!alert.resuelta && canResolve ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" disabled={resolving} aria-label="Acciones de alerta">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

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
