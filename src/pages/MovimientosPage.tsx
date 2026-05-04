import { useEffect, useMemo, useState } from 'react'
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

const formatDate = (value: string) => new Date(value).toLocaleString('es-ES')

export default function MovimientosPage() {
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const loadProductos = async () => {
    try {
      const data = await getProductos()
      setProductos(data)
    } catch {
      toast.error('No se pudieron cargar los productos')
    }
  }

  const loadMovimientos = async () => {
    setLoading(true)
    try {
      const data = await getMovimientos({
        productId: productId === 'all' ? undefined : Number(productId),
        tipo: tipo === 'all' ? undefined : tipo,
        razon: razon === 'all' ? undefined : razon,
        desde: desde || undefined,
        hasta: hasta || undefined,
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
  }, [productId, tipo, razon, desde, hasta, offset])

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
          <p className="mt-1 text-sm text-gray-500">Histórico completo de entradas y salidas de stock.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Producto" />
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

          <Select value={tipo} onValueChange={(value) => setTipo(value as 'all' | 'ENTRADA' | 'SALIDA')}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ENTRADA">Entrada</SelectItem>
              <SelectItem value="SALIDA">Salida</SelectItem>
            </SelectContent>
          </Select>

          <Select value={razon} onValueChange={setRazon}>
            <SelectTrigger>
              <SelectValue placeholder="Razón" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {reasons.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
          <Button variant="outline" onClick={resetFilters}>Limpiar filtros</Button>
        </div>

        <div className="rounded-lg border bg-white">
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
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">Cargando movimientos...</TableCell>
                </TableRow>
              ) : movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-400">No hay movimientos para los filtros seleccionados.</TableCell>
                </TableRow>
              ) : (
                movimientos.map((movimiento) => (
                  <TableRow key={movimiento.id}>
                    <TableCell>{formatDate(movimiento.fecha)}</TableCell>
                    <TableCell>{movimiento.productoNombre}</TableCell>
                    <TableCell className="font-mono text-xs">{movimiento.productoSku}</TableCell>
                    <TableCell>
                      <span className={movimiento.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-700'}>{movimiento.tipo}</span>
                    </TableCell>
                    <TableCell>{movimiento.razon}</TableCell>
                    <TableCell>{movimiento.cantidad}</TableCell>
                    <TableCell>{movimiento.notas ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Página {currentPage} de {totalPages} · {total} registros</p>
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
