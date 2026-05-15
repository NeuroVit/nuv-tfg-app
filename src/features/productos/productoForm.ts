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
  nivelMaximoStock: z.coerce.number().int().min(0, 'El stock máximo no puede ser negativo'),
  categoriaId: z.string().min(1, 'La categoría es obligatoria'),
  providerId: z.string().min(1, 'El proveedor es obligatorio'),
}).superRefine((values, ctx) => {
  if (values.nivelMaximoStock < values.nivelMinimoStock) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nivelMaximoStock'],
      message: 'El stock máximo debe ser mayor o igual que el mínimo',
    })
  }
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
  nivelMaximoStock: 1,
  categoriaId: '',
  providerId: '',
}

export const hasPriceAnomaly = (producto: Producto) =>
  producto.costoUnitario != null && Number(producto.precioUnitario) < Number(producto.costoUnitario)

export const isOutOfStock = (producto: Producto) => producto.cantidadActual <= 0
export const isLowStock = (producto: Producto) =>
  producto.cantidadActual > 0 && producto.cantidadActual < producto.nivelMinimoStock
export const isOverstock = (producto: Producto) => producto.cantidadActual > producto.nivelMaximoStock
