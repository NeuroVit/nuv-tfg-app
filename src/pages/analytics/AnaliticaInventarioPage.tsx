import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LineChart as LineChartIcon, PackagePlus, PieChart as PieChartIcon, Warehouse } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  getDistribucionStockAnalitica,
  getInventarioAnalitica,
  getMetaAnalitica,
  getProductosCreadosAnalitica,
  getStockPorCategoriaAnalitica,
  getStockRecibidoAnalitica,
} from '@/api/analitica'
import type {
  AnaliticaMeta,
  InventorySummaryRow,
  ProductCreationRow,
  StockByCategoryRow,
  StockDistributionRow,
  StockReceiptRow,
} from '@/types/analitica'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/lib/useFormatters'
import {
  AnaliticaShell,
  EmptyChartPlaceholder,
  RevealDataSection,
  formatCompact,
  formatCurrency,
  statusFillKey,
  statusLabels,
  useAnaliticaRange,
  type LoadState,
} from './shared'

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
    label: 'Óptimo',
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

const productCreationChartConfig = {
  productsCreated: {
    label: 'Productos creados',
    color: '#8b5cf6',
  },
} satisfies ChartConfig

const stockReceiptsChartConfig = {
  unitsReceived: {
    label: 'Unidades recibidas',
    color: '#0ea5e9',
  },
  valueReceived: {
    label: 'Valor recibido',
    color: '#22c55e',
  },
} satisfies ChartConfig

const formatShortDate = (iso: string, tz: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-ES', { timeZone: tz, day: '2-digit', month: '2-digit' }).format(date)
}

const PAGE_SIZE = 20

export default function AnaliticaInventarioPage() {
  const { timeZone } = useFormatters()
  const { timeRange, selectedDays, setTimeRange } = useAnaliticaRange()
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metadata, setMetadata] = useState<AnaliticaMeta | null>(null)
  const [inventario, setInventario] = useState<InventorySummaryRow[]>([])
  const [distribucionStock, setDistribucionStock] = useState<StockDistributionRow[]>([])
  const [stockPorCategoria, setStockPorCategoria] = useState<StockByCategoryRow[]>([])
  const [productosCreados, setProductosCreados] = useState<ProductCreationRow[]>([])
  const [stockRecibido, setStockRecibido] = useState<StockReceiptRow[]>([])
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadState('loading')
      try {
        const [inv, dist, byCat, creados, recibido, meta] = await Promise.all([
          getInventarioAnalitica(),
          getDistribucionStockAnalitica(),
          getStockPorCategoriaAnalitica(),
          getProductosCreadosAnalitica(selectedDays),
          getStockRecibidoAnalitica(selectedDays),
          getMetaAnalitica(selectedDays),
        ])

        setInventario(inv)
        setDistribucionStock(dist)
        setStockPorCategoria(byCat)
        setProductosCreados(creados)
        setStockRecibido(recibido)
        setMetadata(meta)
        setLastUpdatedAt(new Date())
        setLoadState('ready')
      } catch {
        setLoadState('error')
        toast.error('No se pudieron cargar los datos de inventario')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedDays])

  const kpis = useMemo(() => {
    const lowStockCount = inventario.filter((row) => row.stockStatus === 'LOW_STOCK').length
    const outOfStockCount = inventario.filter((row) => row.stockStatus === 'OUT_OF_STOCK').length
    const overStockCount = inventario.filter((row) => row.stockStatus === 'OVERSTOCK').length
    const optimalCount = inventario.filter((row) => row.stockStatus === 'OK').length
    const stockValue = inventario.reduce((sum, row) => sum + row.stockValue, 0)

    return {
      lowStockCount,
      outOfStockCount,
      overStockCount,
      optimalCount,
      stockValue,
      productsCount: inventario.length,
    }
  }, [inventario])

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

  const productCreationData = useMemo(
    () =>
      productosCreados.map((row) => ({
        date: row.creationDate,
        label: formatShortDate(row.creationDate, timeZone),
        productsCreated: row.productsCreated,
      })),
    [productosCreados, timeZone],
  )

  const stockReceiptsData = useMemo(
    () =>
      stockRecibido.map((row) => ({
        date: row.receiptDate,
        label: formatShortDate(row.receiptDate, timeZone),
        unitsReceived: row.unitsReceived,
        valueReceived: row.valueReceived,
      })),
    [stockRecibido, timeZone],
  )

  const categoryStockData = useMemo(
    () =>
      stockPorCategoria.map((row) => ({
        category: row.categoryName,
        value: row.stockValueTotal,
      })),
    [stockPorCategoria],
  )
  const total = inventario.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedInventario = useMemo(
    () => inventario.slice(offset, offset + PAGE_SIZE),
    [inventario, offset],
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
      title="Analítica · Inventario"
      description="Salud de stock, valor inmovilizado y distribución por categoría."
      metadata={metadata}
      loadState={loadState}
      lastUpdatedAt={lastUpdatedAt}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      hideHeader
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Productos totales</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatCompact(kpis.productsCount)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor total stock</p>
          <p className="mt-2 text-xl font-semibold text-indigo-700">{formatCurrency(kpis.stockValue)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Stock bajo / sin stock</p>
          <p className="mt-2 text-xl font-semibold text-red-700">
            {formatCompact(kpis.lowStockCount + kpis.outOfStockCount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCompact(kpis.lowStockCount)} bajo · {formatCompact(kpis.outOfStockCount)} sin stock
          </p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Óptimo / Sobrestock</p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">
            {formatCompact(kpis.optimalCount + kpis.overStockCount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCompact(kpis.optimalCount)} óptimo · {formatCompact(kpis.overStockCount)} sobrestock
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-lg bg-card p-4">
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

        <article className="rounded-lg bg-card p-4">
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Productos creados en el tiempo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Productos nuevos por día según su fecha de alta.
          </p>
          <div className="mt-3 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
            ) : productCreationData.length === 0 ? (
              <EmptyChartPlaceholder
                icon={LineChartIcon}
                message="Aún no hay productos creados en este rango de tiempo."
              />
            ) : (
              <ChartContainer config={productCreationChartConfig} className="h-full w-full">
                <AreaChart data={productCreationData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCompact(Number(value))} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="productsCreated"
                    stroke="var(--color-productsCreated)"
                    fill="var(--color-productsCreated)"
                    fillOpacity={0.25}
                    name="productsCreated"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </article>

        <article className="rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Stock recibido en el tiempo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Unidades y valor de compra recibidos por día (movimientos PURCHASE).
          </p>
          <div className="mt-3 h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
            ) : stockReceiptsData.length === 0 ? (
              <EmptyChartPlaceholder
                icon={PackagePlus}
                message="No hay recepciones de stock registradas en este rango."
              />
            ) : (
              <ChartContainer config={stockReceiptsChartConfig} className="h-full w-full">
                <AreaChart data={stockReceiptsData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="units" allowDecimals={false} />
                  <YAxis yAxisId="value" orientation="right" tickFormatter={(value) => formatCompact(Number(value))} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) =>
                          name === 'valueReceived' ? formatCurrency(Number(value)) : formatCompact(Number(value))
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    yAxisId="units"
                    type="monotone"
                    dataKey="unitsReceived"
                    stroke="var(--color-unitsReceived)"
                    fill="var(--color-unitsReceived)"
                    fillOpacity={0.25}
                    name="unitsReceived"
                  />
                  <Area
                    yAxisId="value"
                    type="monotone"
                    dataKey="valueReceived"
                    stroke="var(--color-valueReceived)"
                    fill="var(--color-valueReceived)"
                    fillOpacity={0.15}
                    name="valueReceived"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </article>
      </section>

      <RevealDataSection>
        <section className="rounded-lg border bg-card p-0">
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
              ) : paginatedInventario.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay productos de inventario para mostrar.</TableCell></TableRow>
              ) : paginatedInventario.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell>{row.productName} <span className="text-xs text-muted-foreground">({row.sku})</span></TableCell>
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell>{row.currentQuantity}</TableCell>
                  <TableCell>{row.minimumStockLevel}</TableCell>
                  <TableCell>{formatCurrency(row.stockValue)}</TableCell>
                  <TableCell>{statusLabels[row.stockStatus] ?? row.stockStatus}</TableCell>
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
      </RevealDataSection>
    </AnaliticaShell>
  )
}
