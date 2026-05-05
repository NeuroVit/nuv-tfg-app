import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getClientes } from '@/api/cliente'
import { getProductos } from '@/api/producto'
import { crearVenta, getVentas } from '@/api/venta'
import type { Cliente } from '@/types/cliente'
import type { Producto } from '@/types/producto'
import type { Venta } from '@/types/venta'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type SaleItemForm = {
  productId: string
  quantity: number
}

const euro = (value: number) => `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`

export default function VentasPage() {
  const { hasRole } = useAuthStore()
  const canCreate = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [clients, setClients] = useState<Cliente[]>([])
  const [products, setProducts] = useState<Producto[]>([])
  const [sales, setSales] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<SaleItemForm[]>([{ productId: '', quantity: 1 }])

  const [filterClientId, setFilterClientId] = useState('all')

  const activeClients = useMemo(() => clients.filter((client) => client.activo), [clients])

  const loadData = async () => {
    setLoading(true)
    try {
      const [clientData, productData, salesData] = await Promise.all([
        getClientes(true),
        getProductos(),
        getVentas(),
      ])
      setClients(clientData)
      setProducts(productData)
      setSales(salesData)
    } catch {
      toast.error('No se pudieron cargar las ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredSales = useMemo(() => {
    if (filterClientId === 'all') return sales
    return sales.filter((sale) => String(sale.clientId) === filterClientId)
  }, [sales, filterClientId])

  const addItem = () => setItems((prev) => [...prev, { productId: '', quantity: 1 }])

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [{ productId: '', quantity: 1 }]
    })
  }

  const updateItem = (index: number, patch: Partial<SaleItemForm>) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const submitSale = async () => {
    if (!canCreate) return
    const clientId = Number(selectedClientId)
    if (!clientId) {
      toast.error('Selecciona un cliente')
      return
    }

    const payloadItems = items
      .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
      .filter((item) => !Number.isNaN(item.productId) && item.quantity > 0)

    if (payloadItems.length === 0) {
      toast.error('Añade al menos un producto')
      return
    }

    if (new Set(payloadItems.map((item) => item.productId)).size !== payloadItems.length) {
      toast.error('No puedes repetir productos')
      return
    }

    try {
      await crearVenta({
        clientId,
        notas: notes.trim() || undefined,
        items: payloadItems,
      })
      toast.success('Venta creada correctamente')
      setSelectedClientId('')
      setNotes('')
      setItems([{ productId: '', quantity: 1 }])
      await loadData()
    } catch {
      toast.error('No se pudo crear la venta')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro de ventas y descarga automática de stock.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 xl:col-span-1">
            <h2 className="text-sm font-semibold text-foreground">Nueva venta</h2>
            <div className="mt-4 space-y-3">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona cliente" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>{client.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input placeholder="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} />

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_90px_auto] gap-2">
                    <Select value={item.productId} onValueChange={(value) => updateItem(index, { productId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.nombre} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                    />
                    <Button variant="outline" onClick={() => removeItem(index)}>Quitar</Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={addItem}>Añadir línea</Button>
                <Button onClick={() => void submitSale()} disabled={!canCreate}>Crear venta</Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card xl:col-span-2">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Historial de ventas</h2>
              <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filtrar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>{client.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Cargando ventas...</TableCell></TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay ventas para mostrar.</TableCell></TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>#{sale.id}</TableCell>
                      <TableCell>{sale.clientName}</TableCell>
                      <TableCell>{new Date(sale.soldAt).toLocaleString('es-ES')}</TableCell>
                      <TableCell>{sale.items.length}</TableCell>
                      <TableCell>{euro(sale.totalAmount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
