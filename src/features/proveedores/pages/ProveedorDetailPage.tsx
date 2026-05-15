import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { getProveedorDetalle } from '@/features/proveedores/api/provider'
import type { ProveedorDetalle } from '@/features/proveedores/types/proveedorDetalle'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const pct = (value: number) => `${Math.round(value * 100)}%`
const euro = (value: number) => `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`

export default function ProveedorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<ProveedorDetalle | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const data = await getProveedorDetalle(Number(id))
        setDetalle(data)
      } catch {
        toast.error('No se pudo cargar el detalle del proveedor')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl text-sm text-muted-foreground">Cargando detalle del proveedor...</div>
      </div>
    )
  }

  if (!detalle) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <p className="text-sm text-muted-foreground">No se encontró el proveedor solicitado.</p>
          <Button variant="outline" onClick={() => navigate('/proveedores')}>Volver</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{detalle.proveedor.nombre}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{detalle.proveedor.ubicacionAlmacen} · Lead time: {detalle.proveedor.diasEntrega} días</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/pedidos?providerId=${detalle.proveedor.id}`)}>Ver pedidos</Button>
            <Button variant="outline" onClick={() => navigate(`/proveedores?providerId=${detalle.proveedor.id}`)}>Volver</Button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total pedidos</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{detalle.kpis.totalPedidos}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pedidos activos</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{detalle.kpis.pedidosActivos}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pedidos recibidos</p>
            <p className="mt-2 text-2xl font-semibold text-green-700">{detalle.kpis.pedidosRecibidos}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Fill rate</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{pct(detalle.kpis.fillRate)}</p>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">On-time rate</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{pct(detalle.kpis.onTimeRate)}</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">Productos del proveedor</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalle.productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No hay productos asociados.</TableCell>
                  </TableRow>
                ) : (
                  detalle.productos.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell className={product.stockBajo ? 'font-semibold text-red-700' : ''}>{product.cantidadActual}</TableCell>
                      <TableCell>{product.nivelMinimoStock}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">Pedidos recientes</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalle.pedidosRecientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No hay pedidos recientes.</TableCell>
                  </TableRow>
                ) : (
                  detalle.pedidosRecientes.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.id}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{order.totalItems}</TableCell>
                      <TableCell>{order.totalUnidades}</TableCell>
                      <TableCell>{euro(order.importeEstimado)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  )
}
