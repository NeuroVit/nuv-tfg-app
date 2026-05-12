import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Check, Eye, MoreHorizontal, PackagePlus, Plus, Send, X } from 'lucide-react'
import {
  cancelarPedidoProveedor,
  crearPedidoProveedor,
  enviarPedidoProveedor,
  getPedidosProveedor,
  recibirPedidoProveedor,
} from '@/api/providerOrder'
import { getProveedores } from '@/api/provider'
import { getProductos } from '@/api/producto'
import type { Producto } from '@/types/producto'
import type { PedidoProveedor, Proveedor } from '@/types/provider'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { parseApiError } from '@/lib/apiError'

type OrderItemForm = {
  productoId: string
  cantidad: number
  precioUnitario: number
}

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-ES') : 'â€”'
const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-ES') : 'â€”'
const formatDateTimeNoSeconds = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'â€”'

const statusLabelMap: Record<PedidoProveedor['status'], string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  RECEIVED: 'Recibido',
  CANCELLED: 'Cancelado',
}

const toDateInputValue = (date: Date) => date.toISOString().split('T')[0]

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProviderId = Number(searchParams.get('providerId')) || null

  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [providers, setProviders] = useState<Proveedor[]>([])
  const [products, setProducts] = useState<Producto[]>([])
  const [orders, setOrders] = useState<PedidoProveedor[]>([])

  const [loadingProviders, setLoadingProviders] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'>('all')

  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<PedidoProveedor | null>(null)
  const [orderArrivalDate, setOrderArrivalDate] = useState<string>(toDateInputValue(new Date()))
  const [orderNotes, setOrderNotes] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([{ productoId: '', cantidad: 1, precioUnitario: 0 }])
  const [creatingOrder, setCreatingOrder] = useState(false)

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId]
  )

  const providerProducts = useMemo(() => {
    if (!selectedProvider) return []
    return products.filter((product) => product.providerId === selectedProvider.id)
  }, [products, selectedProvider])

  const recommendedOrderDate = useMemo(() => {
    if (!selectedProvider) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(today.getDate() + selectedProvider.diasEntrega)
    return toDateInputValue(today)
  }, [selectedProvider])

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase()
    return orders.filter((order) => {
      const statusOk = orderStatusFilter === 'all' || order.status === orderStatusFilter
      const textOk =
        !term ||
        String(order.id).includes(term) ||
        order.status.toLowerCase().includes(term) ||
        (order.notas ?? '').toLowerCase().includes(term)
      return statusOk && textOk
    })
  }, [orders, orderSearch, orderStatusFilter])

  const orderSummary = useMemo(() => {
    return {
      total: filteredOrders.length,
      DRAFT: filteredOrders.filter((order) => order.status === 'DRAFT').length,
      SENT: filteredOrders.filter((order) => order.status === 'SENT').length,
      RECEIVED: filteredOrders.filter((order) => order.status === 'RECEIVED').length,
      CANCELLED: filteredOrders.filter((order) => order.status === 'CANCELLED').length,
    }
  }, [filteredOrders])

  const computeDelayDays = (order: PedidoProveedor): number | null => {
    if (!order.recibidoEn || !order.fechaLlegadaDeseada) return null
    const desired = new Date(order.fechaLlegadaDeseada)
    const received = new Date(order.recibidoEn)
    if (Number.isNaN(desired.getTime()) || Number.isNaN(received.getTime())) return null
    const diffMs = received.getTime() - desired.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  const loadProviders = async () => {
    setLoadingProviders(true)
    try {
      const data = await getProveedores(true)
      setProviders(data)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudieron cargar los proveedores'))
    } finally {
      setLoadingProviders(false)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await getProductos()
      setProducts(data)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudieron cargar los productos'))
    }
  }

  const loadOrders = async (providerId: number) => {
    setLoadingOrders(true)
    try {
      const data = await getPedidosProveedor(providerId)
      setOrders(data)
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudieron cargar los pedidos'))
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    void Promise.all([loadProviders(), loadProducts()])
  }, [])

  useEffect(() => {
    if (!selectedProviderId) {
      setOrders([])
      return
    }
    void loadOrders(selectedProviderId)
  }, [selectedProviderId])

  const onChangeProvider = (value: string) => {
    setSearchParams({ providerId: value })
  }

  const resetOrderForm = () => {
    setOrderArrivalDate(toDateInputValue(new Date()))
    setOrderNotes('')
    setOrderItems([{ productoId: '', cantidad: 1, precioUnitario: 0 }])
  }

  const openCreateOrder = () => {
    resetOrderForm()
    setOrderDialogOpen(true)
  }

  const openOrderDetail = (order: PedidoProveedor) => {
    setDetailOrder(order)
    setDetailDialogOpen(true)
  }

  const addOrderItem = () => {
    setOrderItems((current) => [...current, { productoId: '', cantidad: 1, precioUnitario: 0 }])
  }

  const removeOrderItem = (index: number) => {
    setOrderItems((current) => {
      const next = current.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [{ productoId: '', cantidad: 1, precioUnitario: 0 }]
    })
  }

  const updateOrderItem = (index: number, patch: Partial<OrderItemForm>) => {
    setOrderItems((current) => current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const submitOrder = async () => {
    if (!selectedProvider) return

    const items = orderItems
      .map((item) => ({
        productoId: Number(item.productoId),
        cantidad: Number(item.cantidad),
        precioUnitario: Number(item.precioUnitario),
      }))
      .filter((item) => !Number.isNaN(item.productoId))

    if (items.length === 0) {
      toast.error('Debes seleccionar al menos un producto')
      return
    }
    if (items.some((item) => item.cantidad < 1)) {
      toast.error('La cantidad debe ser mayor o igual a 1')
      return
    }
    if (items.some((item) => !Number.isFinite(item.precioUnitario) || item.precioUnitario <= 0)) {
      toast.error('El precio unitario debe ser mayor a 0')
      return
    }

    const ids = items.map((item) => item.productoId)
    if (new Set(ids).size !== ids.length) {
      toast.error('No puedes repetir productos en el mismo pedido')
      return
    }

    setCreatingOrder(true)
    try {
      await crearPedidoProveedor(selectedProvider.id, {
        fechaLlegadaDeseada: orderArrivalDate,
        notas: orderNotes.trim() || undefined,
        items,
      })
      setOrderDialogOpen(false)
      await Promise.all([loadOrders(selectedProvider.id), loadProducts()])
      toast.success('Pedido creado en estado DRAFT')
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo crear el pedido'))
    } finally {
      setCreatingOrder(false)
    }
  }

  const updateOrderStatus = async (order: PedidoProveedor, action: 'send' | 'receive' | 'cancel') => {
    try {
      if (action === 'send') {
        await enviarPedidoProveedor(order.id)
      } else if (action === 'receive') {
        await recibirPedidoProveedor(order.id)
      } else {
        await cancelarPedidoProveedor(order.id)
      }
      if (selectedProvider) {
        await Promise.all([loadOrders(selectedProvider.id), loadProducts()])
      }
      toast.success('Pedido actualizado correctamente')
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo actualizar el pedido'))
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <h1 className="shrink-0 text-2xl font-bold text-foreground">Pedidos</h1>
          <Select
            value={selectedProviderId ? String(selectedProviderId) : ''}
            onValueChange={onChangeProvider}
            disabled={loadingProviders}
          >
            <SelectTrigger className="w-full xl:ml-4 xl:w-72">
              <SelectValue placeholder="Selecciona un proveedor" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={String(provider.id)}>
                  {provider.nombre} {!provider.activo ? '(Archivado)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar por ID, estado o notas..."
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
            className="w-full xl:w-80"
            disabled={!selectedProvider}
          />

          <Select
            value={orderStatusFilter}
            onValueChange={(value) =>
              setOrderStatusFilter(value as 'all' | 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED')
            }
            disabled={!selectedProvider}
          >
            <SelectTrigger className="w-full xl:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="SENT">Enviado</SelectItem>
              <SelectItem value="RECEIVED">Recibido</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          {canEdit && selectedProvider?.activo && (
            <Button className="w-full xl:ml-auto xl:w-auto" onClick={openCreateOrder}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Crear pedido
            </Button>
          )}
        </div>

        {!selectedProvider ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Selecciona un proveedor para ver sus pedidos.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <div className="rounded-lg border bg-card p-3 text-sm"><span className="text-muted-foreground">Total</span><p className="text-xl font-semibold">{orderSummary.total}</p></div>
              <div className="rounded-lg border bg-card p-3 text-sm"><span className="text-muted-foreground">Borrador</span><p className="text-xl font-semibold">{orderSummary.DRAFT}</p></div>
              <div className="rounded-lg border bg-card p-3 text-sm"><span className="text-muted-foreground">Enviados</span><p className="text-xl font-semibold">{orderSummary.SENT}</p></div>
              <div className="rounded-lg border bg-card p-3 text-sm"><span className="text-muted-foreground">Recibidos</span><p className="text-xl font-semibold">{orderSummary.RECEIVED}</p></div>
              <div className="rounded-lg border bg-card p-3 text-sm"><span className="text-muted-foreground">Cancelados</span><p className="text-xl font-semibold">{orderSummary.CANCELLED}</p></div>
            </div>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Llegada deseada</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Recibido</TableHead>
                    <TableHead className="w-16 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOrders ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Cargando pedidos...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No hay pedidos para mostrar con los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'CANCELLED' ? 'secondary' : order.status === 'RECEIVED' ? 'default' : 'outline'}>
                            {statusLabelMap[order.status] ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(order.fechaLlegadaDeseada)}</TableCell>
                        <TableCell>{formatDate(order.creadoEn)}</TableCell>
                        <TableCell>
                          {formatDateTimeNoSeconds(order.recibidoEn)}
                          {computeDelayDays(order) !== null ? (
                            <span className={`ml-2 text-xs ${computeDelayDays(order)! > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {computeDelayDays(order)! > 0 ? `Retraso: +${computeDelayDays(order)}d` : 'En plazo'}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Acciones de pedido">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem onSelect={() => openOrderDetail(order)}>
                                <Eye className="h-4 w-4" />
                                Ver detalle
                              </DropdownMenuItem>
                              {canEdit && order.status === 'DRAFT' && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    void updateOrderStatus(order, 'send')
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                  Enviar pedido
                                </DropdownMenuItem>
                              )}
                              {canEdit && order.status === 'SENT' && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    void updateOrderStatus(order, 'receive')
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                  Marcar recibido
                                </DropdownMenuItem>
                              )}
                              {canEdit && (order.status === 'DRAFT' || order.status === 'SENT') && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => {
                                    void updateOrderStatus(order, 'cancel')
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                  Cancelar pedido
                                </DropdownMenuItem>
                              )}
                              {!canEdit && <DropdownMenuItem disabled>Sin acciones disponibles</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear pedido para {selectedProvider?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha de llegada deseada</Label>
                <Input
                  type="date"
                  value={orderArrivalDate}
                  onChange={(event) => setOrderArrivalDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de pedido recomendada</Label>
                <Input value={recommendedOrderDate ?? 'â€”'} readOnly />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                rows={2}
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <Button variant="outline" size="sm" onClick={addOrderItem}>
                  <Plus className="mr-1 h-4 w-4" />
                  AÃ±adir lÃ­nea
                </Button>
              </div>
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-[1fr_130px_150px_auto]"
                >
                  <Select
                    value={item.productoId}
                    onValueChange={(value) => {
                      const selectedProduct = providerProducts.find((product) => String(product.id) === value)
                      updateOrderItem(index, {
                        productoId: value,
                        precioUnitario: selectedProduct?.costoUnitario ?? selectedProduct?.precioUnitario ?? 0,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerProducts.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.nombre} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(event) =>
                      updateOrderItem(index, { cantidad: Number(event.target.value) })
                    }
                  />
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.precioUnitario}
                    onChange={(event) =>
                      updateOrderItem(index, { precioUnitario: Number(event.target.value) })
                    }
                    placeholder="Coste unitario (â‚¬)"
                  />
                  <Button
                    variant="outline"
                    onClick={() => removeOrderItem(index)}
                    disabled={orderItems.length === 1}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submitOrder()} disabled={creatingOrder}>
              {creatingOrder ? 'Creando...' : 'Crear pedido (DRAFT)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle pedido #{detailOrder?.id}</DialogTitle>
          </DialogHeader>
          {!detailOrder ? (
            <p className="text-sm text-muted-foreground">Pedido no disponible.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
                <p><span className="text-muted-foreground">Proveedor:</span> {detailOrder.providerNombre}</p>
                <p><span className="text-muted-foreground">Estado:</span> {statusLabelMap[detailOrder.status] ?? detailOrder.status}</p>
                <p><span className="text-muted-foreground">Llegada deseada:</span> {detailOrder.fechaLlegadaDeseada}</p>
                <p><span className="text-muted-foreground">Pedido recomendado:</span> {detailOrder.fechaPedidoRecomendada}</p>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio snapshot</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailOrder.items.map((item) => (
                      <TableRow key={item.productoId}>
                        <TableCell>{item.productoNombre}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>{item.cantidad}</TableCell>
                        <TableCell>â‚¬{Number(item.precioUnitarioSnapshot).toFixed(2)}</TableCell>
                        <TableCell>â‚¬{(Number(item.precioUnitarioSnapshot) * item.cantidad).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}



