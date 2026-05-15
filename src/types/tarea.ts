export type EstadoTarea = 'PENDIENTE' | 'EN_GESTION' | 'POSPUESTO' | 'COMPLETADO'
export type PrioridadTarea = 'ALTA' | 'MEDIA' | 'BAJA'
export type TipoTarea = 'ALERTA_STOCK' | 'MANUAL'

export type Tarea = {
  id: number
  titulo: string
  descripcion: string | null
  tipo: TipoTarea
  estado: EstadoTarea
  prioridad: PrioridadTarea
  alertaId: number | null
  productoNombre: string | null
  sku: string | null
  alertaTipo: string | null
  creadoPor: string | null
  createdAt: string
  updatedAt: string
}

export type CrearTareaPayload = {
  titulo: string
  descripcion?: string
  prioridad?: PrioridadTarea
}
