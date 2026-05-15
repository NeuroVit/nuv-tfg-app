import type { ChartConfig } from '@/components/ui/chart'

export const formatCurrency = (value: number) =>
  `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`

export const formatPercent = (value: number) =>
  `${value.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`

export const formatRelativeTime = (dateValue: string) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 'Hace 0 min'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `Hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `Hace ${diffDays}d`
}

export const getGreeting = (timeZone: string) => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(new Date()),
  )
  if (hour < 14) return 'Buenos días'
  if (hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export const movementsChartConfig = {
  Entradas: { label: 'Entradas', color: 'hsl(142, 71%, 45%)' },
  Salidas: { label: 'Salidas', color: 'hsl(0, 84%, 60%)' },
} satisfies ChartConfig

export const revenueChartConfig = {
  unitsSold: { label: 'Unidades', color: '#2563eb' },
  revenue: { label: 'Ingresos', color: '#16a34a' },
} satisfies ChartConfig

export const winnersChartConfig = {
  revenue: { label: 'Ingresos', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'all'
export type DashboardChart = 'movements' | 'revenue' | 'winners'

export const timeRangeOptions: Array<{ value: TimeRange; label: string; days: number; spanLabel: string }> = [
  { value: 'daily', label: 'Diario', days: 1, spanLabel: 'últimas 24 horas' },
  { value: 'weekly', label: 'Semanal', days: 7, spanLabel: 'semana actual' },
  { value: 'monthly', label: 'Mensual', days: 30, spanLabel: 'mes actual' },
  { value: 'all', label: 'Histórico', days: 0, spanLabel: 'todo el histórico' },
]

export const chartOptions: Array<{ value: DashboardChart; label: string }> = [
  { value: 'movements', label: 'Movimientos de stock' },
  { value: 'revenue', label: 'Tendencia de ingresos' },
  { value: 'winners', label: 'Productos ganadores' },
]

export type RangeBounds = {
  start: Date | null
  end: Date | null
}

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const getRangeBounds = (range: TimeRange, reference = new Date()): RangeBounds => {
  if (range === 'all') return { start: null, end: null }

  if (range === 'daily') {
    const start = startOfDay(reference)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end }
  }

  if (range === 'weekly') {
    const start = startOfDay(reference)
    const mondayOffset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - mondayOffset)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }

  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1)
  return { start, end }
}

export const getPreviousRangeBounds = (range: TimeRange, currentRange: RangeBounds): RangeBounds => {
  if (range === 'all' || !currentRange.start || !currentRange.end) return { start: null, end: null }

  if (range === 'daily') {
    const end = new Date(currentRange.start)
    const start = new Date(end)
    start.setDate(start.getDate() - 1)
    return { start, end }
  }

  if (range === 'weekly') {
    const end = new Date(currentRange.start)
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    return { start, end }
  }

  const end = new Date(currentRange.start)
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
  return { start, end }
}

export const isInRange = (date: Date, range: RangeBounds) => {
  if (!range.start || !range.end) return true
  return date >= range.start && date < range.end
}

export const daysBetween = (start: Date, end: Date) => Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS))

export const MOVEMENTS_PAGE_SIZE = 200

export const toInputDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
