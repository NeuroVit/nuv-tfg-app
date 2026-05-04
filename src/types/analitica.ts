export interface InventorySummaryRow {
  productId: number
  sku: string
  productName: string
  categoryName: string
  currentQuantity: number
  minimumStockLevel: number
  unitPrice: number
  stockValue: number
  stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK' | 'OK' | string
}

export interface SalesVelocityRow {
  productId: number
  sku: string
  productName: string
  categoryName: string
  movementDate: string
  unitsSold: number
  revenue: number
}

export interface PriceTrendRow {
  historyId: number
  productId: number
  sku: string
  productName: string
  categoryName: string
  oldPrice: number
  newPrice: number
  priceDelta: number
  pctChange: number
  changedAt: string
  currentPrice: number
}

export interface BundleCandidateRow {
  productAId: number
  productASku: string
  productAName: string
  productAPrice: number
  productBId: number
  productBSku: string
  productBName: string
  productBPrice: number
  coOccurrenceCount: number
  combinedPrice: number
}

export interface VelocitySummaryRow {
  movementDate: string
  unitsSold: number
  revenue: number
}

export interface TopProductVelocityRow {
  productId: number
  sku: string
  productName: string
  categoryName: string
  unitsSold: number
  revenue: number
}

export interface StockDistributionRow {
  stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK' | 'OK' | string
  products: number
  quantityTotal: number
  stockValueTotal: number
}

export interface StockByCategoryRow {
  categoryId: number
  categoryName: string
  products: number
  quantityTotal: number
  stockValueTotal: number
}

export interface FinanzasResumen {
  days: number
  ventas30d: number
  compras30d: number
  flujoNeto30d: number
  cogsReal30d: number
  margenReal30d: number
  valorStockVenta: number
  costoStockReal: number
  diferenciaValorVsCosto: number
  ventasCount30d: number
  ordenesRecibidasCount30d: number
}

export interface RentabilidadProductoRow {
  productId: number
  sku: string
  productName: string
  categoryName: string
  unidadesVendidas: number
  revenue: number
  cogs: number
  margen: number
  margenPct: number
}
