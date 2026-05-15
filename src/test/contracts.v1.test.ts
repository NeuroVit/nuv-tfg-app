import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const authResponseSchema = z.object({
  username: z.string(),
  role: z.string(),
  token: z.string(),
  mustChangePassword: z.boolean().optional(),
})

const ventaItemSchema = z.object({
  productId: z.number(),
  bundleId: z.number().nullable().optional(),
  bundleName: z.string().nullable().optional(),
  productoNombre: z.string(),
  sku: z.string(),
  quantity: z.number(),
  unitPriceSnapshot: z.number(),
  subtotal: z.number(),
})

const ventaSchema = z.object({
  id: z.number(),
  clientId: z.number(),
  clientName: z.string(),
  soldAt: z.string(),
  notas: z.string().nullable(),
  totalAmount: z.number(),
  createdAt: z.string(),
  items: z.array(ventaItemSchema),
})

const productoSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  sku: z.string(),
  precioUnitario: z.number(),
  cantidadActual: z.number(),
  nivelMinimoStock: z.number(),
})

const inventoryRowSchema = z.object({
  productId: z.number(),
  sku: z.string(),
  productName: z.string(),
  categoryName: z.string(),
  currentQuantity: z.number(),
  minimumStockLevel: z.number(),
  unitPrice: z.number(),
  stockValue: z.number(),
  stockStatus: z.string(),
})

describe('v1 contract guards', () => {
  it('validates auth response shape', () => {
    expect(() => authResponseSchema.parse({ username: 'u', role: 'ROLE_ADMIN', token: 'jwt' })).not.toThrow()
  })

  it('validates venta response shape', () => {
    expect(() => ventaSchema.parse({
      id: 1,
      clientId: 2,
      clientName: 'Cliente',
      soldAt: '2026-05-15T08:00:00Z',
      notas: null,
      totalAmount: 34.5,
      createdAt: '2026-05-15T08:00:00Z',
      items: [{
        productId: 10,
        productoNombre: 'Cafe',
        sku: 'CAF-01',
        quantity: 2,
        unitPriceSnapshot: 17.25,
        subtotal: 34.5,
      }],
    })).not.toThrow()
  })

  it('validates producto response shape', () => {
    expect(() => productoSchema.parse({
      id: 1,
      nombre: 'Cafe',
      sku: 'CAF-01',
      precioUnitario: 3.2,
      cantidadActual: 10,
      nivelMinimoStock: 2,
    })).not.toThrow()
  })

  it('validates analitica inventory row shape', () => {
    expect(() => inventoryRowSchema.parse({
      productId: 1,
      sku: 'SKU-1',
      productName: 'Producto',
      categoryName: 'Cat',
      currentQuantity: 10,
      minimumStockLevel: 2,
      unitPrice: 5,
      stockValue: 50,
      stockStatus: 'NORMAL',
    })).not.toThrow()
  })
})
