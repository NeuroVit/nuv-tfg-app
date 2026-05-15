import { z } from 'zod'
import type { Producto } from '@/features/productos/types/producto'

export const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  descripcion: z.string().optional(),
  precioUnitario: z.coerce.number().positive('El precio debe ser mayor a 0'),
  costoUnitario: z.coerce.number().positive('El coste debe ser mayor a 0'),
  cantidadActual: z.coerce.number().int().min(0, 'La cantidad no puede ser negativa'),
  nivelMinimoStock: z.coerce.number().int().min(0, 'El stock mínimo no puede ser negativo'),
  categoriaId: z.string().min(1, 'La categoría es obligatoria'),
  providerId: z.string().min(1, 'El proveedor es obligatorio'),
})

export type ProductoFormValues = z.infer<typeof productoSchema>

export type EstadoFiltro = 'all' | 'low' | 'normal' | 'anomaly'

export const defaultProductoValues: ProductoFormValues = {
  nombre: '',
  sku: '',
  descripcion: '',
  precioUnitario: 0,
  costoUnitario: 0,
  cantidadActual: 0,
  nivelMinimoStock: 0,
  categoriaId: '',
  providerId: '',
}

export const hasPriceAnomaly = (producto: Producto) =>
  producto.costoUnitario != null && Number(producto.precioUnitario) < Number(producto.costoUnitario)
