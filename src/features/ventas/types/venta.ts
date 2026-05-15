export interface VentaItem {
  productId: number
  bundleId?: number | null
  bundleName?: string | null
  productoNombre: string
  sku: string
  quantity: number
  listUnitPriceSnapshot?: number
  discountPctSnapshot?: number
  unitPriceSnapshot: number
  subtotal: number
}

export interface Venta {
  id: number
  clientId: number
  clientName: string
  soldAt: string
  notas: string | null
  subtotalAmount?: number
  discountTotalAmount?: number
  globalDiscountPct?: number
  totalAmount: number
  createdAt: string
  items: VentaItem[]
}

export interface CrearVentaRequest {
  clientId: number
  notas?: string
  descuentoPctGlobal?: number
  items?: Array<{
    productId: number
    quantity: number
    descuentoPct?: number
    bundleId?: number
  }>
  bundles?: Array<{
    bundleId: number
    quantity: number
    descuentoPctOverride?: number
  }>
}
