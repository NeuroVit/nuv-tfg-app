import client from './client'
import type { CrearVentaRequest, Venta } from '@/types/venta'

export const getVentas = async (params?: { clientId?: number; limit?: number }): Promise<Venta[]> => {
  const { data } = await client.get<Venta[]>('/ventas', { params })
  return data
}

export const crearVenta = async (payload: CrearVentaRequest): Promise<Venta> => {
  const { data } = await client.post<Venta>('/ventas', payload)
  return data
}
