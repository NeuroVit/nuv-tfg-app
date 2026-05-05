export interface Proveedor {
  id: number
  nombre: string
  ubicacionAlmacen: string
  diasEntrega: number
  activo: boolean
  cantidadProductos: number
}

export interface ProveedorRequest {
  nombre: string
  ubicacionAlmacen: string
  diasEntrega: number
}

export type OrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'

export interface PedidoProveedorItem {
  productoId: number
  productoNombre: string
  sku: string
  cantidad: number
  precioUnitarioSnapshot: number
}

export interface PedidoProveedor {
  id: number
  providerId: number
  providerNombre: string
  status: OrderStatus
  fechaLlegadaDeseada: string
  fechaPedidoRecomendada: string
  enviadoEn: string | null
  recibidoEn: string | null
  notas: string | null
  creadoEn: string
  items: PedidoProveedorItem[]
}

export interface CrearPedidoProveedorItemRequest {
  productoId: number
  cantidad: number
  precioUnitario: number
}

export interface CrearPedidoProveedorRequest {
  fechaLlegadaDeseada: string
  notas?: string
  items: CrearPedidoProveedorItemRequest[]
}
