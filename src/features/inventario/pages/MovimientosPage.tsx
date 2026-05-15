import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getMovimientos } from '@/features/inventario/api/movimiento'
import { getProductos } from '@/features/productos/api/producto'
import type { MovimientoStock } from '@/features/inventario/types/movimiento'
import type { Producto } from '@/features/productos/types/producto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFormatters } from '@/lib/useFormatters'

const PAGE_SIZE = 20
const MIN_DATE = '2000-01-01'
const MAX_DATE = '2100-12-31'

const formatReason = (reason: string) => {
  const reasonLabels: Record<string, string> = {
    SALE: 'Venta',
    PURCHASE: 'Compra',
    ADJUSTMENT: 'Ajuste',
    RETURN: 'Devolucion',
    DAMAGE: 'Dano',
    INITIAL: 'Inicial',
  }
  return reasonLabels[reason] ?? reason
}

export default function MovimientosPage() {
  const { timeZone, formatDate, toUserDayKey } = useFormatters()
  const [productos, setProductos] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [productId, setProductId] = useState('all')
  const [tipo, setTipo] = useState<'all' | 'ENTRADA' | 'SALIDA'>('all')
  const [razon, setRazon] = useState('all')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [offset, setOffset] = useState(0)
  const [debouncedFilters, setDebouncedFilters] = useState({
    productId: 'all',
    tipo: 'all' as 'all' | 'ENTRADA' | 'SALIDA',
    razon: 'all',
    desde: '',
    hasta: '',
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const hasActiveFilters =
    productId !== 'all' || tipo !== 'all' || razon !== 'all' || Boolean(desde) || Boolean(hasta)
  const invalidDateRange = Boolean(desde && hasta && desde > hasta)
  const invalidYear = Boolean(
    (desde && (desde < MIN_DATE || desde > MAX_DATE)) ||
    (hasta && (hasta < MIN_DATE || hasta > MAX_DATE))
  )
  const debouncedInvalidDateRange = Boolean(
    debouncedFilters.desde && debouncedFilters.hasta && debouncedFilters.desde > debouncedFilters.hasta
  )
  const debouncedInvalidYear = Boolean(
    (debouncedFilters.desde &&
      (debouncedFilters.desde < MIN_DATE || debouncedFilters.desde > MAX_DATE)) ||
    (debouncedFilters.hasta &&
      (debouncedFilters.hasta < MIN_DATE || debouncedFilters.hasta > MAX_DATE))
  )

  const loadProductos = async () => {
    try {
      const data = await getProductos()
      setProductos(data)
    } catch {
      toast.error('No se pudieron cargar los productos')
    }
  }

  const loadMovimientos = async () => {
    if (debouncedInvalidDateRange || debouncedInvalidYear) {
      setMovimientos([])
      setTotal(0)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await getMovimientos({
        productId: debouncedFilters.productId === 'all' ? undefined : Number(debouncedFilters.productId),
        tipo: debouncedFilters.tipo === 'all' ? undefined : debouncedFilters.tipo,
        razon: debouncedFilters.razon === 'all' ? undefined : debouncedFilters.razon,
        desde: debouncedFilters.desde || undefined,
        hasta: debouncedFilters.hasta || undefined,
        limit: PAGE_SIZE,
        offset,
      })
      setMovimientos(data.content)
      setTotal(data.total)
    } catch {
      toast.error('No se pudieron cargar los movimientos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProductos()
  }, [])

  useEffect(() => {
    void loadMovimientos()
  }, [debouncedFilters, offset, debouncedInvalidDateRange, debouncedInvalidYear])

  useEffect(() => {
    setOffset(0)
  }, [productId, tipo, razon, desde, hasta])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({ productId, tipo, razon, desde, hasta })
    }, 350)
    return () => clearTimeout(timer)
  }, [productId, tipo, razon, desde, hasta])

  const reasons = useMemo(
    () => ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'INITIAL'],
    []
  )

  const resetFilters = () => {
    setProductId('all')
    setTipo('all')
    setRazon('all')
    setDesde('')
    setHasta('')
    setOffset(0)
  }

  const formatMovementDate = (value: string) => {
    const date = new Date(value)
    const now = new Date()
    const dayKey = toUserDayKey(date)
    const todayKey = toUserDayKey(now)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayKey = toUserDayKey(yesterday)
    const time = new Intl.DateTimeFormat('es-ES', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)

    if (dayKey === todayKey) return `Hoy, ${time}`
    if (dayKey === yesterdayKey) return `Ayer, ${time}`
    return `${formatDate(date)}, ${time}`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="min-w-0 space-y-1 xl:col-span-3">
            <p className="text-xs font-medium text-muted-foreground">Producto</p>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Selecciona producto" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="max-h-80"
                viewportClassName="max-h-80 overflow-y-auto"
              >
                <SelectItem value="all">Todos los productos</SelectItem>
                {productos.map((product) => (
                  <SelectItem key={product.id} value={String(product.id)}>
                    {product.nombre} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1 xl:col-span-1">
            <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Tipo</p>
            <Select value={tipo} onValueChange={(value) => setTipo(value as 'all' | 'ENTRADA' | 'SALIDA')}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SALIDA">Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1 xl:col-span-2">
            <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Razon</p>
            <Select value={razon} onValueChange={setRazon}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Selecciona razon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {reasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {formatReason(reason)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1 xl:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Desde (fecha)</p>
            <Input
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-1 xl:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Hasta (fecha)</p>
            <Input
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-1 xl:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Acciones</p>
            <Button className="w-full" variant="outline" onClick={resetFilters}>Limpiar filtros</Button>
          </div>
        </div>

        {invalidDateRange && (
          <p className="text-sm text-red-600">El rango de fechas no es valido: "desde" no puede ser mayor que "hasta".</p>
        )}
        {invalidYear && (
          <p className="text-sm text-red-600">El ano debe estar entre 2000 y 2100.</p>
        )}

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Razon</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando movimientos...</TableCell>
                </TableRow>
              ) : movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {hasActiveFilters ? 'No hay movimientos para los filtros seleccionados.' : 'Aun no hay movimientos registrados.'}
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((movimiento) => (
                  <TableRow key={movimiento.id}>
                    <TableCell>{formatMovementDate(movimiento.fecha)}</TableCell>
                    <TableCell>{movimiento.productoNombre}</TableCell>
                    <TableCell className="font-mono text-xs">{movimiento.productoSku}</TableCell>
                    <TableCell>
                      <span className={movimiento.tipo === 'ENTRADA' ? 'text-green-500' : 'text-red-500'}>
                        {movimiento.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                      </span>
                    </TableCell>
                    <TableCell>{formatReason(movimiento.razon)}</TableCell>
                    <TableCell className="text-center">{movimiento.cantidad}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Pagina {currentPage} de {totalPages} - {total} registros</p>
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
      </div>
    </div>
  )
}
