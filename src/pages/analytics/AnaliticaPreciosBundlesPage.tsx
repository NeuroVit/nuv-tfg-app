import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Boxes, DollarSign } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  getBundleCandidatosAnalitica,
  getBundlesPerformance,
  getMetaAnalitica,
  getPreciosAnalitica,
} from '@/api/analitica'
import type {
  AnaliticaMeta,
  BundleCandidateRow,
  BundlePerformanceRow,
  PriceTrendRow,
} from '@/types/analitica'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AnaliticaShell,
  EmptyChartPlaceholder,
  RevealDataSection,
  formatCompact,
  formatCurrency,
  useAnaliticaRange,
  type LoadState,
} from './shared'
import { useFormatters } from '@/lib/useFormatters'

const priceDeltaChartConfig = {
  priceDelta: {
    label: 'Cambio de precio',
    color: '#0ea5e9',
  },
} satisfies ChartConfig

const bundleChartConfig = {
  coOccurrenceCount: {
    label: 'Co-ocurrencia',
    color: '#7c3aed',
  },
} satisfies ChartConfig

const bundlePerformanceChartConfig = {
  revenue: {
    label: 'Ingresos',
    color: '#0f766e',
  },
  profit: {
    label: 'Margen',
    color: '#f59e0b',
  },
} satisfies ChartConfig

export default function AnaliticaPreciosBundlesPage() {
  const { formatDateTime, formatShortDate } = useFormatters()
  const { timeRange, selectedDays, setTimeRange } = useAnaliticaRange()
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metadata, setMetadata] = useState<AnaliticaMeta | null>(null)
  const [precios, setPrecios] = useState<PriceTrendRow[]>([])
  const [bundles, setBundles] = useState<BundleCandidateRow[]>([])
  const [bundlePerformance, setBundlePerformance] = useState<BundlePerformanceRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadState('loading')
      try {
        const [pri, bun, perf, meta] = await Promise.all([
          getPreciosAnalitica(120, selectedDays),
          getBundleCandidatosAnalitica(120, selectedDays),
          getBundlesPerformance(selectedDays, 20),
          getMetaAnalitica(selectedDays),
        ])

        setPrecios(pri)
        setBundles(bun)
        setBundlePerformance(perf)
        setMetadata(meta)
        setLastUpdatedAt(new Date())
        setLoadState('ready')
      } catch {
        setLoadState('error')
        toast.error('No se pudieron cargar los datos de precios y bundles')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedDays])

  const kpis = useMemo(() => {
    const maxAbsDelta = precios.reduce((max, row) => Math.max(max, Math.abs(row.priceDelta)), 0)
    const avgPctChange =
      precios.length === 0 ? 0 : precios.reduce((sum, row) => sum + row.pctChange, 0) / precios.length

    return {
      priceUpdates: precios.length,
      bundleCandidates: bundles.length,
      bundlePerformanceRows: bundlePerformance.length,
      maxAbsDelta,
      avgPctChange,
    }
  }, [bundlePerformance.length, bundles, precios])

  const priceDeltaChartData = useMemo(
    () =>
      precios
        .slice(0, 20)
        .reverse()
        .map((row) => ({
          product: row.productName,
          date: formatShortDate(row.changedAt),
          priceDelta: row.priceDelta,
        })),
    [formatShortDate, precios],
  )

  const bundleChartData = useMemo(
    () =>
      bundles
        .slice(0, 10)
        .map((row) => ({
          pair: `${row.productAName} + ${row.productBName}`,
          coOccurrenceCount: row.coOccurrenceCount,
        }))
        .reverse(),
    [bundles],
  )

  const bundlePerformanceChartData = useMemo(
    () =>
      bundlePerformance
        .slice(0, 10)
        .map((row) => ({
          bundleName: row.bundleName,
          revenue: row.revenue,
          profit: row.profit,
        }))
        .reverse(),
    [bundlePerformance],
  )

  return (
    <AnaliticaShell
      title="Analítica · Precios y Bundles"
      description="Evolución de precios y combinaciones de productos con mayor co-ocurrencia."
      metadata={metadata}
      loadState={loadState}
      lastUpdatedAt={lastUpdatedAt}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      hideHeader
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cambios de precio</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatCompact(kpis.priceUpdates)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidatos bundle</p>
          <p className="mt-2 text-xl font-semibold text-violet-700">{formatCompact(kpis.bundleCandidates)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mayor cambio absoluto</p>
          <p className="mt-2 text-xl font-semibold text-blue-700">{formatCurrency(kpis.maxAbsDelta)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Variación media %</p>
          <p className="mt-2 text-xl font-semibold text-indigo-700">{kpis.avgPctChange.toFixed(2)}%</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Bundles con ventas reales</p>
          <p className="mt-2 text-xl font-semibold text-teal-700">{formatCompact(kpis.bundlePerformanceRows)}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Tendencia de cambios de precio recientes</h2>
          <div className="mt-3 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
            ) : priceDeltaChartData.length === 0 ? (
              <EmptyChartPlaceholder
                icon={DollarSign}
                message="No hay cambios de precio registrados para mostrar la tendencia."
              />
            ) : (
              <ChartContainer config={priceDeltaChartConfig} className="h-full w-full">
                <LineChart data={priceDeltaChartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" minTickGap={18} />
                  <YAxis />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="priceDelta"
                    stroke="var(--color-priceDelta)"
                    strokeWidth={2}
                    dot={false}
                    name="priceDelta"
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </article>

        <article className="rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Top combinaciones por co-ocurrencia</h2>
          <div className="mt-3 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
            ) : bundleChartData.length === 0 ? (
              <EmptyChartPlaceholder
                icon={Boxes}
                message="No hay suficientes ventas conjuntas para sugerir bundles."
              />
            ) : (
              <ChartContainer config={bundleChartConfig} className="h-full w-full">
                <BarChart data={bundleChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" width={200} dataKey="pair" tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="coOccurrenceCount" fill="var(--color-coOccurrenceCount)" name="coOccurrenceCount" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </article>

        <article className="rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Bundle performance real</h2>
          <div className="mt-3 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
            ) : bundlePerformanceChartData.length === 0 ? (
              <EmptyChartPlaceholder
                icon={Boxes}
                message="No hay líneas de venta con bundle asociado en el rango."
              />
            ) : (
              <ChartContainer config={bundlePerformanceChartConfig} className="h-full w-full">
                <BarChart data={bundlePerformanceChartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bundleName" tick={{ fontSize: 11 }} minTickGap={12} />
                  <YAxis />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" name="revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="var(--color-profit)" name="profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </article>
      </section>

      <RevealDataSection>
        <section className="space-y-4">
          <article className="rounded-lg border bg-card p-0">
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
                ) : precios.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin historial de cambios de precio.</TableCell></TableRow>
                ) : precios.map((row) => (
                  <TableRow key={row.historyId}>
                    <TableCell>{formatDateTime(row.changedAt)}</TableCell>
                    <TableCell>{row.productName} <span className="text-xs text-muted-foreground">({row.sku})</span></TableCell>
                    <TableCell>{formatCurrency(row.oldPrice)}</TableCell>
                    <TableCell>{formatCurrency(row.newPrice)}</TableCell>
                    <TableCell>{formatCurrency(row.priceDelta)}</TableCell>
                    <TableCell>{row.pctChange}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </article>

          <article className="rounded-lg border bg-card p-0">
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
                ) : bundles.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No hay sugerencias de bundle disponibles.</TableCell></TableRow>
                ) : bundles.map((row) => (
                  <TableRow key={`${row.productAId}-${row.productBId}`}>
                    <TableCell>{row.productAName} <span className="text-xs text-muted-foreground">({row.productASku})</span></TableCell>
                    <TableCell>{row.productBName} <span className="text-xs text-muted-foreground">({row.productBSku})</span></TableCell>
                    <TableCell>{formatCompact(row.coOccurrenceCount)}</TableCell>
                    <TableCell>{formatCurrency(row.combinedPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </article>

          <article className="rounded-lg border bg-card p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bundle</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Ingresos</TableHead>
                  <TableHead>Coste</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>Margen %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : bundlePerformance.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay bundle performance real disponible.</TableCell></TableRow>
                ) : bundlePerformance.map((row) => (
                  <TableRow key={row.bundleId}>
                    <TableCell>{row.bundleName}</TableCell>
                    <TableCell>{formatCompact(row.salesCount)}</TableCell>
                    <TableCell>{formatCompact(row.unitsSold)}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}</TableCell>
                    <TableCell>{formatCurrency(row.cost)}</TableCell>
                    <TableCell>{formatCurrency(row.profit)}</TableCell>
                    <TableCell>{row.margin.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </article>
        </section>
      </RevealDataSection>
    </AnaliticaShell>
  )
}
