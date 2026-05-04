import client from './client'
import type { AlertaStock } from '@/types/alerta'

export const getAlertas = async (resueltas?: boolean): Promise<AlertaStock[]> => {
  const { data } = await client.get<AlertaStock[]>('/alertas', {
    params: resueltas === undefined ? {} : { resueltas },
  })
  return data
}

export const resolverAlerta = async (id: number): Promise<AlertaStock> => {
  const { data } = await client.patch<AlertaStock>(`/alertas/${id}/resolve`)
  return data
}
