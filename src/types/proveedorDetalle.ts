export interface ProveedorProductoResumen {
  id: number
  nombre: string
  sku: string
  cantidadActual: number
  nivelMinimoStock: number
  stockBajo: boolean
}

export interface PedidoProveedorResumen {
  id: number
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED' | string
  fechaLlegadaDeseada: string
  fechaPedidoRecomendada: string
  enviadoEn: string | null
  recibidoEn: string | null
  creadoEn: string
  totalItems: number
  totalUnidades: number
  importeEstimado: number
}

export interface ProveedorKpis {
  totalPedidos: number
  pedidosActivos: number
  pedidosRecibidos: number
  fillRate: number
  onTimeRate: number
}

export interface ProveedorDetalle {
  proveedor: {
    id: number
    nombre: string
    ubicacionAlmacen: string
    diasEntrega: number
    activo: boolean
    cantidadProductos: number
  }
  kpis: ProveedorKpis
  productos: ProveedorProductoResumen[]
  pedidosRecientes: PedidoProveedorResumen[]
}
