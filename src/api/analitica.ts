import client from './client'
import type {
  AlertaSerieRow,
  AnaliticaMeta,
  BundleCandidateRow,
  BundlePerformanceRow,
  ClienteRentabilidadRow,
  FinanzasResumen,
  InventorySummaryRow,
  PriceTrendRow,
  ProductCreationRow,
  ProveedorPerformanceRow,
  RentabilidadProductoRow,
  RevenueComparativa,
  SalesVelocityRow,
  StockByCategoryRow,
  StockDistributionRow,
  StockReceiptRow,
  TopProductVelocityRow,
  VelocitySummaryRow,
} from '@/types/analitica'

export const getInventarioAnalitica = async (): Promise<InventorySummaryRow[]> => {
  const { data } = await client.get<InventorySummaryRow[]>('/analitica/inventario')
  return data
}

export const getVelocidadAnalitica = async (limit = 120, days = 30): Promise<SalesVelocityRow[]> => {
  const params = { limit, days }
  const { data } = await client.get<SalesVelocityRow[]>('/analitica/velocidad', { params })
  return data
}

export const getPreciosAnalitica = async (limit = 120, days?: number): Promise<PriceTrendRow[]> => {
  const params: { limit: number; days?: number } = { limit }
  if (days !== undefined) params.days = days
  const { data } = await client.get<PriceTrendRow[]>('/analitica/precios', { params })
  return data
}

export const getBundleCandidatosAnalitica = async (limit = 120, days?: number): Promise<BundleCandidateRow[]> => {
  const params: { limit: number; days?: number } = { limit }
  if (days !== undefined) params.days = days
  const { data } = await client.get<BundleCandidateRow[]>('/analitica/bundles-candidatos', {
    params,
  })
  return data
}

export const getVelocidadResumenAnalitica = async (days = 30): Promise<VelocitySummaryRow[]> => {
  const params = { days }
  const { data } = await client.get<VelocitySummaryRow[]>('/analitica/velocidad-resumen', {
    params,
  })
  return data
}

export const getTopProductosVelocidadAnalitica = async (
  days = 30,
  limit = 10,
): Promise<TopProductVelocityRow[]> => {
  const params = { days, limit }
  const { data } = await client.get<TopProductVelocityRow[]>('/analitica/top-productos-velocidad', {
    params,
  })
  return data
}

export const getDistribucionStockAnalitica = async (): Promise<StockDistributionRow[]> => {
  const { data } = await client.get<StockDistributionRow[]>('/analitica/distribucion-stock')
  return data
}

export const getStockPorCategoriaAnalitica = async (): Promise<StockByCategoryRow[]> => {
  const { data } = await client.get<StockByCategoryRow[]>('/analitica/stock-por-categoria')
  return data
}

export const getFinanzasResumenAnalitica = async (days = 30): Promise<FinanzasResumen> => {
  const params = { days }
  const { data } = await client.get<FinanzasResumen>('/analitica/finanzas-resumen', {
    params,
  })
  return data
}

export const getRentabilidadProductosAnalitica = async (
  days = 30,
  limit = 12,
): Promise<RentabilidadProductoRow[]> => {
  const params = { days, limit }
  const { data } = await client.get<RentabilidadProductoRow[]>('/analitica/rentabilidad-productos', {
    params,
  })
  return data
}

export const getRevenueComparativaAnalitica = async (days = 30): Promise<RevenueComparativa> => {
  const params = { days }
  const { data } = await client.get<RevenueComparativa>('/analitica/revenue-comparativa', { params })
  return data
}

export const getProductosCreadosAnalitica = async (
  days = 30,
): Promise<ProductCreationRow[]> => {
  const params = { days }
  const { data } = await client.get<ProductCreationRow[]>('/analitica/productos-creados', {
    params,
  })
  return data
}

export const getStockRecibidoAnalitica = async (days = 30): Promise<StockReceiptRow[]> => {
  const params = { days }
  const { data } = await client.get<StockReceiptRow[]>('/analitica/stock-recibido', { params })
  return data
}

export const getMetaAnalitica = async (days = 30): Promise<AnaliticaMeta> => {
  const params = { days }
  const { data } = await client.get<AnaliticaMeta>('/analitica/meta', { params })
  return data
}

export const getBundlesPerformance = async (
  days = 30,
  limit = 20,
): Promise<BundlePerformanceRow[]> => {
  const params = { days, limit }
  const { data } = await client.get<BundlePerformanceRow[]>('/analitica/bundles-performance', { params })
  return data
}

export const getClientesRentabilidad = async (
  days = 30,
  limit = 20,
): Promise<ClienteRentabilidadRow[]> => {
  const params = { days, limit }
  const { data } = await client.get<ClienteRentabilidadRow[]>('/analitica/clientes-rentabilidad', { params })
  return data
}

export const getProveedoresPerformance = async (
  days = 90,
  limit = 20,
): Promise<ProveedorPerformanceRow[]> => {
  const params = { days, limit }
  const { data } = await client.get<ProveedorPerformanceRow[]>('/analitica/proveedores-performance', { params })
  return data
}

export const getAlertasSerie = async (days = 30): Promise<AlertaSerieRow[]> => {
  const params = { days }
  const { data } = await client.get<AlertaSerieRow[]>('/analitica/alertas-serie', { params })
  return data
}
