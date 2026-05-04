import client from './client'
import type { CrearPedidoProveedorRequest, PedidoProveedor } from '@/types/provider'

export const getPedidosProveedor = async (providerId: number): Promise<PedidoProveedor[]> => {
  const { data } = await client.get<PedidoProveedor[]>(`/proveedores/${providerId}/pedidos`)
  return data
}

export const crearPedidoProveedor = async (
  providerId: number,
  payload: CrearPedidoProveedorRequest
): Promise<PedidoProveedor> => {
  const { data } = await client.post<PedidoProveedor>(`/proveedores/${providerId}/pedidos`, payload)
  return data
}

export const enviarPedidoProveedor = async (orderId: number): Promise<PedidoProveedor> => {
  const { data } = await client.patch<PedidoProveedor>(`/pedidos/${orderId}/send`)
  return data
}

export const recibirPedidoProveedor = async (orderId: number): Promise<PedidoProveedor> => {
  const { data } = await client.patch<PedidoProveedor>(`/pedidos/${orderId}/receive`)
  return data
}

export const cancelarPedidoProveedor = async (orderId: number): Promise<PedidoProveedor> => {
  const { data } = await client.patch<PedidoProveedor>(`/pedidos/${orderId}/cancel`)
  return data
}
