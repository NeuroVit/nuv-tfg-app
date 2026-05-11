import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type SaleItemForm = {
  productId: string
  quantity: number
}

const PAGE_SIZE = 20
const euro = (value: number) => `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`

export default function VentasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null)
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    const clientId = searchParams.get('clientId')
    const q = searchParams.get('q')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (clientId) setFilterClientId(clientId)
    if (q) setSearch(q)
    if (from) setFromDate(from)
    if (to) setToDate(to)
    // Hidrata filtros desde URL en primer render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (filterClientId !== 'all') next.set('clientId', filterClientId)
    else next.delete('clientId')
    if (search.trim()) next.set('q', search.trim())
    else next.delete('q')
    if (fromDate) next.set('from', fromDate)
    else next.delete('from')
    if (toDate) next.set('to', toDate)
    else next.delete('to')

    const prevSerialized = searchParams.toString()
    const nextSerialized = next.toString()
    if (prevSerialized !== nextSerialized) {
      setSearchParams(next, { replace: true })
    }
  }, [filterClientId, fromDate, search, searchParams, setSearchParams, toDate])

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sales.filter((sale) => {
      const clientOk = filterClientId === 'all' || String(sale.clientId) === filterClientId
      const textOk =
        !term ||
        String(sale.id).includes(term) ||
        (sale.notas ?? '').toLowerCase().includes(term)
      const soldDate = sale.soldAt.slice(0, 10)
      const fromOk = !fromDate || soldDate >= fromDate
      const toOk = !toDate || soldDate <= toDate
      return clientOk && textOk && fromOk && toOk
    })
  }, [filterClientId, fromDate, sales, search, toDate])

  const openDetail = (sale: Venta) => {
    setSelectedSale(sale)
    setDetailOpen(true)
  }

  const total = filteredSales.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedSales = useMemo(
    () => filteredSales.slice(offset, offset + PAGE_SIZE),
    [filteredSales, offset]
  )

  useEffect(() => {
    setOffset(0)
  }, [filterClientId, search, fromDate, toDate])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  const openModal = () => {
    setSelectedClientId('')
    setNotes('')
    setItems([{ productId: '', quantity: 1 }])
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedClientId('')
    setNotes('')
    setItems([{ productId: '', quantity: 1 }])
  }

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

    setSaving(true)
    try {
      await crearVenta({
        clientId,
        notas: notes.trim() || undefined,
        items: payloadItems,
      })
      toast.success('Venta creada correctamente')
      closeModal()
      await loadData()
    } catch {
      toast.error('No se pudo crear la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterClientId} onValueChange={setFilterClientId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={String(client.id)}>{client.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ID o notas"
            className="w-56"
          />
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-44" />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-44" />
          <div className="ml-auto flex gap-2">
            {canCreate && <Button onClick={openModal}>+ Nueva venta</Button>}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">ID</TableHead>
                <TableHead className="text-center">Cliente</TableHead>
                <TableHead className="text-center">Fecha</TableHead>
                <TableHead className="text-center">Artículos</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando ventas...</TableCell></TableRow>
              ) : paginatedSales.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay ventas para mostrar.</TableCell></TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow key={sale.id} className="cursor-pointer hover:bg-accent" onClick={() => openDetail(sale)}>
                    <TableCell className="text-center align-middle">#{sale.id}</TableCell>
                    <TableCell className="text-center align-middle">{sale.clientName}</TableCell>
                    <TableCell className="text-center align-middle">{new Date(sale.soldAt).toLocaleString('es-ES')}</TableCell>
                    <TableCell className="text-center align-middle">{sale.items.length}</TableCell>
                    <TableCell className="text-center align-middle">
                      {sale.items.reduce((totalQuantity, item) => totalQuantity + item.quantity, 0)}
                    </TableCell>
                    <TableCell className="text-center align-middle">{euro(sale.totalAmount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

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
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva venta</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cliente" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={6} viewportClassName="max-h-[360px] overflow-y-auto">
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
                    <SelectContent position="popper" sideOffset={6} viewportClassName="max-h-[360px] overflow-y-auto">
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
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, '')
                      const normalized = digitsOnly.replace(/^0+(?=\d)/, '')
                      const nextQuantity = normalized === '' ? 1 : Number(normalized)
                      updateItem(index, { quantity: nextQuantity })
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => event.currentTarget.select()}
                    onMouseUp={(event) => event.preventDefault()}
                    onBlur={() => {
                      if (!Number.isFinite(item.quantity) || item.quantity < 1) {
                        updateItem(index, { quantity: 1 })
                      }
                    }}
                  />
                  <Button variant="outline" onClick={() => removeItem(index)}>Quitar</Button>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addItem}>+ Añadir línea</Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={() => void submitSale()} disabled={saving || !canCreate}>
              {saving ? 'Guardando...' : 'Crear venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de venta #{selectedSale?.id}</DialogTitle>
          </DialogHeader>
          {!selectedSale ? (
            <p className="text-sm text-muted-foreground">No se encontró la venta seleccionada.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
                <p><span className="text-muted-foreground">Cliente:</span> {selectedSale.clientName}</p>
                <p><span className="text-muted-foreground">Fecha:</span> {new Date(selectedSale.soldAt).toLocaleString('es-ES')}</p>
                <p><span className="text-muted-foreground">Subtotal:</span> {euro(selectedSale.subtotalAmount ?? selectedSale.totalAmount)}</p>
                <p><span className="text-muted-foreground">Descuento:</span> {euro(selectedSale.discountTotalAmount ?? 0)}</p>
                <p><span className="text-muted-foreground">Descuento global:</span> {(selectedSale.globalDiscountPct ?? 0).toFixed(2)}%</p>
                <p><span className="text-muted-foreground">Total:</span> {euro(selectedSale.totalAmount)}</p>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio unitario</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item) => (
                      <TableRow key={`${selectedSale.id}-${item.productId}`}>
                        <TableCell>{item.productoNombre}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{euro(item.unitPriceSnapshot)}</TableCell>
                        <TableCell>{euro(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedSale.notas ? (
                <div className="rounded-md border p-3 text-sm">
                  <span className="text-muted-foreground">Notas:</span> {selectedSale.notas}
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
