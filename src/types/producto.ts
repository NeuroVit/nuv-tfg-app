export interface Producto {
  id: number
  nombre: string
  sku: string
  descripcion: string | null
  cantidadActual: number
  nivelMinimoStock: number
  precioUnitario: number
  costoUnitario: number | null
  categoriaId: number | null
  categoriaNombre: string | null
  providerId: number | null
  providerNombre: string | null
  version: number
  creadoEn: string
  actualizadoEn: string
}

export interface CrearProductoRequest {
  nombre: string
  sku: string
  descripcion?: string
  precioUnitario: number
  cantidadActual: number
  nivelMinimoStock: number
  categoriaId: number
  providerId: number
}

export interface EditarProductoRequest extends Partial<CrearProductoRequest> {}

export interface Categoria {
  id: number
  nombre: string
  descripcion?: string | null
}

export interface CategoriaRequest {
  nombre: string
  descripcion?: string
}

export type ProductoRequest = CrearProductoRequest

export interface ActualizarStockRequest {
  delta: number
  razon: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'
  notas?: string
}

export interface UnlinkBundlesResponse {
  productId: number
  unlinkedItems: number
  bundles: string[]
}
