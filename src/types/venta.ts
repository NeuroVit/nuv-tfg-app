export interface VentaItem {
  productId: number
  productoNombre: string
  sku: string
  quantity: number
  unitPriceSnapshot: number
  subtotal: number
}

export interface Venta {
  id: number
  clientId: number
  clientName: string
  soldAt: string
  notas: string | null
  totalAmount: number
  createdAt: string
  items: VentaItem[]
}

export interface CrearVentaRequest {
  clientId: number
  notas?: string
  items: Array<{
    productId: number
    quantity: number
  }>
}
