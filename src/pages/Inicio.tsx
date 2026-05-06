import { useMemo } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, PackageSearch } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useInventarioDashboard } from '@/hooks/useInventarioDashboard'
import { useProfileStore } from '@/store/profileStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const formatCurrency = (value: number) =>
  `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`

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

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 14) return 'Buenos días'
  if (hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

const chartConfig = {
  Entradas: { label: 'Entradas', color: 'hsl(142, 71%, 45%)' },
  Salidas: { label: 'Salidas', color: 'hsl(0, 84%, 60%)' },
} satisfies ChartConfig

export default function Inicio() {
  const displayName = useProfileStore((s) => s.displayName)
  const {
    valorTotal,
    totalProductos,
    productosStockBajo,
    totalCategorias,
    movimientos,
    loading,
    error,
  } = useInventarioDashboard()

  const movimientosPreview = movimientos.slice(0, 5)
  const stockBajoPreview = productosStockBajo.slice(0, 5)

  const chartData = useMemo(() => {
    const days: Record<string, { fecha: string; Entradas: number; Salidas: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]!
      const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      days[key] = { fecha: label, Entradas: 0, Salidas: 0 }
    }
    movimientos.forEach((m) => {
      const key = m.fecha.split('T')[0]!
      if (key in days) {
        if (m.tipo === 'ENTRADA') days[key]!.Entradas += m.cantidad
        else days[key]!.Salidas += m.cantidad
      }
    })
    return Object.values(days)
  }, [movimientos])

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting()}, {(displayName || 'Usuario').split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Aquí tienes el resumen de tu inventario.</p>
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
              <p className="mt-1 text-xs text-muted-foreground">requieren reposición</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Categorías activas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-green-600">{totalCategorias}</p>
              <p className="mt-1 text-xs text-muted-foreground">en inventario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Movimientos recientes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-amber-600">{movimientos.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">últimas entradas/salidas</p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos de stock — últimos 7 días</CardTitle>
            <CardDescription>Entradas y salidas registradas por día</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <AreaChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
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
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Últimos movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`space-y-3 ${movimientos.length > 5 ? 'max-h-[360px] overflow-y-auto pr-1' : ''}`}>
                {movimientosPreview.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay movimientos recientes.</p>
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
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
