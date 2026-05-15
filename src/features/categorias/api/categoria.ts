import client from '@/api/client'
import type { Categoria, CategoriaRequest } from '@/features/productos/types/producto'

export const getCategorias = async (): Promise<Categoria[]> => {
  const { data } = await client.get<Categoria[]>('/categorias')
  return data
}

export const getCategoriaById = async (id: number): Promise<Categoria> => {
  const { data } = await client.get<Categoria>(`/categorias/${id}`)
  return data
}

export const crearCategoria = async (payload: CategoriaRequest): Promise<Categoria> => {
  const { data } = await client.post<Categoria>('/categorias', payload)
  return data
}

export const editarCategoria = async (id: number, payload: CategoriaRequest): Promise<Categoria> => {
  const { data } = await client.put<Categoria>(`/categorias/${id}`, payload)
  return data
}

export const eliminarCategoria = async (id: number): Promise<void> => {
  await client.delete(`/categorias/${id}`)
}
