import client from '@/api/client'
import type { Cliente, ClienteRequest } from '@/features/clientes/types/cliente'
import type { PagedResponse } from '@/types/pagination'

export const getClientes = async (includeArchived = false): Promise<Cliente[]> => {
  const { data } = await client.get<Cliente[]>('/clientes', { params: { includeArchived } })
  return data
}

export type GetClientesPagedParams = {
  status?: 'all' | 'active' | 'archived'
  search?: string
  limit?: number
  offset?: number
}

export const getClientesPaged = async (params: GetClientesPagedParams = {}): Promise<PagedResponse<Cliente>> => {
  const normalizedParams = {
    ...params,
    status:
      params.status === 'active'
        ? 'ACTIVE'
        : params.status === 'archived'
          ? 'ARCHIVED'
          : undefined,
  }
  const { data } = await client.get<PagedResponse<Cliente>>('/clientes/paged', { params: normalizedParams })
  return data
}

export const crearCliente = async (payload: ClienteRequest): Promise<Cliente> => {
  const { data } = await client.post<Cliente>('/clientes', payload)
  return data
}

export const editarCliente = async (id: number, payload: ClienteRequest): Promise<Cliente> => {
  const { data } = await client.put<Cliente>(`/clientes/${id}`, payload)
  return data
}

export const archivarCliente = async (id: number): Promise<Cliente> => {
  const { data } = await client.patch<Cliente>(`/clientes/${id}/archive`)
  return data
}

export const restaurarCliente = async (id: number): Promise<Cliente> => {
  const { data } = await client.patch<Cliente>(`/clientes/${id}/restore`)
  return data
}
