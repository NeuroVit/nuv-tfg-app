export interface Producto {
  id: number
  nombre: string
  sku: string
  descripcion: string | null
  cantidadActual: number
  nivelMinimoStock: number
  precioUnitario: number
  categoriaNombre: string | null
  version: number
  creadoEn: string
  actualizadoEn: string
}

export interface ProductoRequest {
  nombre: string
  sku: string
  descripcion?: string
  cantidadActual: number
  nivelMinimoStock: number
  precioUnitario: number
  categoriaId: number
}

export interface ActualizarStockRequest {
  delta: number
  razon: 'COMPRA' | 'VENTA' | 'AJUSTE' | 'DEVOLUCION' | 'MERMA'
  notas?: string
}