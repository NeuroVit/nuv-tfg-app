import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, ArrowDown, ArrowUp, PackageSearch } from 'lucide-react'
import { getFinanzasResumenAnalitica, getTopProductosVelocidadAnalitica, getVelocidadResumenAnalitica } from '@/api/analitica'
import { useInventarioDashboard } from '@/hooks/useInventarioDashboard'
import { useDisplayName } from '@/store/profileStore'
import { useFormatters } from '@/lib/useFormatters'
import type { TopProductVelocityRow, VelocitySummaryRow } from '@/types/analitica'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const formatCurrency = (value: number) =>
  `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`
const formatPercent = (value: number) =>
  `${value.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`

const formatRelativeTime = (dateValue: string) => {
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

const getGreeting = (timeZone: string) => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(new Date()),
  )
  if (hour < 14) return 'Buenos días'
  if (hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

const movementsChartConfig = {
  Entradas: { label: 'Entradas', color: 'hsl(142, 71%, 45%)' },
  Salidas: { label: 'Salidas', color: 'hsl(0, 84%, 60%)' },
} satisfies ChartConfig

const revenueChartConfig = {
  unitsSold: { label: 'Unidades', color: '#2563eb' },
  revenue: { label: 'Ingresos', color: '#16a34a' },
} satisfies ChartConfig

const winnersChartConfig = {
  revenue: { label: 'Ingresos', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'all'
type DashboardChart = 'movements' | 'revenue' | 'winners'

const timeRangeOptions: Array<{ value: TimeRange; label: string; days: number; spanLabel: string }> = [
  { value: 'daily', label: 'Diario', days: 1, spanLabel: 'últimas 24 horas' },
  { value: 'weekly', label: 'Semanal', days: 7, spanLabel: 'semana actual' },
  { value: 'monthly', label: 'Mensual', days: 30, spanLabel: 'mes actual' },
  { value: 'all', label: 'Histórico', days: 0, spanLabel: 'todo el histórico' },
]

const chartOptions: Array<{ value: DashboardChart; label: string }> = [
  { value: 'movements', label: 'Movimientos de stock' },
  { value: 'revenue', label: 'Tendencia de ingresos' },
  { value: 'winners', label: 'Productos ganadores' },
]

type RangeBounds = {
  start: Date | null
  end: Date | null
}

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const getRangeBounds = (range: TimeRange, reference = new Date()): RangeBounds => {
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

const getPreviousRangeBounds = (range: TimeRange, currentRange: RangeBounds): RangeBounds => {
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

const isInRange = (date: Date, range: RangeBounds) => {
  if (!range.start || !range.end) return true
  return date >= range.start && date < range.end
}

const daysBetween = (start: Date, end: Date) => Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS))

export default function Inicio() {
  const { timeZone, toUserDayKey, formatShortDate } = useFormatters()
  const navigate = useNavigate()
  const displayName = useDisplayName()
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const [selectedChart, setSelectedChart] = useState<DashboardChart>('movements')
  const [revenueSummary, setRevenueSummary] = useState<VelocitySummaryRow[]>([])
  const [winningProducts, setWinningProducts] = useState<TopProductVelocityRow[]>([])
  const [marginCurrent, setMarginCurrent] = useState(0)
  const [marginPrevious, setMarginPrevious] = useState<number | null>(null)
  const [salesPrevious, setSalesPrevious] = useState<number | null>(null)
  const [unitsPrevious, setUnitsPrevious] = useState<number | null>(null)
  const [criticalStockPrevious, setCriticalStockPrevious] = useState<number | null>(null)
  const [chartInsightsLoading, setChartInsightsLoading] = useState(false)
  const [chartInsightsError, setChartInsightsError] = useState<string | null>(null)
  const {
    valorTotal,
    totalProductos,
    productosStockBajo,
    totalCategorias,
    movimientos,
    loading,
    error,
  } = useInventarioDashboard()

  const selectedRange = timeRangeOptions.find((option) => option.value === timeRange) ?? timeRangeOptions[1]!
  const selectedDays = selectedRange.days
  const activeRange = useMemo(() => getRangeBounds(timeRange), [timeRange])
  const previousRange = useMemo(() => getPreviousRangeBounds(timeRange, activeRange), [activeRange, timeRange])
  const currentRangeDaysForApi = useMemo(() => {
    if (!activeRange.start || !activeRange.end) return 0
    const now = new Date()
    const effectiveEnd = now < activeRange.end ? now : activeRange.end
    return daysBetween(activeRange.start, effectiveEnd)
  }, [activeRange])
  const compareWindowDays = useMemo(() => {
    if (!activeRange.end) return 0
    const fetchStart = previousRange.start ?? activeRange.start
    if (!fetchStart) return 0
    return daysBetween(fetchStart, activeRange.end)
  }, [activeRange, previousRange])
  const movimientosInRange = useMemo(() => {
    return movimientos
      .map((movimiento) => ({
        ...movimiento,
        parsedDate: new Date(movimiento.fecha),
      }))
      .filter((movimiento) => !Number.isNaN(movimiento.parsedDate.getTime()) && isInRange(movimiento.parsedDate, activeRange))
      .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime())
  }, [activeRange, movimientos])
  const movimientosPreview = movimientosInRange.slice(0, 5)
  const stockBajoPreview = productosStockBajo.slice(0, 5)
  const prefsKey = useMemo(
    () => `nuv-dashboard-prefs:${(displayName || 'usuario').toLowerCase()}`,
    [displayName],
  )
  const stockSnapshotKey = useMemo(
    () => `nuv-dashboard-stock-snapshot:${(displayName || 'usuario').toLowerCase()}`,
    [displayName],
  )
  const toDayKey = useCallback((date: Date) => toUserDayKey(date), [toUserDayKey])
  const toHourKey = useCallback((date: Date) => {
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(date)
    return `${toDayKey(date)}-${hour}`
  }, [timeZone, toDayKey])
  const formatHour = useCallback(
    (date: Date) => new Intl.DateTimeFormat('es-ES', { timeZone, hour: '2-digit', minute: '2-digit' }).format(date),
    [timeZone],
  )
  const formatWeekday = useCallback(
    (date: Date) => new Intl.DateTimeFormat('es-ES', { timeZone, weekday: 'short' }).format(date).replace('.', ''),
    [timeZone],
  )

  useEffect(() => {
    const raw = localStorage.getItem(prefsKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { timeRange?: TimeRange; selectedChart?: DashboardChart }
      if (parsed.timeRange) setTimeRange(parsed.timeRange)
      if (parsed.selectedChart) setSelectedChart(parsed.selectedChart)
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, [prefsKey])

  useEffect(() => {
    localStorage.setItem(
      prefsKey,
      JSON.stringify({ timeRange, selectedChart })
    )
  }, [prefsKey, selectedChart, timeRange])

  useEffect(() => {
    const raw = localStorage.getItem(stockSnapshotKey)
    if (raw !== null) {
      const previousValue = Number(raw)
      if (Number.isFinite(previousValue)) {
        setCriticalStockPrevious(previousValue)
      }
    }
    localStorage.setItem(stockSnapshotKey, String(productosStockBajo.length))
  }, [productosStockBajo.length, stockSnapshotKey])

  useEffect(() => {
    let cancelled = false

    const loadChartInsights = async () => {
      setChartInsightsLoading(true)
      setChartInsightsError(null)

      try {
        const [velocityRows, winnerRows, finanzasCurrent] = await Promise.all([
          getVelocidadResumenAnalitica(compareWindowDays),
          getTopProductosVelocidadAnalitica(currentRangeDaysForApi, 8),
          getFinanzasResumenAnalitica(currentRangeDaysForApi),
        ])

        const safeRows = velocityRows
          .map((row) => ({
            ...row,
            parsedDate: new Date(row.movementDate),
          }))
          .filter((row) => !Number.isNaN(row.parsedDate.getTime()))

        const currentRows = safeRows
          .filter((row) => isInRange(row.parsedDate, activeRange))
          .map(({ parsedDate: _parsedDate, ...row }) => row)

        const previousRows = previousRange.start && previousRange.end
          ? safeRows
              .filter((row) => isInRange(row.parsedDate, previousRange))
              .map(({ parsedDate: _parsedDate, ...row }) => row)
          : []

        if (cancelled) return
        setRevenueSummary(currentRows)
        setWinningProducts(winnerRows)
        setMarginCurrent(finanzasCurrent.margenReal30d)

        if (previousRows.length > 0) {
          const previousMarginLike = previousRows.reduce((sum, row) => sum + row.revenue, 0)
          const previousUnits = previousRows.reduce((sum, row) => sum + row.unitsSold, 0)
          setMarginPrevious(previousMarginLike)
          setSalesPrevious(previousMarginLike)
          setUnitsPrevious(previousUnits)
        } else {
          setMarginPrevious(null)
          setSalesPrevious(null)
          setUnitsPrevious(null)
        }
      } catch {
        if (cancelled) return
        setRevenueSummary([])
        setWinningProducts([])
        setChartInsightsError('No se pudieron cargar las gráficas de analítica.')
        setMarginCurrent(0)
        setMarginPrevious(null)
        setSalesPrevious(null)
        setUnitsPrevious(null)
      } finally {
        if (!cancelled) setChartInsightsLoading(false)
      }
    }

    void loadChartInsights()

    return () => {
      cancelled = true
    }
  }, [activeRange, compareWindowDays, currentRangeDaysForApi, previousRange])

  const movementsChartData = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const safeMovimientos = movimientosInRange

    if (timeRange === 'daily') {
      const hours: Record<string, { fecha: string; Entradas: number; Salidas: number }> = {}
      for (let hour = 0; hour < 24; hour++) {
        const d = new Date(now)
        d.setHours(hour, 0, 0, 0)
        const key = toHourKey(d)
        hours[key] = {
          fecha: formatHour(d),
          Entradas: 0,
          Salidas: 0,
        }
      }

      safeMovimientos.forEach((movimiento) => {
        const key = toHourKey(movimiento.parsedDate)
        if (!(key in hours)) return
        if (movimiento.tipo === 'ENTRADA') hours[key]!.Entradas += movimiento.cantidad
        else hours[key]!.Salidas += movimiento.cantidad
      })

      return Object.values(hours)
    }

    if (timeRange === 'weekly' || timeRange === 'monthly') {
      const days: Record<string, { fecha: string; Entradas: number; Salidas: number }> = {}
      if (timeRange === 'weekly') {
        const weekStart = new Date(now)
        const mondayOffset = (weekStart.getDay() + 6) % 7
        weekStart.setDate(weekStart.getDate() - mondayOffset)

        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart)
          d.setDate(weekStart.getDate() + i)
          const key = toDayKey(d)
          days[key] = {
            fecha: formatWeekday(d),
            Entradas: 0,
            Salidas: 0,
          }
        }
      } else {
        const monthCursor = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        while (monthCursor <= monthEnd) {
          const key = toDayKey(monthCursor)
          days[key] = {
            fecha: formatShortDate(monthCursor),
            Entradas: 0,
            Salidas: 0,
          }
          monthCursor.setDate(monthCursor.getDate() + 1)
        }
      }

      safeMovimientos.forEach((movimiento) => {
        const key = toDayKey(movimiento.parsedDate)
        if (!(key in days)) return
        if (movimiento.tipo === 'ENTRADA') days[key]!.Entradas += movimiento.cantidad
        else days[key]!.Salidas += movimiento.cantidad
      })

      return Object.values(days)
    }

    if (safeMovimientos.length === 0) return []

    const firstMovementDate = new Date(safeMovimientos.reduce(
      (minDate, movimiento) =>
        movimiento.parsedDate < minDate ? movimiento.parsedDate : minDate,
      safeMovimientos[0]!.parsedDate
    ))
    firstMovementDate.setHours(0, 0, 0, 0)

    const days: Record<string, { fecha: string; Entradas: number; Salidas: number }> = {}
    const cursor = new Date(firstMovementDate)
    while (cursor <= now) {
      const key = toDayKey(cursor)
      days[key] = {
        fecha: formatShortDate(cursor),
        Entradas: 0,
        Salidas: 0,
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    safeMovimientos.forEach((movimiento) => {
      const key = toDayKey(movimiento.parsedDate)
      if (!(key in days)) return
      if (movimiento.tipo === 'ENTRADA') days[key]!.Entradas += movimiento.cantidad
      else days[key]!.Salidas += movimiento.cantidad
    })

    return Object.values(days)
  }, [formatHour, formatShortDate, formatWeekday, movimientosInRange, timeRange, toDayKey, toHourKey])

  const revenueChartData = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const safeRows = revenueSummary
      .map((row) => ({
        ...row,
        parsedDate: new Date(row.movementDate),
      }))
      .filter((row) => !Number.isNaN(row.parsedDate.getTime()))

    if (timeRange === 'daily') {
      const hours: Record<string, { date: string; unitsSold: number; revenue: number }> = {}
      for (let hour = 0; hour < 24; hour++) {
        const d = new Date(now)
        d.setHours(hour, 0, 0, 0)
        const key = toHourKey(d)
        hours[key] = {
          date: formatHour(d),
          unitsSold: 0,
          revenue: 0,
        }
      }

      safeRows.forEach((row) => {
        const key = toHourKey(row.parsedDate)
        if (!(key in hours)) return
        hours[key]!.unitsSold += row.unitsSold
        hours[key]!.revenue += row.revenue
      })

      return Object.values(hours)
    }

    if (timeRange === 'weekly' || timeRange === 'monthly') {
      const days: Record<string, { date: string; unitsSold: number; revenue: number }> = {}
      if (timeRange === 'weekly') {
        const weekStart = new Date(now)
        weekStart.setHours(0, 0, 0, 0)
        const mondayOffset = (weekStart.getDay() + 6) % 7
        weekStart.setDate(weekStart.getDate() - mondayOffset)

        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart)
          d.setDate(weekStart.getDate() + i)
          const key = toDayKey(d)
          days[key] = {
            date: formatWeekday(d),
            unitsSold: 0,
            revenue: 0,
          }
        }
      } else {
        const monthCursor = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        while (monthCursor <= monthEnd) {
          const key = toDayKey(monthCursor)
          days[key] = {
            date: formatShortDate(monthCursor),
            unitsSold: 0,
            revenue: 0,
          }
          monthCursor.setDate(monthCursor.getDate() + 1)
        }
      }

      safeRows.forEach((row) => {
        const key = toDayKey(row.parsedDate)
        if (!(key in days)) return
        days[key]!.unitsSold += row.unitsSold
        days[key]!.revenue += row.revenue
      })

      return Object.values(days)
    }

    if (safeRows.length === 0) return []

    const firstDate = new Date(safeRows.reduce(
      (minDate, row) => (row.parsedDate < minDate ? row.parsedDate : minDate),
      safeRows[0]!.parsedDate,
    ))
    firstDate.setHours(0, 0, 0, 0)

    const days: Record<string, { date: string; unitsSold: number; revenue: number }> = {}
    const cursor = new Date(firstDate)
    while (cursor <= now) {
      const key = toDayKey(cursor)
      days[key] = {
        date: formatShortDate(cursor),
        unitsSold: 0,
        revenue: 0,
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    safeRows.forEach((row) => {
      const key = toDayKey(row.parsedDate)
      if (!(key in days)) return
      days[key]!.unitsSold += row.unitsSold
      days[key]!.revenue += row.revenue
    })

    return Object.values(days)
  }, [formatHour, formatShortDate, formatWeekday, revenueSummary, timeRange, toDayKey, toHourKey])


  const winnersChartData = useMemo(
    () =>
      winningProducts.map((row) => ({
        producto: row.productName.length > 24 ? `${row.productName.slice(0, 24)}...` : row.productName,
        revenue: row.revenue,
      })),
    [winningProducts],
  )

  const chartTitleByType: Record<DashboardChart, string> = {
    movements: `Movimientos de stock - ${selectedRange.spanLabel}`,
    revenue: `Ingresos por ventas - ${selectedRange.spanLabel}`,
    winners: `Productos ganadores - ${selectedRange.spanLabel}`,
  }

  const chartDescriptionByType: Record<DashboardChart, string> = {
    movements: selectedDays === 1 ? 'Entradas y salidas por hora' : 'Entradas y salidas agregadas por periodo',
    revenue: 'Tendencia de ingresos para el rango seleccionado',
    winners: 'Productos con mayor facturación en el rango seleccionado',
  }

  const salesCurrent = useMemo(
    () => revenueSummary.reduce((sum, row) => sum + row.revenue, 0),
    [revenueSummary],
  )

  const unitsCurrent = useMemo(
    () => revenueSummary.reduce((sum, row) => sum + row.unitsSold, 0),
    [revenueSummary],
  )

  const formatDelta = (current: number, previous: number | null, isCurrency = false) => {
    if (previous === null || previous === 0) return 'Sin base comparable'
    const delta = current - previous
    const pct = (delta / Math.abs(previous)) * 100
    const value = isCurrency ? formatCurrency(Math.abs(delta)) : Math.abs(delta).toLocaleString('es-ES')
    return `${delta >= 0 ? '+' : '-'}${value} (${formatPercent(Math.abs(pct))})`
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl text-sm text-muted-foreground">Cargando resumen del inventario...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 xl:items-center">
          <div className="space-y-1 xl:col-span-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {getGreeting(timeZone)}, {(displayName || 'Usuario').split(' ')[0]}
            </h1>
            <p className="text-sm text-muted-foreground">Aquí tienes el resumen de tu inventario.</p>
          </div>
          <div className="w-full xl:col-span-1 xl:self-end">
            <div className="ml-auto w-full sm:w-[220px] xl:w-1/2">
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger aria-label="Seleccionar rango temporal" className="h-10 w-full px-3">
                  <SelectValue placeholder="Selecciona un rango" />
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
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Valor total inventario</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(valorTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{totalProductos} productos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stock bajo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${productosStockBajo.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {productosStockBajo.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDelta(productosStockBajo.length, criticalStockPrevious)}
              </p>
              <Button size="sm" variant="link" className="px-0" onClick={() => navigate('/alertas')}>
                Ver alertas abiertas
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ingresos del rango</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-green-600">{formatCurrency(salesCurrent)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDelta(salesCurrent, salesPrevious, true)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Margen / Unidades</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-amber-600">{formatCurrency(marginCurrent)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Margen: {formatDelta(marginCurrent, marginPrevious, true)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Unidades: {formatDelta(unitsCurrent, unitsPrevious)}
              </p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">{chartTitleByType[selectedChart]}</CardTitle>
              <CardDescription>{chartDescriptionByType[selectedChart]}</CardDescription>
            </div>
            <div className="w-full sm:ml-auto sm:w-[220px]">
              <Select
                value={selectedChart}
                onValueChange={(value) => setSelectedChart(value as DashboardChart)}
              >
                <SelectTrigger aria-label="Seleccionar gráfica principal">
                  <SelectValue placeholder="Selecciona una gráfica" />
                </SelectTrigger>
                <SelectContent>
                  {chartOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selectedChart === 'movements' ? (
              <ChartContainer config={movementsChartConfig} className="h-[220px] w-full">
                <AreaChart data={movementsChartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-Entradas)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-Entradas)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillSalidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-Salidas)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-Salidas)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="Entradas"
                    stroke="var(--color-Entradas)"
                    strokeWidth={2}
                    fill="url(#fillEntradas)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Salidas"
                    stroke="var(--color-Salidas)"
                    strokeWidth={2}
                    fill="url(#fillSalidas)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : chartInsightsLoading ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                Cargando gráfica...
              </div>
            ) : chartInsightsError ? (
              <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-sm text-red-600">
                <span>{chartInsightsError}</span>
                <Button size="sm" variant="outline" onClick={() => navigate('/analitica')}>Ir a Analítica</Button>
              </div>
            ) : selectedChart === 'revenue' ? (
              revenueChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  No hay datos de ingresos para este rango.
                </div>
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-[220px] w-full">
                    <LineChart data={revenueChartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" minTickGap={18} />
                    <YAxis yAxisId="left" domain={[0, 'auto']} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="unitsSold"
                      stroke="var(--color-unitsSold)"
                      strokeWidth={2}
                      dot={false}
                      name="unitsSold"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="revenue"
                    />
                  </LineChart>
                </ChartContainer>
              )
            ) : winnersChartData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No hay productos ganadores en este rango.
              </div>
            ) : (
              <ChartContainer config={winnersChartConfig} className="h-[220px] w-full">
                <BarChart data={winnersChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="producto"
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} name="revenue" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Últimos movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`space-y-3 ${movimientosInRange.length > 5 ? 'max-h-[360px] overflow-y-auto pr-1' : ''}`}>
                {movimientosPreview.length === 0 ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>No hay movimientos recientes.</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/movimientos')}>
                      Revisar histórico de movimientos
                    </Button>
                  </div>
                ) : (
                  movimientosPreview.map((movimiento) => {
                    const isEntrada = movimiento.tipo === 'ENTRADA'
                    return (
                      <div
                        key={movimiento.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full ${
                              isEntrada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isEntrada ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{movimiento.productoNombre}</p>
                            <p className="text-xs text-muted-foreground">{movimiento.productoSku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                            {isEntrada ? '+' : '-'}
                            {Math.abs(movimiento.cantidad)}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(movimiento.fecha)}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alertas de stock bajo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`space-y-3 ${productosStockBajo.length > 5 ? 'max-h-[360px] overflow-y-auto pr-1' : ''}`}>
                {stockBajoPreview.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    <PackageSearch className="h-4 w-4" />
                    <span>Todo en niveles correctos.</span>
                  </div>
                ) : (
                  stockBajoPreview.map((producto) => {
                    const isCritical = producto.stockActual < producto.stockMinimo
                    return (
                      <div
                        key={producto.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">{producto.sku}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            isCritical
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {producto.stockActual} / min {producto.stockMinimo}
                        </span>
                      </div>
                    )
                  })
                )}
                {stockBajoPreview.length > 0 ? (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/productos?estado=low')}>
                    Ver productos con stock bajo
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Categorias activas</CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold text-violet-500">{totalCategorias}</p>
                <p className="mt-1 text-xs text-muted-foreground">en inventario</p>
              </div>
              <svg aria-hidden viewBox="0 0 120 40" className="h-10 w-36 text-violet-500/90">
                <path
                  d="M2 33 C 12 30, 18 17, 28 21 S 44 34, 54 22 S 72 13, 82 20 S 98 30, 118 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </svg>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Movimientos recientes</CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold text-blue-500">{movimientosInRange.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">ultimas entradas/salidas</p>
              </div>
              <div className="flex h-12 items-end gap-1">
                {[16, 28, 22, 34, 24, 18, 30, 26, 36, 20, 29, 24].map((h, idx) => (
                  <span
                    key={idx}
                    className="w-1.5 rounded-sm bg-blue-500/90"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
