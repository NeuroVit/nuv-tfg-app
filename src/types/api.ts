export interface Producto {
  id: number
  sku: string
  nombre: string
  categoria: string
  stockActual: number
  stockMinimo: number
  precio: number
  estado: 'Normal' | 'Stock bajo'
}

export interface Categoria {
  id: number
  nombre: string
}

export interface ApiError {
  errors: { field: string; message: string }[]
}

