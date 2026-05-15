import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  eliminarReporte,
  eliminarReporteProgramado,
  getReportes,
  getReportesProgramados,
  toggleReporteProgramado,
} from '@/features/reportes/api/reporte'
import type { Reporte, ReporteProgramado, TipoReporte } from '@/features/reportes/types/reporte'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ReporteFormModal from '@/features/reportes/components/ReporteFormModal'
import ReporteDetailModal from '@/features/reportes/components/ReporteDetailModal'
import ReporteProgramadoModal from '@/features/reportes/components/ReporteProgramadoModal'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Clock,
  FileText,
  Package,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react'

const TIPO_META: Record<TipoReporte, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  INVENTARIO:  { label: 'Inventario',   icon: Package,       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ALERTAS:     { label: 'Alertas',      icon: AlertTriangle,  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  CLIENTES:    { label: 'Clientes',     icon: Users,          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  MOVIMIENTOS: { label: 'Movimientos',  icon: BarChart3,      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  VENTAS:      { label: 'Ventas',       icon: ShoppingCart,   color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
}

const FRECUENCIA_LABEL: Record<string, string> = {
  DIARIO: 'Diario',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
}

export default function ReportesPage() {
  const { hasRole } = useAuthStore()
  const canCreate = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [reportes, setReportes] = useState<Reporte[]>([])
  const [programados, setProgramados] = useState<ReporteProgramado[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState<TipoReporte | 'all'>('all')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [programadoOpen, setProgramadoOpen] = useState(false)
  const [selected, setSelected] = useState<Reporte | null>(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [r, p] = await Promise.all([getReportes(), getReportesProgramados()])
      setReportes(r)
      setProgramados(p)
    } catch {
      toast.error('No se pudieron cargar los reportes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return reportes.filter((r) => {
      const tipoOk = filterTipo === 'all' || r.tipo === filterTipo
      const textOk = !term || r.nombre.toLowerCase().includes(term) || (r.generadoPor ?? '').toLowerCase().includes(term)
      return tipoOk && textOk
    })
  }, [reportes, filterTipo, search])

  const openDetail = (r: Reporte) => { setSelected(r); setDetailOpen(true) }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canCreate) return
    try {
      await eliminarReporte(id)
      toast.success('Reporte eliminado')
      void loadAll()
    } catch {
      toast.error('No se pudo eliminar el reporte')
    }
  }

  const handleToggleProgramado = async (id: number) => {
    try {
      const updated = await toggleReporteProgramado(id)
      setProgramados((prev) => prev.map((p) => (p.id === id ? updated : p)))
      toast.success(updated.activo ? 'Programación activada' : 'Programación pausada')
    } catch {
      toast.error('No se pudo actualizar la programación')
    }
  }

  const handleDeleteProgramado = async (id: number) => {
    try {
      await eliminarReporteProgramado(id)
      setProgramados((prev) => prev.filter((p) => p.id !== id))
      toast.success('Programación eliminada')
    } catch {
      toast.error('No se pudo eliminar la programación')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial de reportes generados y configuración de generación automática.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nombre o generado por…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as TipoReporte | 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {(Object.keys(TIPO_META) as TipoReporte[]).map((t) => (
                <SelectItem key={t} value={t}>{TIPO_META[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => void loadAll()}>Recargar</Button>
            {canCreate && (
              <>
                <Button variant="outline" onClick={() => setProgramadoOpen(true)}>
                  <CalendarClock className="mr-1.5 h-4 w-4" />
                  Programar
                </Button>
                <Button onClick={() => setFormOpen(true)}>+ Nuevo reporte</Button>
              </>
            )}
          </div>
        </div>

        {/* Reports table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Generado por</TableHead>
                <TableHead>Fecha</TableHead>
                {canCreate && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Cargando reportes…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                      <p>No hay reportes. Genera el primero.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const meta = TIPO_META[r.tipo]
                  const Icon = meta.icon
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => openDetail(r)}
                    >
                      <TableCell className="font-medium">{r.nombre}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.color}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.generadoPor ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString('es-ES')}
                      </TableCell>
                      {canCreate && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => void handleDelete(r.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Scheduled reports section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Reportes programados</h2>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {programados.length}
            </span>
          </div>

          {programados.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No hay reportes programados.{canCreate ? ' Usa el botón "Programar" para crear uno.' : ''}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {programados.map((p) => {
                const meta = TIPO_META[p.tipo]
                const Icon = meta?.icon ?? FileText
                return (
                  <div
                    key={p.id}
                    className={`rounded-lg border bg-card p-4 transition ${p.activo ? '' : 'opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta?.color ?? ''}`}>
                          <Icon className="h-3 w-3" />
                          {meta?.label ?? p.tipo}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {FRECUENCIA_LABEL[p.frecuencia] ?? p.frecuencia}
                        </span>
                      </div>
                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteProgramado(p.id)}
                          className="text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          Próxima:{' '}
                          {new Date(p.proximaEjecucion).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      {p.ultimaEjecucion && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            Última:{' '}
                            {new Date(p.ultimaEjecucion).toLocaleString('es-ES', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {canCreate && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs font-medium ${p.activo ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          {p.activo ? 'Activo' : 'Pausado'}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleToggleProgramado(p.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            p.activo
                              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {p.activo ? 'Pausar' : 'Activar'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ReporteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => void loadAll()}
      />

      <ReporteDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        reporte={selected}
      />

      <ReporteProgramadoModal
        open={programadoOpen}
        onClose={() => setProgramadoOpen(false)}
        onSuccess={() => void loadAll()}
      />
    </div>
  )
}
