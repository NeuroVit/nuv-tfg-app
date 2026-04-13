import client from './client'
import type { Producto, ProductoRequest, ActualizarStockRequest } from '../types/producto'

export const getProductos = async (): Promise<Producto[]> => {
  const { data } = await client.get<Producto[]>('/productos')
  return data
}

export const createProducto = async (req: ProductoRequest): Promise<Producto> => {
  const { data } = await client.post<Producto>('/productos', req)
  return data
}

export const updateProducto = async (id: number, req: ProductoRequest): Promise<Producto> => {
  const { data } = await client.put<Producto>(`/productos/${id}`, req)
  return data
}

export const deleteProducto = async (id: number): Promise<void> => {
  await client.delete(`/productos/${id}`)
}

export const actualizarStock = async (id: number, req: ActualizarStockRequest): Promise<Producto> => {
  const { data } = await client.patch<Producto>(`/productos/${id}/stock`, req)
  return data
}