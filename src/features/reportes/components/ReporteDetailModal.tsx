import type { Reporte, TipoReporte } from '@/features/reportes/types/reporte'
import ModalShell, { ModalSection } from '@/components/ModalShell'
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react'

const TIPO_META: Record<TipoReporte, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  INVENTARIO:  { label: 'Inventario',   icon: Package,       color: 'text-blue-600 dark:text-blue-400' },
  ALERTAS:     { label: 'Alertas',      icon: AlertTriangle,  color: 'text-amber-600 dark:text-amber-400' },
  CLIENTES:    { label: 'Clientes',     icon: Users,          color: 'text-green-600 dark:text-green-400' },
  MOVIMIENTOS: { label: 'Movimientos',  icon: BarChart3,      color: 'text-purple-600 dark:text-purple-400' },
  VENTAS:      { label: 'Ventas',       icon: ShoppingCart,   color: 'text-rose-600 dark:text-rose-400' },
}

const LABEL_MAP: Record<string, string> = {
  totalProductos:        'Total de productos',
  valorTotalInventario:  'Valor total del inventario',
  productosStockBajo:    'Productos con stock bajo',
  totalAlertas:          'Total de alertas',
  alertasPendientes:     'Alertas pendientes',
  alertasResueltas:      'Alertas resueltas',
  totalClientes:         'Total de clientes',
  clientesActivos:       'Clientes activos',
  clientesArchivados:    'Clientes archivados',
  nuevosUltimos30Dias:   'Nuevos (últimos 30 días)',
  totalMovimientos:      'Total de movimientos',
  entradas:              'Entradas',
  salidas:               'Salidas',
  totalVentas:           'Total de ventas',
  totalIngresos:         'Ingresos totales',
  promedioVenta:         'Promedio por venta',
  ventasMes:             'Ventas este mes',
  ingresosMes:           'Ingresos este mes',
  nuevosClientes30Dias:  'Nuevos clientes (30 días)',
}

const formatValue = (key: string, value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number') {
    if (key.toLowerCase().includes('ingreso') || key.toLowerCase().includes('valor') ||
        key.toLowerCase().includes('promedio') || key.toLowerCase().includes('gastado')) {
      return `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString('es-ES')
  }
  return String(value)
}

interface Props {
  open: boolean
  onClose: () => void
  reporte: Reporte | null
}

export default function ReporteDetailModal({ open, onClose, reporte }: Props) {
  if (!reporte) return null

  const meta = TIPO_META[reporte.tipo]
  const Icon = meta?.icon ?? FileText

  let parsedDatos: Record<string, unknown> | null = null
  try {
    if (reporte.datos) parsedDatos = JSON.parse(reporte.datos) as Record<string, unknown>
  } catch {
    parsedDatos = null
  }

  const scalarEntries = parsedDatos
    ? Object.entries(parsedDatos).filter(([k, v]) => k !== 'generadoEn' && !Array.isArray(v) && typeof v !== 'object')
    : []

  const arrayEntries = parsedDatos
    ? Object.entries(parsedDatos).filter(([, v]) => Array.isArray(v))
    : []

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={reporte.nombre}
      description={reporte.descripcion ?? undefined}
      widthClassName="max-w-2xl"
    >
      <div className="space-y-5 px-6 py-5">
        {/* Header info */}
        <ModalSection>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta?.color ?? ''}`}>
              <Icon className="h-3.5 w-3.5" />
              {meta?.label ?? reporte.tipo}
            </span>
            {reporte.generadoPor && (
              <span className="text-xs text-muted-foreground">Por: {reporte.generadoPor}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(reporte.createdAt).toLocaleString('es-ES')}
            </span>
          </div>
        </ModalSection>

        {/* Scalar KPIs */}
        {scalarEntries.length > 0 && (
          <ModalSection title="Resumen" className="border-t pt-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {scalarEntries.map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {LABEL_MAP[k] ?? k.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-semibold">{formatValue(k, v)}</span>
                </div>
              ))}
            </div>
          </ModalSection>
        )}

        {/* Array sections */}
        {arrayEntries.map(([key, rows]) => {
          const list = rows as Record<string, unknown>[]
          if (list.length === 0) return null
          const cols = Object.keys(list[0])
          const sectionTitle =
            key === 'topProductos' ? 'Top productos' :
            key === 'topClientes'  ? 'Mejores clientes' :
            key === 'resumenStockBajo' ? 'Productos con stock bajo' :
            key === 'detalle' ? 'Detalle de alertas' :
            key === 'listado' ? 'Listado' :
            key.replace(/([A-Z])/g, ' $1').trim()

          return (
            <ModalSection key={key} title={sectionTitle} className="border-t pt-4">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {cols.map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {LABEL_MAP[col] ?? col.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-accent/40">
                        {cols.map((col) => (
                          <td key={col} className="px-3 py-2">
                            {formatValue(col, row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ModalSection>
          )
        })}

        {!parsedDatos && (
          <p className="text-sm text-muted-foreground">No hay datos disponibles para este reporte.</p>
        )}

        <div className="flex items-center justify-end border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
