import client from './client'
import type { Producto, ProductoRequest, ActualizarStockRequest } from '../types/producto'

export const getProductos = () =>
  client.get<Producto[]>('/api/productos').then((r) => r.data)

export const getProducto = (id: number) =>
  client.get<Producto>(`/api/productos/${id}`).then((r) => r.data)

export const getBajoStock = () =>
  client.get<Producto[]>('/api/productos/bajo-stock').then((r) => r.data)

export const createProducto = (data: ProductoRequest) =>
  client.post<Producto>('/api/productos', data).then((r) => r.data)

export const updateProducto = (id: number, data: ProductoRequest) =>
  client.put<Producto>(`/api/productos/${id}`, data).then((r) => r.data)

export const updateStock = (id: number, data: ActualizarStockRequest) =>
  client.patch<Producto>(`/api/productos/${id}/stock`, data).then((r) => r.data)

export const deleteProducto = (id: number) =>
  client.delete(`/api/productos/${id}`)