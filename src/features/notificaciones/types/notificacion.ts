export type Notificacion = {
  id: number
  tipo: string
  titulo: string
  descripcion: string | null
  targetPath: string
  tareaId: number | null
  leida: boolean
  creadaEn: string
  leidaEn: string | null
}

export type ConteoNoLeidas = {
  noLeidas: number
}
