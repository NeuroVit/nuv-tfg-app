import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { getMovimientos } from '@/api/movimiento'
import { getProductos } from '@/api/producto'
import type { MovimientoStock } from '@/types/movimiento'
import type { Producto } from '@/types/producto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 20
const MIN_DATE = '2000-01-01'
const MAX_DATE = '2100-12-31'

const formatDate = (value: string) => new Date(value).toLocaleString('es-ES')
const formatReason = (reason: string) => {
  const reasonLabels: Record<string, string> = {
    SALE: 'Venta',
    PURCHASE: 'Compra',
    ADJUSTMENT: 'Ajuste',
    RETURN: 'Devolución',
    DAMAGE: 'Daño',
    INITIAL: 'Inicial',
  }
  return reasonLabels[reason] ?? reason
}

export default function MovimientosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
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
    () => ['SALE', 'PURCHASE', 'RETURN', 'DAMAGE'],
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

  useEffect(() => {
    const product = searchParams.get('productId')
    const tipoParam = searchParams.get('tipo')
    const razonParam = searchParams.get('razon')
    const desdeParam = searchParams.get('desde')
    const hastaParam = searchParams.get('hasta')
    if (product) setProductId(product)
    if (tipoParam === 'all' || tipoParam === 'ENTRADA' || tipoParam === 'SALIDA') setTipo(tipoParam)
    if (razonParam) setRazon(razonParam)
    if (desdeParam) setDesde(desdeParam)
    if (hastaParam) setHasta(hastaParam)
    // Hidratación inicial desde URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (productId !== 'all') next.set('productId', productId)
    else next.delete('productId')
    if (tipo !== 'all') next.set('tipo', tipo)
    else next.delete('tipo')
    if (razon !== 'all') next.set('razon', razon)
    else next.delete('razon')
    if (desde) next.set('desde', desde)
    else next.delete('desde')
    if (hasta) next.set('hasta', hasta)
    else next.delete('hasta')

    const prevSerialized = searchParams.toString()
    const nextSerialized = next.toString()
    if (prevSerialized !== nextSerialized) {
      setSearchParams(next, { replace: true })
    }
  }, [desde, hasta, productId, razon, searchParams, setSearchParams, tipo])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Movimientos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Histórico completo de entradas y salidas de stock.</p>
        </div>

        {invalidDateRange ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            El rango de fechas no es válido: "Desde" no puede ser mayor que "Hasta".
          </div>
        ) : null}
        {invalidYear ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Las fechas deben estar dentro del rango permitido ({MIN_DATE} a {MAX_DATE}).
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="min-w-0 space-y-1 xl:col-span-3">
            <p className="text-xs font-medium text-muted-foreground">Producto</p>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Selecciona producto" />
              </SelectTrigger>
              <SelectContent>
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
            <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Razón</p>
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

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Cargando movimientos...</TableCell>
                </TableRow>
              ) : movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {hasActiveFilters ? 'No hay movimientos para los filtros seleccionados.' : 'Aún no hay movimientos registrados.'}
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((movimiento) => (
                  <TableRow key={movimiento.id}>
                    <TableCell>{formatDate(movimiento.fecha)}</TableCell>
                    <TableCell>{movimiento.productoNombre}</TableCell>
                    <TableCell className="font-mono text-xs">{movimiento.productoSku}</TableCell>
                    <TableCell>
                      <span className={movimiento.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-700'}>
                        {movimiento.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                      </span>
                    </TableCell>
                    <TableCell>{formatReason(movimiento.razon)}</TableCell>
                    <TableCell>{movimiento.cantidad}</TableCell>
                    <TableCell>{movimiento.notas ?? '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} · {total} registros · mostrando {movimientos.length}
          </p>
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
