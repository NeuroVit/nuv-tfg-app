import client from './client'
import type { Cliente, ClienteRequest } from '@/types/cliente'

export const getClientes = async (includeArchived = false): Promise<Cliente[]> => {
  const { data } = await client.get<Cliente[]>('/clientes', { params: { includeArchived } })
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
