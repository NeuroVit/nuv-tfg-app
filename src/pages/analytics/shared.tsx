import { type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AnaliticaMeta } from '@/types/analitica'
import type { LucideIcon } from 'lucide-react'

export type LoadState = 'loading' | 'ready' | 'error'
export type TimeRangeValue = 'all' | '180' | '90' | '30' | '7' | '1'

export const timeRangeOptions: Array<{ value: TimeRangeValue; label: string; days: number }> = [
  { value: 'all', label: 'Todo el tiempo', days: 0 },
  { value: '180', label: '6 meses', days: 180 },
  { value: '90', label: '3 meses', days: 90 },
  { value: '30', label: '30 días', days: 30 },
  { value: '7', label: 'Semanal', days: 7 },
  { value: '1', label: 'Diario', days: 1 },
]

export const statusLabels: Record<string, string> = {
  OUT_OF_STOCK: 'Sin stock',
  LOW_STOCK: 'Stock bajo',
  OK: 'Óptimo',
  OVERSTOCK: 'Sobrestock',
}

export const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`
export const formatCompact = (value: number) => value.toLocaleString('es-ES')

export const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export function statusFillKey(status: string) {
  switch (status) {
    case 'OUT_OF_STOCK':
      return 'outOfStock'
    case 'LOW_STOCK':
      return 'lowStock'
    case 'OK':
      return 'okStock'
    case 'OVERSTOCK':
      return 'overStock'
    default:
      return 'okStock'
  }
}

export function sourceLabel(meta: AnaliticaMeta | null) {
  if (!meta) return 'API real'
  if (meta.source === 'API_REAL_LOCAL_SEEDED') {
    return 'API real (seed local activo)'
  }
  if (meta.source === 'API_REAL_SEED_PENDING') {
    return 'API real (seed pendiente)'
  }
  return 'API real'
}

function parseTimeRange(raw: string | null): TimeRangeValue {
  if (!raw) return '30'
  if (timeRangeOptions.some((option) => option.value === raw)) {
    return raw as TimeRangeValue
  }
  return '30'
}

export function useAnaliticaRange() {
  const [searchParams, setSearchParams] = useSearchParams()
  const timeRange = parseTimeRange(searchParams.get('range'))
  const selectedDays = timeRangeOptions.find((option) => option.value === timeRange)?.days ?? 30

  const setTimeRange = (next: TimeRangeValue) => {
    const params = new URLSearchParams(searchParams)
    params.set('range', next)
    setSearchParams(params, { replace: true })
  }

  return { timeRange, selectedDays, setTimeRange }
}

type AnaliticaShellProps = {
  children: ReactNode
  title: string
  description: string
  metadata: AnaliticaMeta | null
  loadState: LoadState
  lastUpdatedAt: Date | null
  timeRange: TimeRangeValue
  onTimeRangeChange: (value: TimeRangeValue) => void
}

export function AnaliticaShell({
  children,
  title,
  description,
  metadata,
  loadState,
  lastUpdatedAt,
  timeRange,
  onTimeRangeChange,
}: AnaliticaShellProps) {
  const rangeLabel =
    timeRangeOptions.find((option) => option.value === timeRange)?.label ??
    timeRangeOptions.find((option) => option.value === '30')?.label ??
    '30 días'

  const loadStateLabel =
    loadState === 'loading' ? 'Cargando' : loadState === 'error' ? 'Error' : 'Actualizado'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <section className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={loadState === 'error' ? 'destructive' : 'secondary'}>{sourceLabel(metadata)}</Badge>
                <Badge variant="outline">Rango: {rangeLabel}</Badge>
                <Badge variant="outline">Estado: {loadStateLabel}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Seed local: {metadata?.seedEnabled ? 'Activo' : 'Inactivo'} · Última carga UI:{' '}
                {lastUpdatedAt ? lastUpdatedAt.toLocaleString('es-ES') : 'Sin datos'} · Último movimiento backend:{' '}
                {metadata?.generatedAt ? new Date(metadata.generatedAt).toLocaleString('es-ES') : 'Sin datos'}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <span className="text-sm text-muted-foreground">Rango temporal</span>
          <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRangeValue)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {children}
      </div>
    </div>
  )
}

type EmptyChartPlaceholderProps = {
  icon: LucideIcon
  message: string
}

export function EmptyChartPlaceholder({ icon: Icon, message }: EmptyChartPlaceholderProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-6 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
