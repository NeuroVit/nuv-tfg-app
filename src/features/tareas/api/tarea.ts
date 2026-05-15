import client from '@/api/client'
import type { CrearTareaPayload, EstadoTarea, Tarea, TareaResumen } from '@/features/tareas/types/tarea'
import type { PagedResponse } from '@/types/pagination'

export const getTareas = async (estado?: EstadoTarea): Promise<Tarea[]> => {
  const params = estado ? { estado } : {}
  const res = await client.get<Tarea[]>('/tareas', { params })
  return res.data
}

export type GetTareasPagedParams = {
  estado?: EstadoTarea
  limit?: number
  offset?: number
}

export const getTareasPaged = async (params: GetTareasPagedParams = {}): Promise<PagedResponse<Tarea>> => {
  const res = await client.get<PagedResponse<Tarea>>('/tareas/paged', { params })
  return res.data
}

export const getTareasResumen = async (): Promise<TareaResumen> => {
  const res = await client.get<TareaResumen>('/tareas/resumen')
  return res.data
}

export const crearTarea = async (payload: CrearTareaPayload): Promise<Tarea> => {
  const res = await client.post<Tarea>('/tareas', payload)
  return res.data
}

export const actualizarEstadoTarea = async (id: number, estado: EstadoTarea): Promise<Tarea> => {
  const res = await client.patch<Tarea>(`/tareas/${id}/estado`, { estado })
  return res.data
}

export const eliminarTarea = async (id: number): Promise<void> => {
  await client.delete(`/tareas/${id}`)
}
