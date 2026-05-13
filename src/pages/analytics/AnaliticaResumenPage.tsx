import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LineChart as LineChartIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  getFinanzasResumenAnalitica,
  getInventarioAnalitica,
  getMetaAnalitica,
  getRevenueComparativaAnalitica,
  getVelocidadResumenAnalitica,
} from '@/api/analitica'
import type {
  AnaliticaMeta,
  FinanzasResumen,
  InventorySummaryRow,
  RevenueComparativa,
  VelocitySummaryRow,
} from '@/types/analitica'
import {
  AnaliticaShell,
  EmptyChartPlaceholder,
  formatCompact,
  formatCurrency,
  useAnaliticaRange,
  type LoadState,
} from './shared'

const revenueComparisonChartConfig = {
  currentRevenue: {
    label: 'Periodo actual',
    color: '#16a34a',
  },
  previousRevenue: {
    label: 'Periodo anterior',
    color: '#86efac',
  },
} satisfies ChartConfig

type RevenueComparisonRow = {
  label: string
  currentRevenue: number
  previousRevenue: number
  previousRevenueNegative: number
  currentColor: string
  previousColor: string
}

type ImpactLevel = 'positive' | 'neutral' | 'negative'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function resolveImpactFromGrowth(growthPct: number): ImpactLevel {
  if (growthPct >= 10) return 'positive'
  if (growthPct >= 0) return 'neutral'
  return 'negative'
}

function resolveImpactColors(impact: ImpactLevel) {
  if (impact === 'positive') {
    return {
      strong: '#16a34a',
      soft: '#86efac',
      textClass: 'text-emerald-700',
    }
  }
  if (impact === 'neutral') {
    return {
      strong: '#eab308',
      soft: '#fde047',
      textClass: 'text-yellow-700',
    }
  }
  return {
    strong: '#dc2626',
    soft: '#fca5a5',
    textClass: 'text-red-700',
  }
}

function resolveRowImpact(currentRevenue: number, previousRevenue: number): ImpactLevel {
  if (previousRevenue <= 0) {
    if (currentRevenue > 0) return 'positive'
    return 'neutral'
  }
  const growthPct = ((currentRevenue - previousRevenue) / previousRevenue) * 100
  return resolveImpactFromGrowth(growthPct)
}

export default function AnaliticaResumenPage() {
  const { timeRange, selectedDays, setTimeRange } = useAnaliticaRange()
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metadata, setMetadata] = useState<AnaliticaMeta | null>(null)
  const [finanzas, setFinanzas] = useState<FinanzasResumen | null>(null)
  const [velocidadResumen, setVelocidadResumen] = useState<VelocitySummaryRow[]>([])
  const [inventario, setInventario] = useState<InventorySummaryRow[]>([])
  const [revenueComparativa, setRevenueComparativa] = useState<RevenueComparativa | null>(null)

  useEffect(() => {
    let active = true

    const load = async (backgroundRefresh = false) => {
      if (!backgroundRefresh) {
        setLoading(true)
        setLoadState('loading')
      }

      try {
        const [fin, velRes, inv, meta, revComp] = await Promise.all([
          getFinanzasResumenAnalitica(selectedDays),
          getVelocidadResumenAnalitica(selectedDays),
          getInventarioAnalitica(),
          getMetaAnalitica(selectedDays),
          getRevenueComparativaAnalitica(selectedDays),
        ])

        if (!active) return
        setFinanzas(fin)
        setVelocidadResumen(velRes)
        setInventario(inv)
        setMetadata(meta)
        setRevenueComparativa(revComp)
        setLastUpdatedAt(new Date())
        setLoadState('ready')
      } catch {
        if (!active) return
        setLoadState('error')
        if (!backgroundRefresh) {
          toast.error('No se pudieron cargar los datos del resumen de analítica')
        }
      } finally {
        if (!backgroundRefresh && active) {
          setLoading(false)
        }
      }
    }

    void load(false)
    const refreshTimer = window.setInterval(() => {
      void load(true)
    }, 60 * 60 * 1000)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
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
      cogs: finanzas?.cogsReal30d ?? 0,
      margen: finanzas?.margenReal30d ?? 0,
      flujoNeto: finanzas?.flujoNeto30d ?? 0,
      ticketPromedio: finanzas?.ticketPromedio ?? 0,
      margenBrutoPct: finanzas?.margenBrutoPct ?? 0,
    }
  }, [finanzas, inventario, velocidadResumen])

  const revenueComparison = useMemo(() => {
    if (!revenueComparativa || revenueComparativa.buckets.length === 0) {
      return null
    }

    const rows: RevenueComparisonRow[] = revenueComparativa.buckets.map((bucket) => {
      const currentValue = Number(bucket.currentRevenue) || 0
      const previousValue = Number(bucket.previousRevenue) || 0
      const impact = resolveRowImpact(currentValue, previousValue)
      const impactColors = resolveImpactColors(impact)
      return {
        label: bucket.label,
        currentRevenue: currentValue,
        previousRevenue: previousValue,
        previousRevenueNegative: previousValue === 0 ? 0 : -previousValue,
        currentColor: impactColors.strong,
        previousColor: impactColors.soft,
      }
    })

    const currentTotal = rows.reduce((sum, row) => sum + row.currentRevenue, 0)
    const previousTotal = rows.reduce((sum, row) => sum + row.previousRevenue, 0)
    const growthPct =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : currentTotal > 0
          ? 100
          : 0
    const growthImpact = resolveImpactFromGrowth(growthPct)
    const growthColors = resolveImpactColors(growthImpact)
    const gaugePct = clamp(growthPct, 0, 100)

    const segmentCount = 28
    const activeSegments = Math.round((gaugePct / 100) * segmentCount)
    const gaugeSegments = Array.from({ length: segmentCount }, (_, index) => ({
      value: 1,
      fill: index < activeSegments ? growthColors.strong : '#e4e4e7',
    }))

    const maxBarAbs = rows.reduce(
      (max, row) => Math.max(max, Math.abs(row.currentRevenue), Math.abs(row.previousRevenue)),
      0,
    )

    return {
      rows,
      currentLabel: revenueComparativa.currentLabel,
      previousLabel: revenueComparativa.previousLabel,
      currentTotal,
      previousTotal,
      growthPct,
      growthColors,
      gaugePct,
      gaugeSegments,
      maxBarAbs: maxBarAbs > 0 ? maxBarAbs : 100,
    }
  }, [revenueComparativa])

  return (
    <AnaliticaShell
      title="Analítica"
      description="Vista general para entender rápido el estado comercial e inventario."
      metadata={metadata}
      loadState={loadState}
      lastUpdatedAt={lastUpdatedAt}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      hideHeader
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas (rango)</p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(kpis.ventas)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Coste de ventas real (rango)</p>
          <p className="mt-2 text-xl font-semibold text-orange-700">-{formatCurrency(kpis.cogs)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className={`mt-2 text-xl font-semibold ${kpis.margen >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(kpis.margen)}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen real (rango)</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className={`mt-2 text-xl font-semibold ${kpis.flujoNeto >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(kpis.flujoNeto)}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Flujo neto (rango)</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Unidades vendidas (rango)</p>
          <p className="mt-2 text-xl font-semibold text-blue-700">{formatCompact(kpis.unitsSold)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket promedio</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(kpis.ticketPromedio)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen bruto %</p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">{kpis.margenBrutoPct.toFixed(2)}%</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Productos críticos</p>
          <p className="mt-2 text-xl font-semibold text-red-700">
            {formatCompact(kpis.lowStockCount + kpis.outOfStockCount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCompact(kpis.lowStockCount)} bajo stock · {formatCompact(kpis.outOfStockCount)} sin stock
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-lg bg-card">
        {loading ? (
          <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">Cargando...</div>
        ) : !revenueComparison || revenueComparison.rows.length === 0 ? (
          <div className="p-4">
            <EmptyChartPlaceholder
              icon={LineChartIcon}
              message="No hay datos reales de ventas para construir la comparativa."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr]">
            <div className="border-b p-5 xl:border-b-0 xl:border-r">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Ingresos totales</h2>
                  <div className="mt-3 flex items-center gap-5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: revenueComparison.growthColors.strong }} />
                      {revenueComparison.currentLabel}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: revenueComparison.growthColors.soft }} />
                      {revenueComparison.previousLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-[360px]">
                <ChartContainer config={revenueComparisonChartConfig} className="h-full w-full">
                  <BarChart data={revenueComparison.rows} margin={{ top: 8, right: 16, bottom: 4, left: 6 }} barCategoryGap={20}>
                    <CartesianGrid vertical={false} strokeDasharray="4 6" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={12} />
                    <YAxis
                      domain={[-revenueComparison.maxBarAbs * 1.15, revenueComparison.maxBarAbs * 1.15]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCompact(Math.abs(Number(value) || 0))}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            const numericValue = Math.abs(Number(value) || 0)
                            const label = name === 'previousRevenueNegative'
                              ? revenueComparison.previousLabel
                              : revenueComparison.currentLabel
                            return `${label}: ${formatCurrency(numericValue)}`
                          }}
                        />
                      }
                    />
                    <Bar dataKey="currentRevenue" name="currentRevenue" barSize={18} radius={[10, 10, 0, 0]}>
                      {revenueComparison.rows.map((row, idx) => (
                        <Cell key={`current-${idx}`} fill={row.currentColor} />
                      ))}
                    </Bar>
                    <Bar dataKey="previousRevenueNegative" name="previousRevenueNegative" barSize={18} radius={[0, 0, 10, 10]}>
                      {revenueComparison.rows.map((row, idx) => (
                        <Cell key={`previous-${idx}`} fill={row.previousColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>

            <div className="p-5">
              <div className="mt-4 flex flex-col items-center">
                <ChartContainer config={{ gauge: { label: 'Crecimiento', color: '#111111' } }} className="h-[240px] w-full">
                  <PieChart>
                    <Pie
                      data={revenueComparison.gaugeSegments}
                      dataKey="value"
                      cx="50%"
                      cy="72%"
                      startAngle={210}
                      endAngle={-30}
                      innerRadius={82}
                      outerRadius={112}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {revenueComparison.gaugeSegments.map((segment, idx) => (
                        <Cell key={`gauge-${idx}`} fill={segment.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="-mt-[128px] text-center">
                  <p className={`text-5xl font-semibold ${revenueComparison.growthColors.textClass}`}>{Math.round(revenueComparison.gaugePct)}%</p>
                  <p className="text-lg text-muted-foreground">Crecimiento</p>
                </div>
                <p className={`mt-10 text-center text-2xl ${revenueComparison.growthColors.textClass}`}>
                  {revenueComparison.growthPct >= 0 ? '+' : ''}
                  {revenueComparison.growthPct.toFixed(1)}% Crecimiento de la empresa
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article className="rounded-lg bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">{revenueComparison.currentLabel}</p>
                  <p className="mt-1 text-3xl font-semibold text-foreground">{formatCurrency(revenueComparison.currentTotal)}</p>
                </article>
                <article className="rounded-lg  bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">{revenueComparison.previousLabel}</p>
                  <p className="mt-1 text-3xl font-semibold text-foreground">{formatCurrency(revenueComparison.previousTotal)}</p>
                </article>
              </div>
            </div>
          </div>
        )}
      </section>
    </AnaliticaShell>
  )
}
