import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BarChart3, LineChart as LineChartIcon, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  getMetaAnalitica,
  getRentabilidadProductosAnalitica,
  getTopProductosVelocidadAnalitica,
  getVelocidadResumenAnalitica,
} from '@/api/analitica'
import type { AnaliticaMeta, RentabilidadProductoRow, TopProductVelocityRow, VelocitySummaryRow } from '@/types/analitica'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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

const topProductsChartConfig = {
  unitsSold: {
    label: 'Unidades',
    color: '#7c3aed',
  },
} satisfies ChartConfig

const marginChartConfig = {
  margenPositivo: {
    label: 'Margen positivo',
    color: '#22c55e',
  },
  margenNegativo: {
    label: 'Margen negativo',
    color: '#ef4444',
  },
} satisfies ChartConfig

const PAGE_SIZE = 20

export default function AnaliticaVentasRentabilidadPage() {
  const { timeRange, selectedDays, setTimeRange } = useAnaliticaRange()
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metadata, setMetadata] = useState<AnaliticaMeta | null>(null)
  const [velocidadResumen, setVelocidadResumen] = useState<VelocitySummaryRow[]>([])
  const [topProductos, setTopProductos] = useState<TopProductVelocityRow[]>([])
  const [rentabilidad, setRentabilidad] = useState<RentabilidadProductoRow[]>([])
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadState('loading')
      try {
        const [velRes, topVel, rent, meta] = await Promise.all([
          getVelocidadResumenAnalitica(selectedDays),
          getTopProductosVelocidadAnalitica(selectedDays, 10),
          getRentabilidadProductosAnalitica(selectedDays, 20),
          getMetaAnalitica(selectedDays),
        ])

        setVelocidadResumen(velRes)
        setTopProductos(topVel)
        setRentabilidad(rent)
        setMetadata(meta)
        setLastUpdatedAt(new Date())
        setLoadState('ready')
      } catch {
        setLoadState('error')
        toast.error('No se pudieron cargar los datos de ventas y rentabilidad')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedDays])

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

  const revenueThresholds = useMemo(() => {
    if (salesLineData.length === 0) return null
    const values = salesLineData
      .map((row) => row.revenue)
      .filter((value) => Number.isFinite(value))
    if (values.length === 0) return null

    const target = values.reduce((sum, value) => sum + value, 0) / values.length
    if (target <= 0) return null

    return {
      lower: target * 0.8,
      target,
    }
  }, [salesLineData])

  const topProductsChartData = useMemo(
    () =>
      topProductos
        .slice()
        .sort((a, b) => a.unitsSold - b.unitsSold)
        .map((row) => ({
          name: row.productName,
          unitsSold: row.unitsSold,
        })),
    [topProductos],
  )

  const marginProductsChartData = useMemo(() => {
    const positives = rentabilidad
      .filter((row) => row.margen > 0)
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 6)
    const negatives = rentabilidad
      .filter((row) => row.margen < 0)
      .sort((a, b) => a.margen - b.margen)
      .slice(0, 6)

    return [...positives, ...negatives]
      .map((row) => ({
        name: row.productName,
        margen: row.margen,
      }))
      .sort((a, b) => a.margen - b.margen)
  }, [rentabilidad])

  const topWinners = useMemo(
    () => rentabilidad.filter((row) => row.margen > 0).sort((a, b) => b.margen - a.margen).slice(0, 5),
    [rentabilidad],
  )

  const topLosers = useMemo(
    () => rentabilidad.filter((row) => row.margen < 0).sort((a, b) => a.margen - b.margen).slice(0, 5),
    [rentabilidad],
  )

  const salesTrendTitle =
    selectedDays <= 0
      ? 'Tendencia histórica de ventas'
      : selectedDays === 1
        ? 'Tendencia de ventas (hoy)'
        : selectedDays === 7
          ? 'Tendencia semanal de ventas'
          : 'Tendencia de ventas (rango)'
  const total = rentabilidad.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedRentabilidad = useMemo(
    () => rentabilidad.slice(offset, offset + PAGE_SIZE),
    [rentabilidad, offset],
  )

  useEffect(() => {
    setOffset(0)
  }, [selectedDays])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  return (
    <AnaliticaShell
      title="Analítica · Ventas y Rentabilidad"
      description="Evolución de ventas, productos con mayor tracción y margen por producto."
      metadata={metadata}
      loadState={loadState}
      lastUpdatedAt={lastUpdatedAt}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
    >
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">{salesTrendTitle}</h2>
          <div className="mt-3 h-72">
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
                        stroke="#dc2626"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        ifOverflow="extendDomain"
                        label={{ value: 'Riesgo por debajo de esta línea', position: 'right', fill: '#991b1b', fontSize: 11 }}
                      />
                      <ReferenceLine
                        yAxisId="right"
                        y={revenueThresholds.target}
                        stroke="#16a34a"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        ifOverflow="extendDomain"
                        label={{ value: 'Umbral objetivo', position: 'left', fill: '#166534', fontSize: 11 }}
                      />
                    </>
                  ) : null}
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </article>

        <article className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Top productos por velocidad (rango)</h2>
          <div className="mt-3 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
            ) : topProductsChartData.length === 0 ? (
              <EmptyChartPlaceholder
                icon={TrendingUp}
                message="No hay productos con ventas en este rango para mostrar velocidad."
              />
            ) : (
              <ChartContainer config={topProductsChartConfig} className="h-full w-full">
                <BarChart data={topProductsChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" width={140} dataKey="name" tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="unitsSold" fill="var(--color-unitsSold)" name="unitsSold" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </article>

        <article className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Productos ganadores vs perdedores (margen)</h2>
          <div className="mt-3 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
            ) : marginProductsChartData.length === 0 ? (
              <EmptyChartPlaceholder
                icon={BarChart3}
                message="Todavía no hay datos de margen para comparar productos ganadores y perdedores."
              />
            ) : (
              <ChartContainer config={marginChartConfig} className="h-full w-full">
                <BarChart data={marginProductsChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" width={150} dataKey="name" tick={{ fontSize: 11 }} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                    }
                  />
                  <Bar dataKey="margen" name="margen">
                    {marginProductsChartData.map((row) => (
                      <Cell
                        key={row.name}
                        fill={row.margen >= 0 ? 'var(--color-margenPositivo)' : 'var(--color-margenNegativo)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </article>

        <article className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Top 5 productos más rentables y menos rentables</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Ganadores</p>
              <div className="space-y-2">
                {topWinners.length === 0 ? (
                  <p className="text-sm text-emerald-900 dark:text-emerald-100">Sin ventas rentables aún.</p>
                ) : topWinners.map((row) => (
                  <div key={row.productId} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2 text-emerald-950 dark:text-emerald-100">{row.productName}</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">{formatCurrency(row.margen)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-200">Perdedores</p>
              <div className="space-y-2">
                {topLosers.length === 0 ? (
                  <p className="text-sm text-red-900 dark:text-red-100">No hay productos en pérdidas.</p>
                ) : topLosers.map((row) => (
                  <div key={row.productId} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2 text-red-950 dark:text-red-100">{row.productName}</span>
                    <span className="font-semibold text-red-800 dark:text-red-200">{formatCurrency(row.margen)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-lg border bg-card p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Ingresos</TableHead>
              <TableHead>Coste de ventas</TableHead>
              <TableHead>Margen</TableHead>
              <TableHead>Margen %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : paginatedRentabilidad.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sin datos de rentabilidad para este rango.</TableCell></TableRow>
            ) : paginatedRentabilidad.map((row) => (
              <TableRow key={row.productId}>
                <TableCell>{row.productName} <span className="text-xs text-muted-foreground">({row.sku})</span></TableCell>
                <TableCell>{row.categoryName}</TableCell>
                <TableCell>{formatCompact(row.unidadesVendidas)}</TableCell>
                <TableCell>{formatCurrency(row.revenue)}</TableCell>
                <TableCell>{formatCurrency(row.cogs)}</TableCell>
                <TableCell className={row.margen >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatCurrency(row.margen)}</TableCell>
                <TableCell>{row.margenPct.toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

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
    </AnaliticaShell>
  )
}
