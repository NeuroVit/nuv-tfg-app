import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Truck } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  XAxis,
  YAxis,
  type ChartConfig,
} from '@/components/ui/chart'
import { getMetaAnalitica, getProveedoresPerformance } from '@/features/analitica/api/analitica'
import type { AnaliticaMeta, ProveedorPerformanceRow } from '@/features/analitica/types/analitica'
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

const providerChartConfig = {
  totalSpend: {
    label: 'Gasto',
    color: '#0ea5e9',
  },
} satisfies ChartConfig

export default function AnaliticaProveedoresPage() {
  const { formatDateTime } = useFormatters()
  const { timeRange, selectedDays, setTimeRange } = useAnaliticaRange()
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metadata, setMetadata] = useState<AnaliticaMeta | null>(null)
  const [rows, setRows] = useState<ProveedorPerformanceRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadState('loading')
      try {
        const [providers, meta] = await Promise.all([
          getProveedoresPerformance(selectedDays || 90, 20),
          getMetaAnalitica(selectedDays || 90),
        ])
        setRows(providers)
        setMetadata(meta)
        setLastUpdatedAt(new Date())
        setLoadState('ready')
      } catch {
        setLoadState('error')
        toast.error('No se pudo cargar el performance de proveedores')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedDays])

  const chartData = useMemo(
    () =>
      rows
        .slice(0, 10)
        .map((row) => ({ providerName: row.providerName, totalSpend: row.totalSpend }))
        .reverse(),
    [rows],
  )

  const totals = useMemo(() => ({
    providers: rows.length,
    orderCount: rows.reduce((sum, row) => sum + row.orderCount, 0),
    totalSpend: rows.reduce((sum, row) => sum + row.totalSpend, 0),
  }), [rows])

  return (
    <AnaliticaShell
      title="Analítica · Proveedores"
      description="Rendimiento de proveedores por gasto, lead time y puntualidad."
      metadata={metadata}
      loadState={loadState}
      lastUpdatedAt={lastUpdatedAt}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      hideHeader
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Proveedores con pedidos</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatCompact(totals.providers)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pedidos en rango</p>
          <p className="mt-2 text-xl font-semibold text-blue-700">{formatCompact(totals.orderCount)}</p>
        </article>
        <article className="rounded-lg bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Gasto total</p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(totals.totalSpend)}</p>
        </article>
      </section>

      <section className="rounded-lg bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Top proveedores por gasto</h2>
        <div className="mt-3 h-72">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando...</div>
          ) : chartData.length === 0 ? (
            <EmptyChartPlaceholder icon={Truck} message="No hay pedidos para mostrar performance de proveedores." />
          ) : (
            <ChartContainer config={providerChartConfig} className="h-full w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" width={190} dataKey="providerName" tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                <Bar dataKey="totalSpend" fill="var(--color-totalSpend)" name="totalSpend" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </section>

      <RevealDataSection>
        <section className="rounded-lg border bg-card p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Gasto total</TableHead>
                <TableHead>Lead time medio (dias)</TableHead>
                <TableHead>Entregas en fecha %</TableHead>
                <TableHead>Ultimo pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin datos de proveedores para este rango.</TableCell></TableRow>
              ) : rows.map((row) => (
                <TableRow key={row.providerId}>
                  <TableCell>{row.providerName}</TableCell>
                  <TableCell>{formatCompact(row.orderCount)}</TableCell>
                  <TableCell>{formatCurrency(row.totalSpend)}</TableCell>
                  <TableCell>{row.avgLeadTimeDays.toFixed(2)}</TableCell>
                  <TableCell>{row.onTimePct.toFixed(2)}%</TableCell>
                  <TableCell>{formatDateTime(row.lastOrderAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </RevealDataSection>
    </AnaliticaShell>
  )
}
