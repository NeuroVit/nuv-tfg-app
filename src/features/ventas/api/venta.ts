import client from '@/api/client'
import type { CrearVentaRequest, Venta } from '@/features/ventas/types/venta'
import type { PagedResponse } from '@/types/pagination'

export const getVentas = async (params?: { clientId?: number; limit?: number }): Promise<Venta[]> => {
  const { data } = await client.get<Venta[]>('/ventas', { params })
  return data
}

export type GetVentasPagedParams = {
  clientId?: number
  search?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

export const getVentasPaged = async (params: GetVentasPagedParams = {}): Promise<PagedResponse<Venta>> => {
  const { data } = await client.get<PagedResponse<Venta>>('/ventas/paged', { params })
  return data
}

export const crearVenta = async (payload: CrearVentaRequest): Promise<Venta> => {
  const { data } = await client.post<Venta>('/ventas', payload)
  return data
}
