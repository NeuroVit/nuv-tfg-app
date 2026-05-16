export interface BundleSummary {
  id: number
  nombre: string
  descripcion: string | null
  descuentoPct: number
  activo: boolean
  cantidadProductos: number
  actualizadoEn: string
}

export interface BundleItem {
  productoId: number
  productoNombre: string
  sku: string
  cantidad: number
}

export interface BundleUpsertItem {
  productoId: number
  cantidad: number
}

export interface BundleUpsertRequest {
  nombre: string
  descripcion?: string
  descuentoPct: number
  activo: boolean
  items: BundleUpsertItem[]
}
