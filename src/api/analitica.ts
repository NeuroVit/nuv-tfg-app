import client from './client'
import type {
  AnaliticaMeta,
  BundleCandidateRow,
  FinanzasResumen,
  InventorySummaryRow,
  PriceTrendRow,
  RentabilidadProductoRow,
  SalesVelocityRow,
  StockByCategoryRow,
  StockDistributionRow,
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

export const getPreciosAnalitica = async (limit = 120): Promise<PriceTrendRow[]> => {
  const { data } = await client.get<PriceTrendRow[]>('/analitica/precios', { params: { limit } })
  return data
}

export const getBundleCandidatosAnalitica = async (limit = 120): Promise<BundleCandidateRow[]> => {
  const { data } = await client.get<BundleCandidateRow[]>('/analitica/bundles-candidatos', {
    params: { limit },
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

export const getMetaAnalitica = async (days = 30): Promise<AnaliticaMeta> => {
  const params = { days }
  const { data } = await client.get<AnaliticaMeta>('/analitica/meta', { params })
  return data
}
