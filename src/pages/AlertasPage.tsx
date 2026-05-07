import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getAlertas, resolverAlerta } from '@/api/alerta'
import type { AlertaStock } from '@/types/alerta'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 20
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString('es-ES') : '—')

export default function AlertasPage() {
  const { hasRole } = useAuthStore()
  const canResolve = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [alerts, setAlerts] = useState<AlertaStock[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const data = await getAlertas(filter === 'all' ? undefined : filter === 'resolved')
      setAlerts(data)
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
    try {
      await resolverAlerta(id)
      toast.success('Alerta marcada como resuelta')
      await loadAlerts()
    } catch {
      toast.error('No se pudo resolver la alerta')
    }
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
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead>Resuelta</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Cargando alertas...</TableCell>
                </TableRow>
              ) : paginatedAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay alertas para mostrar.</TableCell>
                </TableRow>
              ) : (
                paginatedAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge variant={alert.resuelta ? 'secondary' : 'destructive'}>{alert.tipo}</Badge>
                    </TableCell>
                    <TableCell>{alert.productoNombre}</TableCell>
                    <TableCell className="font-mono text-xs">{alert.productoSku}</TableCell>
                    <TableCell>{alert.mensaje}</TableCell>
                    <TableCell>{formatDate(alert.creadaEn)}</TableCell>
                    <TableCell>{formatDate(alert.resueltaEn)}</TableCell>
                    <TableCell className="text-right">
                      {!alert.resuelta && canResolve ? (
                        <Button size="sm" variant="outline" onClick={() => void resolve(alert.id)}>
                          Resolver
                        </Button>
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

