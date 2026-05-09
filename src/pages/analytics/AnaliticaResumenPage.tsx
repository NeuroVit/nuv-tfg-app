import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LineChart as LineChartIcon } from 'lucide-react'
import {
  CartesianGrid,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  getFinanzasResumenAnalitica,
  getInventarioAnalitica,
  getMetaAnalitica,
  getVelocidadResumenAnalitica,
} from '@/api/analitica'
import type { AnaliticaMeta, FinanzasResumen, InventorySummaryRow, VelocitySummaryRow } from '@/types/analitica'
import {
  AnaliticaShell,
  EmptyChartPlaceholder,
  formatCompact,
  formatCurrency,
  toDayKey,
  toMonthKey,
  useAnaliticaRange,
  type LoadState,
} from './shared'

const salesTrendChartConfig = {
  unitsSold: {
    label: 'Unidades',
    color: '#2563eb',
  },
  revenue: {
    label: 'Ingresos',
    color: '#16a34a',
  },
} satisfies ChartConfig

export default function AnaliticaResumenPage() {
  const { timeRange, selectedDays, setTimeRange } = useAnaliticaRange()
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metadata, setMetadata] = useState<AnaliticaMeta | null>(null)
  const [finanzas, setFinanzas] = useState<FinanzasResumen | null>(null)
  const [velocidadResumen, setVelocidadResumen] = useState<VelocitySummaryRow[]>([])
  const [inventario, setInventario] = useState<InventorySummaryRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadState('loading')
      try {
        const [fin, velRes, inv, meta] = await Promise.all([
          getFinanzasResumenAnalitica(selectedDays),
          getVelocidadResumenAnalitica(selectedDays),
          getInventarioAnalitica(),
          getMetaAnalitica(selectedDays),
        ])

        setFinanzas(fin)
        setVelocidadResumen(velRes)
        setInventario(inv)
        setMetadata(meta)
        setLastUpdatedAt(new Date())
        setLoadState('ready')
      } catch {
        setLoadState('error')
        toast.error('No se pudieron cargar los datos del resumen de analítica')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedDays])

  const kpis = useMemo(() => {
    const lowStockCount = inventario.filter((row) => row.stockStatus === 'LOW_STOCK').length
    const outOfStockCount = inventario.filter((row) => row.stockStatus === 'OUT_OF_STOCK').length
    const unitsSold = velocidadResumen.reduce((sum, row) => sum + row.unitsSold, 0)

    return {
      lowStockCount,
      outOfStockCount,
      unitsSold,
      ventas: finanzas?.ventas30d ?? 0,
      ventasPromedioDiarias: finanzas?.ventasPromedioDiarias ?? 0,
      cogs: finanzas?.cogsReal30d ?? 0,
      margen: finanzas?.margenReal30d ?? 0,
      flujoNeto: finanzas?.flujoNeto30d ?? 0,
      ticketPromedio: finanzas?.ticketPromedio ?? 0,
      margenBrutoPct: finanzas?.margenBrutoPct ?? 0,
    }
  }, [finanzas, inventario, velocidadResumen])

  const salesLineData = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const safeRows = velocidadResumen
      .map((row) => ({
        ...row,
        parsedDate: new Date(row.movementDate),
      }))
      .filter((row) => !Number.isNaN(row.parsedDate.getTime()))

    if (selectedDays <= 0) {
      if (safeRows.length === 0) return []

      const firstDate = safeRows.reduce(
        (minDate, row) => (row.parsedDate < minDate ? row.parsedDate : minDate),
        safeRows[0]!.parsedDate,
      )

      const months: Record<string, { date: string; unitsSold: number; revenue: number }> = {}
      const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      while (cursor <= currentMonth) {
        const key = toMonthKey(cursor)
        months[key] = {
          date: cursor.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          unitsSold: 0,
          revenue: 0,
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }

      safeRows.forEach((row) => {
        const key = toMonthKey(row.parsedDate)
        if (!(key in months)) return
        months[key]!.unitsSold += row.unitsSold
        months[key]!.revenue += row.revenue
      })

      return Object.values(months)
    }

    const days: Record<string, { date: string; unitsSold: number; revenue: number }> = {}

    if (selectedDays === 7) {
      const weekStart = new Date(now)
      const mondayOffset = (weekStart.getDay() + 6) % 7
      weekStart.setDate(weekStart.getDate() - mondayOffset)

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        const key = toDayKey(d)
        days[key] = {
          date: d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' }),
          unitsSold: 0,
          revenue: 0,
        }
      }
    } else {
      for (let i = selectedDays - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = toDayKey(d)
        days[key] = {
          date: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
          unitsSold: 0,
          revenue: 0,
        }
      }
    }

    safeRows.forEach((row) => {
      const key = toDayKey(row.parsedDate)
      if (!(key in days)) return
      days[key]!.unitsSold += row.unitsSold
      days[key]!.revenue += row.revenue
    })

    return Object.values(days)
  }, [selectedDays, velocidadResumen])

  const salesTrendTitle =
    selectedDays <= 0
      ? 'Tendencia histórica de ventas'
      : selectedDays === 1
        ? 'Tendencia de ventas (hoy)'
        : selectedDays === 7
        ? 'Tendencia semanal de ventas'
        : 'Tendencia de ventas (rango)'

  const revenueThresholds = useMemo(() => {
    if (salesLineData.length === 0) return null
    const values = salesLineData
      .map((row) => row.revenue)
      .filter((value) => Number.isFinite(value))
    if (values.length === 0) return null

    const averageRevenue = values.reduce((sum, value) => sum + value, 0) / values.length
    const target = kpis.ventasPromedioDiarias > 0 ? kpis.ventasPromedioDiarias : averageRevenue
    if (target <= 0) return null

    return {
      lower: target * 0.8,
      target,
    }
  }, [salesLineData, kpis.ventasPromedioDiarias])

  return (
    <AnaliticaShell
      title="Analítica"
      description="Vista general para entender rápido el estado comercial e inventario."
      metadata={metadata}
      loadState={loadState}
      lastUpdatedAt={lastUpdatedAt}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas (rango)</p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(kpis.ventas)}</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Coste de ventas real (rango)</p>
          <p className="mt-2 text-xl font-semibold text-orange-700">-{formatCurrency(kpis.cogs)}</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen real (rango)</p>
          <p className={`mt-2 text-xl font-semibold ${kpis.margen >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(kpis.margen)}
          </p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Flujo neto (rango)</p>
          <p className={`mt-2 text-xl font-semibold ${kpis.flujoNeto >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(kpis.flujoNeto)}
          </p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Unidades vendidas (rango)</p>
          <p className="mt-2 text-xl font-semibold text-blue-700">{formatCompact(kpis.unitsSold)}</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket promedio</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(kpis.ticketPromedio)}</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen bruto %</p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">{kpis.margenBrutoPct.toFixed(2)}%</p>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Productos críticos</p>
          <p className="mt-2 text-xl font-semibold text-red-700">
            {formatCompact(kpis.lowStockCount + kpis.outOfStockCount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCompact(kpis.lowStockCount)} bajo stock · {formatCompact(kpis.outOfStockCount)} sin stock
          </p>
        </article>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">{salesTrendTitle}</h2>
        <div className="mt-3 h-80">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
          ) : salesLineData.length === 0 ? (
            <EmptyChartPlaceholder
              icon={LineChartIcon}
              message="No hay datos de ventas en el rango seleccionado para mostrar la tendencia."
            />
          ) : (
            <ChartContainer config={salesTrendChartConfig} className="h-full w-full">
              <LineChart data={salesLineData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={18} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
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
                  name="revenue"
                />
                {revenueThresholds ? (
                  <>
                    <ReferenceLine
                      yAxisId="right"
                      y={revenueThresholds.lower}
                      stroke="#f59e0b"
                      strokeDasharray="6 4"
                      ifOverflow="extendDomain"
                      label={{ value: 'Umbral bajo', position: 'insideTopLeft', fill: '#b45309', fontSize: 11 }}
                    />
                    <ReferenceLine
                      yAxisId="right"
                      y={revenueThresholds.target}
                      stroke="#16a34a"
                      strokeDasharray="6 4"
                      ifOverflow="extendDomain"
                      label={{ value: 'Umbral objetivo', position: 'insideTopRight', fill: '#166534', fontSize: 11 }}
                    />
                  </>
                ) : null}
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </section>
    </AnaliticaShell>
  )
}
