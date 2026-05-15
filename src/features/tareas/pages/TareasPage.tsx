import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { actualizarEstadoTarea, eliminarTarea, getTareasPaged, getTareasResumen } from '@/features/tareas/api/tarea'
import type { EstadoTarea, Tarea, TareaResumen } from '@/features/tareas/types/tarea'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import TareaFormModal from '@/features/tareas/components/TareaFormModal'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Package,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react'

/* ── Meta ── */

const ESTADO_META: Record<EstadoTarea, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDIENTE:  { label: 'Pendiente',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  icon: Circle },
  EN_GESTION: { label: 'En gestión',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',      icon: PlayCircle },
  POSPUESTO:  { label: 'Pospuesto',    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',  icon: PauseCircle },
  COMPLETADO: { label: 'Completado',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  icon: CheckCircle2 },
}

const PRIORIDAD_META = {
  ALTA:  { label: 'Alta',  dot: 'bg-red-500' },
  MEDIA: { label: 'Media', dot: 'bg-amber-400' },
  BAJA:  { label: 'Baja',  dot: 'bg-slate-400' },
}

const ALERTA_TIPO_LABEL: Record<string, string> = {
  LOW_STOCK:     'Stock bajo',
  OUT_OF_STOCK:  'Sin stock',
  OVERSTOCK:     'Exceso de stock',
  PRICE_ANOMALY: 'Anomalía de precio',
}

const FILTER_TABS: { value: 'all' | EstadoTarea; label: string }[] = [
  { value: 'all',        label: 'Todas' },
  { value: 'PENDIENTE',  label: 'Pendiente' },
  { value: 'EN_GESTION', label: 'En gestión' },
  { value: 'POSPUESTO',  label: 'Pospuesto' },
  { value: 'COMPLETADO', label: 'Completado' },
]

const ESTADOS_OPCIONES: EstadoTarea[] = ['PENDIENTE', 'EN_GESTION', 'POSPUESTO', 'COMPLETADO']

const CARDS_PER_PAGE = 9

/* ── Component ── */

export default function TareasPage() {
  const { hasRole } = useAuthStore()
  const canDelete = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [resumen, setResumen] = useState<TareaResumen | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | EstadoTarea>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pageData, summaryData] = await Promise.all([
        getTareasPaged({
          estado: activeFilter === 'all' ? undefined : activeFilter,
          limit: CARDS_PER_PAGE,
          offset: (page - 1) * CARDS_PER_PAGE,
        }),
        getTareasResumen(),
      ])
      setTareas(pageData.content)
      setTotal(pageData.total)
      setResumen(summaryData)
    } catch {
      toast.error('No se pudieron cargar las tareas')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, page])

  useEffect(() => { void load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / CARDS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage)
    }
  }, [currentPage, page])

  const handleEstado = async (id: number, estado: EstadoTarea) => {
    try {
      await actualizarEstadoTarea(id, estado)
      await load()
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await eliminarTarea(id)
      await load()
      toast.success('Tarea eliminada')
    } catch {
      toast.error('No se pudo eliminar la tarea')
    }
  }

  // Counts per state for the tab badges
  const counts = useMemo(() => {
    return {
      all: resumen?.total ?? 0,
      PENDIENTE: resumen?.pendiente ?? 0,
      EN_GESTION: resumen?.enGestion ?? 0,
      POSPUESTO: resumen?.pospuesto ?? 0,
      COMPLETADO: resumen?.completado ?? 0,
    }
  }, [resumen])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona las alertas de stock y tareas pendientes. Las alertas se sincronizan automáticamente.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => void load()}>Recargar</Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva tarea
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setActiveFilter(tab.value); setPage(1) }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                activeFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {tab.label}
              {counts[tab.value] !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeFilter === tab.value ? 'bg-primary-foreground/20' : 'bg-background'
                }`}>
                  {counts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-card p-5 h-48" />
            ))}
          </div>
        ) : tareas.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-medium text-muted-foreground">
              {activeFilter === 'all' ? 'No hay tareas' : `No hay tareas en estado "${ESTADO_META[activeFilter as EstadoTarea]?.label ?? activeFilter}"`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tareas.map((tarea) => (
              <TareaCard
                key={tarea.id}
                tarea={tarea}
                canDelete={canDelete}
                onEstado={handleEstado}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      <TareaFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => void load()}
      />
    </div>
  )
}

/* ── TareaCard ── */

function TareaCard({
  tarea,
  canDelete,
  onEstado,
  onDelete,
}: {
  tarea: Tarea
  canDelete: boolean
  onEstado: (id: number, estado: EstadoTarea) => void
  onDelete: (id: number) => void
}) {
  const estadoMeta = ESTADO_META[tarea.estado]
  const EstadoIcon = estadoMeta.icon
  const prioridadMeta = PRIORIDAD_META[tarea.prioridad]
  const isAlerta = tarea.tipo === 'ALERTA_STOCK'

  const fecha = new Date(tarea.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={`flex flex-col rounded-xl border bg-card transition ${tarea.estado === 'COMPLETADO' ? 'opacity-60' : ''}`}>
      {/* Card top accent bar by priority */}
      <div className={`h-1 w-full rounded-t-xl ${
        tarea.prioridad === 'ALTA' ? 'bg-red-500' :
        tarea.prioridad === 'MEDIA' ? 'bg-amber-400' : 'bg-slate-300'
      }`} />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoMeta.color}`}>
              <EstadoIcon className="h-3 w-3" />
              {estadoMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {isAlerta ? <AlertTriangle className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
              {isAlerta ? 'Alerta' : 'Manual'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`h-2 w-2 rounded-full ${prioridadMeta.dot}`} title={`Prioridad ${prioridadMeta.label}`} />
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(tarea.id)}
                className="text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-1.5">
          <p className="font-semibold leading-snug text-foreground">{tarea.titulo}</p>
          {tarea.descripcion && (
            <p className="text-sm text-muted-foreground line-clamp-2">{tarea.descripcion}</p>
          )}

          {isAlerta && tarea.productoNombre && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">{tarea.productoNombre}</span>
                {tarea.sku && <span className="ml-1.5 font-mono text-muted-foreground">{tarea.sku}</span>}
                {tarea.alertaTipo && (
                  <span className="ml-1.5 text-muted-foreground">
                    · {ALERTA_TIPO_LABEL[tarea.alertaTipo] ?? tarea.alertaTipo}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {fecha}
          </div>
          <Select
            value={tarea.estado}
            onValueChange={(v) => onEstado(tarea.id, v as EstadoTarea)}
          >
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_OPCIONES.map((e) => (
                <SelectItem key={e} value={e} className="text-xs">
                  {ESTADO_META[e].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
