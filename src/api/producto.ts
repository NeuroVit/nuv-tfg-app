import client from './client'
import type {
  Producto,
  CrearProductoRequest,
  EditarProductoRequest,
  ActualizarStockRequest,
  UnlinkBundlesResponse,
} from '../types/producto'
import { getCategorias } from './categoria'

export { getCategorias }

export const getProductos = async (): Promise<Producto[]> => {
  const { data } = await client.get<Producto[]>('/productos')
  return data
}

export const crearProducto = (data: CrearProductoRequest) =>
  client.post<Producto>('/productos', data).then((r) => r.data)

export const editarProducto = (id: number, data: EditarProductoRequest) =>
  client.put<Producto>(`/productos/${id}`, data).then((r) => r.data)

export const deleteProducto = async (id: number): Promise<void> => {
  await client.delete(`/productos/${id}`)
}

export const actualizarStock = async (id: number, req: ActualizarStockRequest): Promise<Producto> => {
  const { data } = await client.patch<Producto>(`/productos/${id}/stock`, req)
  return data
}

export const getProductoBundles = async (id: number): Promise<string[]> => {
  const { data } = await client.get<string[]>(`/productos/${id}/bundles`)
  return data
}

export const unlinkProductoFromBundles = async (id: number): Promise<UnlinkBundlesResponse> => {
  const { data } = await client.delete<UnlinkBundlesResponse>(`/productos/${id}/bundles`)
  return data
}

export const createProducto = crearProducto
export const updateProducto = editarProducto
