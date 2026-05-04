import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
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

type OrderItemForm = {
  productoId: string
  cantidad: number
}

const parseApiError = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback
  const payload = error.response?.data
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; error?: string }
    if (data.message) return data.message
    if (data.error) return data.error
  }
  return fallback
}

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-ES') : '—'

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
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([{ productoId: '', cantidad: 1 }])
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
    const arrival = new Date(orderArrivalDate)
    if (Number.isNaN(arrival.getTime())) return null
    arrival.setDate(arrival.getDate() - selectedProvider.diasEntrega)
    return toDateInputValue(arrival)
  }, [orderArrivalDate, selectedProvider])

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
    setOrderItems([{ productoId: '', cantidad: 1 }])
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
    setOrderItems((current) => [...current, { productoId: '', cantidad: 1 }])
  }

  const removeOrderItem = (index: number) => {
    setOrderItems((current) => {
      const next = current.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [{ productoId: '', cantidad: 1 }]
    })
  }

  const updateOrderItem = (index: number, patch: Partial<OrderItemForm>) => {
    setOrderItems((current) => current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const submitOrder = async () => {
    if (!selectedProvider) return

    const items = orderItems
      .map((item) => ({ productoId: Number(item.productoId), cantidad: Number(item.cantidad) }))
      .filter((item) => !Number.isNaN(item.productoId))

    if (items.length === 0) {
      toast.error('Debes seleccionar al menos un producto')
      return
    }
    if (items.some((item) => item.cantidad < 1)) {
      toast.error('La cantidad debe ser mayor o igual a 1')
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="mt-1 text-sm text-gray-500">Consulta y gestiona pedidos por proveedor.</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select
            value={selectedProviderId ? String(selectedProviderId) : ''}
            onValueChange={onChangeProvider}
            disabled={loadingProviders}
          >
            <SelectTrigger className="w-full md:w-72">
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
            className="w-full md:w-80"
            disabled={!selectedProvider}
          />

          <Select
            value={orderStatusFilter}
            onValueChange={(value) =>
              setOrderStatusFilter(value as 'all' | 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED')
            }
            disabled={!selectedProvider}
          >
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="SENT">SENT</SelectItem>
              <SelectItem value="RECEIVED">RECEIVED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            </SelectContent>
          </Select>

          {canEdit && selectedProvider?.activo && (
            <Button className="w-full md:ml-auto md:w-auto" onClick={openCreateOrder}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Crear pedido
            </Button>
          )}
        </div>

        {!selectedProvider ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-500">
            Selecciona un proveedor para ver sus pedidos.
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-white p-3 text-sm text-gray-600">
              Proveedor seleccionado: <span className="font-medium text-gray-900">{selectedProvider.nombre}</span>
              {' · '}
              Fecha pedido recomendada = llegada deseada - {selectedProvider.diasEntrega} días
            </div>

            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Llegada deseada</TableHead>
                    <TableHead>Pedido recomendado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Recibido</TableHead>
                    <TableHead className="w-16 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOrders ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-gray-400">
                        Cargando pedidos...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-gray-400">
                        No hay pedidos para mostrar con los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'CANCELLED' ? 'secondary' : 'default'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.fechaLlegadaDeseada}</TableCell>
                        <TableCell>{order.fechaPedidoRecomendada}</TableCell>
                        <TableCell>{formatDateTime(order.creadoEn)}</TableCell>
                        <TableCell>{formatDateTime(order.enviadoEn)}</TableCell>
                        <TableCell>{formatDateTime(order.recibidoEn)}</TableCell>
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
                <Input value={recommendedOrderDate ?? '—'} readOnly />
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
                  Añadir línea
                </Button>
              </div>
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-[1fr_130px_auto]"
                >
                  <Select
                    value={item.productoId}
                    onValueChange={(value) => updateOrderItem(index, { productoId: value })}
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
            <p className="text-sm text-gray-500">Pedido no disponible.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
                <p><span className="text-gray-500">Proveedor:</span> {detailOrder.providerNombre}</p>
                <p><span className="text-gray-500">Estado:</span> {detailOrder.status}</p>
                <p><span className="text-gray-500">Llegada deseada:</span> {detailOrder.fechaLlegadaDeseada}</p>
                <p><span className="text-gray-500">Pedido recomendado:</span> {detailOrder.fechaPedidoRecomendada}</p>
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
                        <TableCell>€{Number(item.precioUnitarioSnapshot).toFixed(2)}</TableCell>
                        <TableCell>€{(Number(item.precioUnitarioSnapshot) * item.cantidad).toFixed(2)}</TableCell>
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
