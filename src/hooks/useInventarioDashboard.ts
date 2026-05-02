import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import client from '@/api/client'

type ProductoApi = {
  id: number
  sku: string
  nombre: string
  categoria?: string | null
  stockActual?: number
  stockMinimo?: number
  precio?: number
  cantidadActual?: number
  nivelMinimoStock?: number
  precioUnitario?: number
}

type MovimientoStock = {
  id: number
  productoNombre: string
  productoSku: string
  cantidad: number
  tipo: 'ENTRADA' | 'SALIDA'
  fecha: string
}

type CategoriaApi = {
  id: number
  nombre: string
}

export type ProductoStockBajo = {
  id: number
  nombre: string
  sku: string
  stockActual: number
  stockMinimo: number
}

type DashboardState = {
  valorTotal: number
  totalProductos: number
  productosStockBajo: ProductoStockBajo[]
  totalCategorias: number
  movimientos: MovimientoStock[]
  loading: boolean
  error: string | null
}

const initialState: DashboardState = {
  valorTotal: 0,
  totalProductos: 0,
  productosStockBajo: [],
  totalCategorias: 0,
  movimientos: [],
  loading: true,
  error: null,
}

const toStockActual = (producto: ProductoApi) => producto.stockActual ?? producto.cantidadActual ?? 0
const toStockMinimo = (producto: ProductoApi) => producto.stockMinimo ?? producto.nivelMinimoStock ?? 0
const toPrecio = (producto: ProductoApi) => producto.precio ?? producto.precioUnitario ?? 0

export function useInventarioDashboard() {
  const [state, setState] = useState<DashboardState>(initialState)

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const productosPromise = client.get<ProductoApi[]>('/productos')
        const categoriasPromise = client.get<CategoriaApi[]>('/categorias')
        const movimientosPromise = client
          .get<unknown>('/movimientos', { params: { limit: 10 } })
          .then((response) => {
            const raw = response.data
            const list = Array.isArray(raw)
              ? raw
              : raw && typeof raw === 'object' && Array.isArray((raw as { content?: unknown[] }).content)
                ? (raw as { content: unknown[] }).content
                : []

            return list
              .map((item, index): MovimientoStock | null => {
                if (!item || typeof item !== 'object') return null
                const row = item as Record<string, unknown>
                const cantidad = Number(row.cantidad ?? row.delta ?? 0)
                const tipoRaw = String(row.tipo ?? '')
                const tipo: 'ENTRADA' | 'SALIDA' =
                  tipoRaw === 'ENTRADA' || tipoRaw === 'SALIDA'
                    ? tipoRaw
                    : cantidad >= 0
                      ? 'ENTRADA'
                      : 'SALIDA'

                return {
                  id: Number(row.id ?? index),
                  productoNombre: String(row.productoNombre ?? row.nombreProducto ?? row.productName ?? 'Producto'),
                  productoSku: String(row.productoSku ?? row.skuProducto ?? row.productSku ?? 'N/A'),
                  cantidad: Math.abs(cantidad),
                  tipo,
                  fecha: String(row.fecha ?? row.movedAt ?? row.createdAt ?? new Date().toISOString()),
                }
              })
              .filter((movimiento): movimiento is MovimientoStock => movimiento !== null)
          })
          .catch((error: unknown) => {
            if (isAxiosError(error) && error.response?.status === 404) {
              return []
            }
            throw error
          })

        const [productosRes, movimientos, categoriasRes] = await Promise.all([
          productosPromise,
          movimientosPromise,
          categoriasPromise,
        ])

        const productos = productosRes.data ?? []
        const categorias = categoriasRes.data ?? []

        const valorTotal = productos.reduce(
          (total, producto) => total + toPrecio(producto) * toStockActual(producto),
          0
        )

        const productosStockBajo = productos
          .map((producto) => ({
            id: producto.id,
            nombre: producto.nombre,
            sku: producto.sku,
            stockActual: toStockActual(producto),
            stockMinimo: toStockMinimo(producto),
          }))
          .filter((producto) => producto.stockActual <= producto.stockMinimo)

        const categoriasUnicas = new Set(categorias.map((categoria) => categoria.nombre.trim().toLowerCase()))

        if (!isMounted) return
        setState({
          valorTotal,
          totalProductos: productos.length,
          productosStockBajo,
          totalCategorias: categoriasUnicas.size,
          movimientos: movimientos.slice(0, 10),
          loading: false,
          error: null,
        })
      } catch {
        if (!isMounted) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No se pudo cargar el dashboard de inventario.',
        }))
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  return state
}

