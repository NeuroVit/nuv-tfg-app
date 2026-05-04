import client from './client'
import type { Proveedor, ProveedorRequest } from '@/types/provider'

export const getProveedores = async (includeArchived = false): Promise<Proveedor[]> => {
  const { data } = await client.get<Proveedor[]>('/proveedores', {
    params: { includeArchived },
  })
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
