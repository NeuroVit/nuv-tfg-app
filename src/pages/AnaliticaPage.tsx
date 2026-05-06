import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  getBundleCandidatosAnalitica,
  getDistribucionStockAnalitica,
  getFinanzasResumenAnalitica,
  getInventarioAnalitica,
  getMetaAnalitica,
  getPreciosAnalitica,
  getRentabilidadProductosAnalitica,
  getStockPorCategoriaAnalitica,
  getTopProductosVelocidadAnalitica,
  getVelocidadAnalitica,
  getVelocidadResumenAnalitica,
} from '@/api/analitica'
import type {
  AnaliticaMeta,
  BundleCandidateRow,
  FinanzasResumen,
  InventorySummaryRow,
  PriceTrendRow,
  RentabilidadProductoRow,
  SalesVelocityRow,
  StockByCategoryRow,
  StockDistributionRow,
  TopProductVelocityRow,
  VelocitySummaryRow,
} from '@/types/analitica'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  type LucideIcon,
  TrendingUp,
  Warehouse,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`
const formatCompact = (value: number) => value.toLocaleString('es-ES')

const statusLabels: Record<string, string> = {
  OUT_OF_STOCK: 'Sin stock',
  LOW_STOCK: 'Stock bajo',
  OK: 'OK',
  OVERSTOCK: 'Sobrestock',
}

type TimeRangeValue = 'all' | '180' | '90' | '30' | '7' | '1'

const timeRangeOptions: Array<{ value: TimeRangeValue; label: string; days: number }> = [
  { value: 'all', label: 'Todo el tiempo', days: 0 },
  { value: '180', label: '6 meses', days: 180 },
  { value: '90', label: '3 meses', days: 90 },
  { value: '30', label: '30 días', days: 30 },
  { value: '7', label: 'Semanal', days: 7 },
  { value: '1', label: 'Diario', days: 1 },
]

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
  margen: {
    label: 'Margen',
    color: '#0ea5e9',
  },
} satisfies ChartConfig

const stockDistributionChartConfig = {
  outOfStock: {
    label: 'Sin stock',
    color: '#ef4444',
  },
  lowStock: {
    label: 'Stock bajo',
    color: '#f59e0b',
  },
  okStock: {
    label: 'OK',
    color: '#10b981',
  },
  overStock: {
    label: 'Sobrestock',
    color: '#6366f1',
  },
} satisfies ChartConfig

const categoryStockChartConfig = {
  value: {
    label: 'Valor stock',
    color: '#06b6d4',
  },
} satisfies ChartConfig

function statusFillKey(status: string) {
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

function sourceLabel(meta: AnaliticaMeta | null) {
  if (!meta) return 'API real'
  if (meta.source === 'API_REAL_LOCAL_SEEDED') {
    return 'API real (seed local activo)'
  }
  if (meta.source === 'API_REAL_SEED_PENDING') {
    return 'API real (seed pendiente)'
  }
  return 'API real'
}

type EmptyChartPlaceholderProps = {
  icon: LucideIcon
  message: string
}

function EmptyChartPlaceholder({ icon: Icon, message }: EmptyChartPlaceholderProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-6 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default function AnaliticaPage() {
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metadata, setMetadata] = useState<AnaliticaMeta | null>(null)

  const [inventario, setInventario] = useState<InventorySummaryRow[]>([])
  const [velocidad, setVelocidad] = useState<SalesVelocityRow[]>([])
  const [precios, setPrecios] = useState<PriceTrendRow[]>([])
  const [bundles, setBundles] = useState<BundleCandidateRow[]>([])
  const [velocidadResumen, setVelocidadResumen] = useState<VelocitySummaryRow[]>([])
  const [topProductos, setTopProductos] = useState<TopProductVelocityRow[]>([])
  const [distribucionStock, setDistribucionStock] = useState<StockDistributionRow[]>([])
  const [stockPorCategoria, setStockPorCategoria] = useState<StockByCategoryRow[]>([])
  const [finanzas, setFinanzas] = useState<FinanzasResumen | null>(null)
  const [rentabilidad, setRentabilidad] = useState<RentabilidadProductoRow[]>([])
  const [timeRange, setTimeRange] = useState<TimeRangeValue>('30')

  const selectedDays = useMemo(
    () => timeRangeOptions.find((option) => option.value === timeRange)?.days ?? 30,
    [timeRange],
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadState('loading')

      try {
        const [inv, vel, pri, bun, velRes, topVel, dist, byCat, fin, rent, meta] = await Promise.all([
          getInventarioAnalitica(),
          getVelocidadAnalitica(120, selectedDays),
          getPreciosAnalitica(),
          getBundleCandidatosAnalitica(),
          getVelocidadResumenAnalitica(selectedDays),
          getTopProductosVelocidadAnalitica(selectedDays, 10),
          getDistribucionStockAnalitica(),
          getStockPorCategoriaAnalitica(),
          getFinanzasResumenAnalitica(selectedDays),
          getRentabilidadProductosAnalitica(selectedDays, 20),
          getMetaAnalitica(selectedDays),
        ])

        setInventario(inv)
        setVelocidad(vel)
        setPrecios(pri)
        setBundles(bun)
        setVelocidadResumen(velRes)
        setTopProductos(topVel)
        setDistribucionStock(dist)
        setStockPorCategoria(byCat)
        setFinanzas(fin)
        setRentabilidad(rent)
        setMetadata(meta)
        setLastUpdatedAt(new Date())
        setLoadState('ready')
      } catch {
        setLoadState('error')
        toast.error('No se pudieron cargar los datos de analítica')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedDays])

  const kpis = useMemo(() => {
    const lowStockCount = inventario.filter((row) => row.stockStatus === 'LOW_STOCK').length
    const outOfStockCount = inventario.filter((row) => row.stockStatus === 'OUT_OF_STOCK').length
    const units30d = velocidadResumen.reduce((sum, row) => sum + row.unitsSold, 0)

    return {
      lowStockCount,
      outOfStockCount,
      units30d,
      ventas30d: finanzas?.ventas30d ?? 0,
      compras30d: finanzas?.compras30d ?? 0,
      flujoNeto30d: finanzas?.flujoNeto30d ?? 0,
      cogsReal30d: finanzas?.cogsReal30d ?? 0,
      margenReal30d: finanzas?.margenReal30d ?? 0,
      valorStockVenta: finanzas?.valorStockVenta ?? 0,
      costoStockReal: finanzas?.costoStockReal ?? 0,
      margenBrutoPct: finanzas?.margenBrutoPct ?? 0,
      markupPct: finanzas?.markupPct ?? 0,
      ticketPromedio: finanzas?.ticketPromedio ?? 0,
      rotacionInventario: finanzas?.rotacionInventario ?? 0,
      diasInventario: finanzas?.diasInventario ?? 0,
      gmroi: finanzas?.gmroi ?? 0,
      ventasPromedioDiarias: finanzas?.ventasPromedioDiarias ?? 0,
    }
  }, [inventario, velocidadResumen, finanzas])

  const salesLineData = useMemo(
    () =>
      velocidadResumen.map((row) => ({
        date: new Date(row.movementDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        unitsSold: row.unitsSold,
        revenue: row.revenue,
      })),
    [velocidadResumen],
  )

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

  const stockDistributionData = useMemo(
    () =>
      distribucionStock.map((row) => {
        const fillKey = statusFillKey(row.stockStatus)
        return {
          name: statusLabels[row.stockStatus] ?? row.stockStatus,
          value: row.products,
          fill: `var(--color-${fillKey})`,
        }
      }),
    [distribucionStock],
  )

  const categoryStockData = useMemo(
    () =>
      stockPorCategoria.map((row) => ({
        category: row.categoryName,
        value: row.stockValueTotal,
      })),
    [stockPorCategoria],
  )

  const topWinners = useMemo(
    () => rentabilidad.filter((row) => row.margen > 0).sort((a, b) => b.margen - a.margen).slice(0, 5),
    [rentabilidad],
  )

  const topLosers = useMemo(
    () => rentabilidad.filter((row) => row.margen < 0).sort((a, b) => a.margen - b.margen).slice(0, 5),
    [rentabilidad],
  )

  const rangeLabel =
    selectedDays <= 0
      ? 'Todo el tiempo'
      : `${selectedDays} día${selectedDays === 1 ? '' : 's'}`

  const loadStateLabel =
    loadState === 'loading' ? 'Cargando' : loadState === 'error' ? 'Error' : 'Actualizado'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analítica</h1>
          <p className="mt-1 text-sm text-muted-foreground">Métricas reales de ventas, costes y rentabilidad por producto.</p>
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
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRangeValue)}>
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

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas (rango)</p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(kpis.ventas30d)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">COGS real (rango)</p>
            <p className="mt-2 text-xl font-semibold text-orange-700">-{formatCurrency(kpis.cogsReal30d)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen real (rango)</p>
            <p className={`mt-2 text-xl font-semibold ${kpis.margenReal30d >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(kpis.margenReal30d)}
            </p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Compras proveedores (rango)</p>
            <p className="mt-2 text-xl font-semibold text-red-700">-{formatCurrency(kpis.compras30d)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Flujo neto (rango)</p>
            <p className={`mt-2 text-xl font-semibold ${kpis.flujoNeto30d >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(kpis.flujoNeto30d)}
            </p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor stock (venta)</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(kpis.valorStockVenta)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Coste stock real</p>
            <p className="mt-2 text-xl font-semibold text-muted-foreground">{formatCurrency(kpis.costoStockReal)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Unidades vendidas (rango)</p>
            <p className="mt-2 text-xl font-semibold text-blue-700">{formatCompact(kpis.units30d)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen bruto %</p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">{kpis.margenBrutoPct.toFixed(2)}%</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Markup %</p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">{kpis.markupPct.toFixed(2)}%</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket promedio</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(kpis.ticketPromedio)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas promedio diarias</p>
            <p className="mt-2 text-xl font-semibold text-blue-700">{formatCurrency(kpis.ventasPromedioDiarias)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rotación inventario</p>
            <p className="mt-2 text-xl font-semibold text-indigo-700">{kpis.rotacionInventario.toFixed(2)}x</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Días inventario</p>
            <p className="mt-2 text-xl font-semibold text-indigo-700">{kpis.diasInventario.toFixed(1)} días</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">GMROI</p>
            <p className="mt-2 text-xl font-semibold text-violet-700">{kpis.gmroi.toFixed(2)}x</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Productos low stock</p>
            <p className="mt-2 text-xl font-semibold text-amber-700">{formatCompact(kpis.lowStockCount)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Productos sin stock</p>
            <p className="mt-2 text-xl font-semibold text-red-700">{formatCompact(kpis.outOfStockCount)}</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Tendencia diaria de ventas (rango)</h2>
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
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(Number(value))}
                        />
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
            <h2 className="text-sm font-semibold text-foreground">Distribución de estado de stock</h2>
            <div className="mt-3 h-72">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
              ) : stockDistributionData.length === 0 || stockDistributionData.every((row) => row.value <= 0) ? (
                <EmptyChartPlaceholder
                  icon={PieChartIcon}
                  message="No hay datos de stock para mostrar la distribución por estado."
                />
              ) : (
                <ChartContainer config={stockDistributionChartConfig} className="h-full w-full">
                  <PieChart>
                    <Pie data={stockDistributionData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2}>
                      {stockDistributionData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </div>
          </article>

          <article className="rounded-lg border bg-card p-4 xl:col-span-2">
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

          <article className="rounded-lg border bg-card p-4 xl:col-span-2">
            <h2 className="text-sm font-semibold text-foreground">Valor de stock por categoría</h2>
            <div className="mt-3 h-72">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
              ) : categoryStockData.length === 0 || categoryStockData.every((row) => row.value <= 0) ? (
                <EmptyChartPlaceholder
                  icon={Warehouse}
                  message="No hay categorías con valor de stock para graficar en este momento."
                />
              ) : (
                <ChartContainer config={categoryStockChartConfig} className="h-full w-full">
                  <BarChart data={categoryStockData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={64} />
                    <YAxis />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                    />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} name="value" />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </article>
        </section>

        <Tabs defaultValue="inventario" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
            <TabsTrigger value="velocidad">Velocidad</TabsTrigger>
            <TabsTrigger value="precios">Precios</TabsTrigger>
            <TabsTrigger value="bundles">Bundles</TabsTrigger>
          </TabsList>

          <TabsContent value="inventario" className="rounded-lg border bg-card p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : inventario.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>{row.productName} <span className="text-xs text-muted-foreground">({row.sku})</span></TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell>{row.currentQuantity}</TableCell>
                    <TableCell>{row.minimumStockLevel}</TableCell>
                    <TableCell>{formatCurrency(row.stockValue)}</TableCell>
                    <TableCell>{row.stockStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="velocidad" className="rounded-lg border bg-card p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : velocidad.map((row, index) => (
                  <TableRow key={`${row.productId}-${row.movementDate}-${index}`}>
                    <TableCell>{new Date(row.movementDate).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>{row.productName} <span className="text-xs text-muted-foreground">({row.sku})</span></TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell>{row.unitsSold}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="precios" className="rounded-lg border bg-card p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Anterior</TableHead>
                  <TableHead>Nuevo</TableHead>
                  <TableHead>Cambio de precio</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : precios.map((row) => (
                  <TableRow key={row.historyId}>
                    <TableCell>{new Date(row.changedAt).toLocaleString('es-ES')}</TableCell>
                    <TableCell>{row.productName} <span className="text-xs text-muted-foreground">({row.sku})</span></TableCell>
                    <TableCell>{formatCurrency(row.oldPrice)}</TableCell>
                    <TableCell>{formatCurrency(row.newPrice)}</TableCell>
                    <TableCell>{formatCurrency(row.priceDelta)}</TableCell>
                    <TableCell>{row.pctChange}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="bundles" className="rounded-lg border bg-card p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto A</TableHead>
                  <TableHead>Producto B</TableHead>
                  <TableHead>Co-ocurrencia</TableHead>
                  <TableHead>Precio combinado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : bundles.map((row) => (
                  <TableRow key={`${row.productAId}-${row.productBId}`}>
                    <TableCell>{row.productAName} <span className="text-xs text-muted-foreground">({row.productASku})</span></TableCell>
                    <TableCell>{row.productBName} <span className="text-xs text-muted-foreground">({row.productBSku})</span></TableCell>
                    <TableCell>{row.coOccurrenceCount}</TableCell>
                    <TableCell>{formatCurrency(row.combinedPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
