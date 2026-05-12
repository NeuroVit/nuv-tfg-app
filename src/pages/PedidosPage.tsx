import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Check, Eye, MoreHorizontal, PackagePlus, Send, X } from 'lucide-react'
import {
  cancelarPedidoProveedor,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { parseApiError } from '@/lib/apiError'
import PedidoFormModal from '@/components/PedidoFormModal'
import PedidoDetailModal from '@/components/PedidoDetailModal'

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

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProviderId = Number(searchParams.get('providerId')) || null
  const restockProductId = Number(searchParams.get('restockProductId')) || null
  const autoCreateFromRestock = searchParams.get('autoCreate') === '1'

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
  const [restockFlowHandled, setRestockFlowHandled] = useState(false)

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId]
  )

  const providerProducts = useMemo(() => {
    if (!selectedProvider) return []
    return products.filter((product) => product.providerId === selectedProvider.id)
  }, [products, selectedProvider])

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

  useEffect(() => {
    if (!autoCreateFromRestock || !restockProductId || restockFlowHandled) return
    if (products.length === 0) return

    const productToRestock = products.find((product) => product.id === restockProductId)
    if (!productToRestock) {
      toast.error('No se encontro el producto a reponer')
      setRestockFlowHandled(true)
      return
    }
    if (!productToRestock.providerId) {
      toast.error('El producto no tiene proveedor asignado para crear el pedido')
      setRestockFlowHandled(true)
      return
    }

    if (selectedProviderId !== productToRestock.providerId) {
      const next = new URLSearchParams(searchParams)
      next.set('providerId', String(productToRestock.providerId))
      setSearchParams(next, { replace: true })
      return
    }

    if (canEdit) {
      setOrderDialogOpen(true)
      toast.success(`Pedido preparado para reponer ${productToRestock.nombre}`)
    }

    const cleaned = new URLSearchParams(searchParams)
    cleaned.delete('restockProductId')
    cleaned.delete('autoCreate')
    setSearchParams(cleaned, { replace: true })
    setRestockFlowHandled(true)
  }, [
    autoCreateFromRestock,
    canEdit,
    products,
    restockFlowHandled,
    restockProductId,
    searchParams,
    selectedProviderId,
    setSearchParams,
  ])

  const onChangeProvider = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('providerId', value)
    next.delete('restockProductId')
    next.delete('autoCreate')
    setSearchParams(next, { replace: true })
  }

  const openCreateOrder = () => {
    setOrderDialogOpen(true)
  }

  const openOrderDetail = (order: PedidoProveedor) => {
    setDetailOrder(order)
    setDetailDialogOpen(true)
  }

  const onOrderCreated = () => {
    if (selectedProvider) {
      void Promise.all([loadOrders(selectedProvider.id), loadProducts()])
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

      <PedidoFormModal
        open={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
        onCreated={onOrderCreated}
        provider={selectedProvider}
        providerProducts={providerProducts}
      />

      <PedidoDetailModal
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        pedido={detailOrder}
      />
    </div>
  )
}

