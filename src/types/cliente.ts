export interface Cliente {
  id: number
  nombre: string
  email: string | null
  telefono: string | null
  notas: string | null
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface ClienteRequest {
  nombre: string
  email?: string
  telefono?: string
  notas?: string
}
