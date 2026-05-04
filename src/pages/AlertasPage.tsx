import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getAlertas, resolverAlerta } from '@/api/alerta'
import type { AlertaStock } from '@/types/alerta'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString('es-ES') : '—')

export default function AlertasPage() {
  const { hasRole } = useAuthStore()
  const canResolve = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [alerts, setAlerts] = useState<AlertaStock[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
            <p className="mt-1 text-sm text-gray-500">Gestiona alertas de stock y anomalías.</p>
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

        <div className="rounded-lg border bg-white">
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
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">Cargando alertas...</TableCell>
                </TableRow>
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">No hay alertas para mostrar.</TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
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
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
