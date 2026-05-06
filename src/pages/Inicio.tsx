import { AlertCircle, ArrowDown, ArrowUp, PackageSearch } from 'lucide-react'
import { useInventarioDashboard } from '@/hooks/useInventarioDashboard'

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

export default function Inicio() {
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

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl text-sm text-gray-500">Cargando resumen del inventario...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Inicio</h1>
          <p className="mt-1 text-sm text-gray-500">Resumen del inventario</p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Valor total inventario</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(valorTotal)}</p>
            <p className="mt-1 text-xs text-gray-500">{totalProductos} productos</p>
          </article>

          <article className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Productos stock bajo</p>
            <p className={`mt-2 text-2xl font-semibold ${productosStockBajo.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {productosStockBajo.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">requieren reposicion</p>
          </article>

          <article className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Categorias activas</p>
            <p className="mt-2 text-2xl font-semibold text-green-600">{totalCategorias}</p>
            <p className="mt-1 text-xs text-gray-500">en inventario</p>
          </article>

          <article className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Movimientos recientes</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{movimientos.length}</p>
            <p className="mt-1 text-xs text-gray-500">ultimas entradas/salidas</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className="rounded-lg border bg-white p-4 lg:col-span-2">
            <h2 className="text-base font-semibold text-gray-900">Ultimos movimientos</h2>
            <div className={`mt-4 space-y-3 ${movimientos.length > 5 ? 'max-h-[360px] overflow-y-auto pr-1' : ''}`}>
              {movimientosPreview.length === 0 ? (
                <p className="text-sm text-gray-500">No hay movimientos recientes.</p>
              ) : (
                movimientosPreview.map((movimiento) => {
                  const isEntrada = movimiento.tipo === 'ENTRADA'
                  return (
                    <div
                      key={movimiento.id}
                      className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
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
                          <p className="text-sm font-medium text-gray-900">{movimiento.productoNombre}</p>
                          <p className="text-xs text-gray-500">{movimiento.productoSku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                          {isEntrada ? '+' : '-'}
                          {Math.abs(movimiento.cantidad)}
                        </p>
                        <p className="text-xs text-gray-500">{formatRelativeTime(movimiento.fecha)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </article>

          <article className="rounded-lg border bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">Alertas de stock bajo</h2>
            <div className={`mt-4 space-y-3 ${productosStockBajo.length > 5 ? 'max-h-[360px] overflow-y-auto pr-1' : ''}`}>
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
                      className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{producto.nombre}</p>
                        <p className="text-xs text-gray-500">{producto.sku}</p>
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
          </article>
        </section>
      </div>
    </div>
  )
}
