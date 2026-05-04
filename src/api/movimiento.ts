import client from './client'
import type { MovimientosPageResponse } from '@/types/movimiento'

export type GetMovimientosParams = {
  productId?: number
  tipo?: 'ENTRADA' | 'SALIDA'
  razon?: string
  desde?: string
  hasta?: string
  limit?: number
  offset?: number
}

export const getMovimientos = async (params: GetMovimientosParams = {}): Promise<MovimientosPageResponse> => {
  const { data } = await client.get<MovimientosPageResponse>('/movimientos', { params })
  return data
}
