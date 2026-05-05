import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import client from '@/api/client'
import type { ApiError, Categoria } from '@/types/api'
import type { Producto } from '@/types/producto'
import type { Proveedor } from '@/types/provider'

interface ProductoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  producto?: Producto | null
}

type FormState = {
  nombre: string
  categoriaId: string
  providerId: string
  sku: string
  stockActual: string
  stockMinimo: string
  precio: string
  costoUnitario: string
}

const initialForm: FormState = {
  nombre: '',
  categoriaId: '',
  providerId: '',
  sku: '',
  stockActual: '0',
  stockMinimo: '1',
  precio: '0.01',
  costoUnitario: '0.01',
}

type FieldErrors = Partial<Record<keyof FormState, string>>
type FieldTouched = Partial<Record<keyof FormState, boolean>>

export default function ProductoModal({ isOpen, onClose, onSuccess, producto }: ProductoModalProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [touched, setTouched] = useState<FieldTouched>({})
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [footerError, setFooterError] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [saving, setSaving] = useState(false)

  const isEditMode = !!producto

  useEffect(() => {
    if (!isOpen) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return

    const loadCatalogs = async () => {
      try {
        const [{ data: categoriasData }, { data: proveedoresData }] = await Promise.all([
          client.get<Categoria[]>('/categorias'),
          client.get<Proveedor[]>('/proveedores', { params: { includeArchived: false } }),
        ])
        setCategorias(categoriasData)
        setProveedores(proveedoresData)
      } catch {
        setCategorias([])
        setProveedores([])
      }
    }

    void loadCatalogs()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    if (producto) {
      setForm({
        nombre: producto.nombre,
        categoriaId: producto.categoriaId ? String(producto.categoriaId) : '',
        providerId: producto.providerId ? String(producto.providerId) : '',
        sku: producto.sku,
        stockActual: String(producto.cantidadActual ?? 0),
        stockMinimo: String(producto.nivelMinimoStock ?? 1),
        precio: String(producto.precioUnitario ?? 0.01),
        costoUnitario: String(producto.costoUnitario ?? producto.precioUnitario ?? 0.01),
      })
    } else {
      setForm(initialForm)
    }
    setTouched({})
    setServerErrors({})
    setFooterError(null)
  }, [isOpen, producto])

  const clientErrors = useMemo(() => {
    const errors: FieldErrors = {}
    const nombre = form.nombre.trim()
    const stockActual = Number(form.stockActual)
    const stockMinimo = Number(form.stockMinimo)
    const precio = Number(form.precio)
    const costoUnitario = Number(form.costoUnitario)

    if (nombre.length < 2) errors.nombre = 'El nombre debe tener al menos 2 caracteres.'
    if (!form.categoriaId) errors.categoriaId = 'Selecciona una categoría.'
    if (!form.providerId) errors.providerId = 'Selecciona un proveedor.'
    if (!form.sku.trim()) errors.sku = 'El SKU es obligatorio.'
    if (!Number.isFinite(stockActual) || stockActual < 0) errors.stockActual = 'Debe ser 0 o mayor.'
    if (!Number.isFinite(stockMinimo) || stockMinimo < 1) errors.stockMinimo = 'Debe ser 1 o mayor.'
    if (!Number.isFinite(precio) || precio < 0.01) errors.precio = 'Debe ser 0.01 o mayor.'
    if (!Number.isFinite(costoUnitario) || costoUnitario < 0.01) errors.costoUnitario = 'Debe ser 0.01 o mayor.'
    return errors
  }, [form])

  const mergedErrors: FieldErrors = { ...clientErrors, ...serverErrors }
  const hasValidationErrors = Object.keys(clientErrors).length > 0
  const showStockWarning = Number(form.stockActual) < Number(form.stockMinimo)

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setServerErrors((prev) => ({ ...prev, [field]: undefined }))
    setFooterError(null)
  }

  const markTouched = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const autoGenerateSku = () => {
    const selectedCategoria = categorias.find((categoria) => String(categoria.id) === form.categoriaId)
    const base = (selectedCategoria?.nombre ?? 'GEN')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, 'X')
    const random = Math.floor(Math.random() * 900) + 100
    updateField('sku', `${base}-${random}`)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched({
      nombre: true,
      categoriaId: true,
      providerId: true,
      sku: true,
      stockActual: true,
      stockMinimo: true,
      precio: true,
      costoUnitario: true,
    })
    setServerErrors({})
    setFooterError(null)
    if (hasValidationErrors) return

    const payload = {
      nombre: form.nombre.trim(),
      categoriaId: Number(form.categoriaId),
      providerId: Number(form.providerId),
      sku: form.sku.trim(),
      cantidadActual: Number(form.stockActual),
      nivelMinimoStock: Number(form.stockMinimo),
      precioUnitario: Number(form.precio),
      costoUnitario: Number(form.costoUnitario),
    }

    try {
      setSaving(true)
      if (isEditMode && producto) {
        await client.put(`/productos/${producto.id}`, payload)
      } else {
        await client.post('/productos', payload)
      }
      onClose()
      onSuccess()
    } catch (error: unknown) {
      if (isAxiosError<ApiError>(error) && error.response?.status === 400) {
        const apiErrors = error.response.data?.errors ?? []
        const mappedErrors: FieldErrors = {}
        for (const item of apiErrors) {
          if (item.field === 'nombre') mappedErrors.nombre = item.message
          if (item.field === 'categoriaId') mappedErrors.categoriaId = item.message
          if (item.field === 'providerId') mappedErrors.providerId = item.message
          if (item.field === 'sku') mappedErrors.sku = item.message
          if (item.field === 'cantidadActual' || item.field === 'stockActual') mappedErrors.stockActual = item.message
          if (item.field === 'nivelMinimoStock' || item.field === 'stockMinimo') mappedErrors.stockMinimo = item.message
          if (item.field === 'precioUnitario' || item.field === 'precio') mappedErrors.precio = item.message
          if (item.field === 'costoUnitario') mappedErrors.costoUnitario = item.message
        }
        setServerErrors(mappedErrors)
      } else {
        setFooterError('No se pudo guardar el producto. Inténtalo de nuevo.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[560px] rounded-2xl border bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Editar producto' : 'Nuevo producto'}</h2>
            <p className="mt-1 text-sm text-gray-500">Completa la información del producto para guardarlo en inventario.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Información básica</h3>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <input
                value={form.nombre}
                onChange={(event) => updateField('nombre', event.target.value)}
                onBlur={() => markTouched('nombre')}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                  touched.nombre && mergedErrors.nombre ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                }`}
              />
              {touched.nombre && mergedErrors.nombre && <p className="text-xs text-red-600">{mergedErrors.nombre}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <select
                value={form.categoriaId}
                onChange={(event) => updateField('categoriaId', event.target.value)}
                onBlur={() => markTouched('categoriaId')}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition ${
                  touched.categoriaId && mergedErrors.categoriaId ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                }`}
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
              {touched.categoriaId && mergedErrors.categoriaId && <p className="text-xs text-red-600">{mergedErrors.categoriaId}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Proveedor</label>
              <select
                value={form.providerId}
                onChange={(event) => updateField('providerId', event.target.value)}
                onBlur={() => markTouched('providerId')}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition ${
                  touched.providerId && mergedErrors.providerId ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                }`}
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
              {touched.providerId && mergedErrors.providerId && <p className="text-xs text-red-600">{mergedErrors.providerId}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">SKU</label>
              <div className="flex gap-2">
                <input
                  value={form.sku}
                  onChange={(event) => updateField('sku', event.target.value)}
                  onBlur={() => markTouched('sku')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.sku && mergedErrors.sku ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={autoGenerateSku}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Auto <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              {touched.sku && mergedErrors.sku && <p className="text-xs text-red-600">{mergedErrors.sku}</p>}
            </div>
          </section>

          <section className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Stock y precio</h3>

            {showStockWarning && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>El stock actual ({form.stockActual}) está por debajo del mínimo ({form.stockMinimo}). Se creará una alerta automáticamente al guardar.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Stock actual</label>
                <input
                  type="number"
                  min={0}
                  value={form.stockActual}
                  onChange={(event) => updateField('stockActual', event.target.value)}
                  onBlur={() => markTouched('stockActual')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.stockActual && mergedErrors.stockActual ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                  }`}
                />
                {touched.stockActual && mergedErrors.stockActual && <p className="text-xs text-red-600">{mergedErrors.stockActual}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Stock mínimo</label>
                <input
                  type="number"
                  min={1}
                  value={form.stockMinimo}
                  onChange={(event) => updateField('stockMinimo', event.target.value)}
                  onBlur={() => markTouched('stockMinimo')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.stockMinimo && mergedErrors.stockMinimo ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                  }`}
                />
                {touched.stockMinimo && mergedErrors.stockMinimo && <p className="text-xs text-red-600">{mergedErrors.stockMinimo}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Precio (€)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.precio}
                  onChange={(event) => updateField('precio', event.target.value)}
                  onBlur={() => markTouched('precio')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.precio && mergedErrors.precio ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                  }`}
                />
                {touched.precio && mergedErrors.precio && <p className="text-xs text-red-600">{mergedErrors.precio}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Coste unitario (€)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.costoUnitario}
                  onChange={(event) => updateField('costoUnitario', event.target.value)}
                  onBlur={() => markTouched('costoUnitario')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.costoUnitario && mergedErrors.costoUnitario ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200 focus:border-gray-400'
                  }`}
                />
                {touched.costoUnitario && mergedErrors.costoUnitario && <p className="text-xs text-red-600">{mergedErrors.costoUnitario}</p>}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <div className="text-right">
              {footerError && <p className="mb-1 text-xs text-red-600">{footerError}</p>}
              <button
                type="submit"
                disabled={saving || hasValidationErrors}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar producto'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
