import client from '@/api/client'
import type { Proveedor, ProveedorRequest } from '@/features/proveedores/types/provider'
import type { ProveedorDetalle } from '@/features/proveedores/types/proveedorDetalle'
import type { PagedResponse } from '@/types/pagination'

export const getProveedores = async (includeArchived = false): Promise<Proveedor[]> => {
  const { data } = await client.get<Proveedor[]>('/proveedores', {
    params: { includeArchived },
  })
  return data
}

export type GetProveedoresPagedParams = {
  status?: 'all' | 'active' | 'archived'
  search?: string
  limit?: number
  offset?: number
}

export const getProveedoresPaged = async (
  params: GetProveedoresPagedParams = {},
): Promise<PagedResponse<Proveedor>> => {
  const normalizedParams = {
    ...params,
    status:
      params.status === 'active'
        ? 'ACTIVE'
        : params.status === 'archived'
          ? 'ARCHIVED'
          : undefined,
  }
  const { data } = await client.get<PagedResponse<Proveedor>>('/proveedores/paged', { params: normalizedParams })
  return data
}

export const crearProveedor = async (payload: ProveedorRequest): Promise<Proveedor> => {
  const { data } = await client.post<Proveedor>('/proveedores', payload)
  return data
}

export const editarProveedor = async (id: number, payload: ProveedorRequest): Promise<Proveedor> => {
  const { data } = await client.put<Proveedor>(`/proveedores/${id}`, payload)
  return data
}

export const archivarProveedor = async (id: number): Promise<Proveedor> => {
  const { data } = await client.patch<Proveedor>(`/proveedores/${id}/archive`)
  return data
}

export const restaurarProveedor = async (id: number): Promise<Proveedor> => {
  const { data } = await client.patch<Proveedor>(`/proveedores/${id}/restore`)
  return data
}

export const getProveedorDetalle = async (id: number): Promise<ProveedorDetalle> => {
  const { data } = await client.get<ProveedorDetalle>(`/proveedores/${id}`)
  return data
}
