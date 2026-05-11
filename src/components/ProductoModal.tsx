import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import client from '@/api/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
        className="w-full max-w-[560px] rounded-2xl border bg-sidebar-active text-sidebar-active-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{isEditMode ? 'Editar producto' : 'Nuevo producto'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Completa la información del producto para guardarlo en inventario.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Información básica</h3>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre</label>
              <input
                value={form.nombre}
                onChange={(event) => updateField('nombre', event.target.value)}
                onBlur={() => markTouched('nombre')}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                  touched.nombre && mergedErrors.nombre ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
                }`}
              />
              {touched.nombre && mergedErrors.nombre && <p className="text-xs text-red-600">{mergedErrors.nombre}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select
                value={form.categoriaId}
                onValueChange={(value) => {
                  updateField('categoriaId', value)
                  markTouched('categoriaId')
                }}
              >
                <SelectTrigger
                  aria-invalid={touched.categoriaId && mergedErrors.categoriaId ? true : undefined}
                  className={`w-full rounded-xl bg-sidebar-active ${
                    touched.categoriaId && mergedErrors.categoriaId ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
                  }`}
                >
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={String(categoria.id)}>
                      {categoria.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.categoriaId && mergedErrors.categoriaId && <p className="text-xs text-red-600">{mergedErrors.categoriaId}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Proveedor</label>
              <Select
                value={form.providerId}
                onValueChange={(value) => {
                  updateField('providerId', value)
                  markTouched('providerId')
                }}
              >
                <SelectTrigger
                  aria-invalid={touched.providerId && mergedErrors.providerId ? true : undefined}
                  className={`w-full rounded-xl bg-sidebar-active ${
                    touched.providerId && mergedErrors.providerId ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
                  }`}
                >
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                      {proveedor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.providerId && mergedErrors.providerId && <p className="text-xs text-red-600">{mergedErrors.providerId}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">SKU</label>
              <div className="flex gap-2">
                <input
                  value={form.sku}
                  onChange={(event) => updateField('sku', event.target.value)}
                  onBlur={() => markTouched('sku')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.sku && mergedErrors.sku ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
                  }`}
                />
                <button
                  type="button"
                  onClick={autoGenerateSku}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  Auto <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              {touched.sku && mergedErrors.sku && <p className="text-xs text-red-600">{mergedErrors.sku}</p>}
            </div>
          </section>

          <section className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stock y precio</h3>

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
                <label className="text-sm font-medium text-foreground">Stock actual</label>
                <input
                  type="number"
                  min={0}
                  value={form.stockActual}
                  onChange={(event) => updateField('stockActual', event.target.value)}
                  onBlur={() => markTouched('stockActual')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.stockActual && mergedErrors.stockActual ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
                  }`}
                />
                {touched.stockActual && mergedErrors.stockActual && <p className="text-xs text-red-600">{mergedErrors.stockActual}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Stock mínimo</label>
                <input
                  type="number"
                  min={1}
                  value={form.stockMinimo}
                  onChange={(event) => updateField('stockMinimo', event.target.value)}
                  onBlur={() => markTouched('stockMinimo')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.stockMinimo && mergedErrors.stockMinimo ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
                  }`}
                />
                {touched.stockMinimo && mergedErrors.stockMinimo && <p className="text-xs text-red-600">{mergedErrors.stockMinimo}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Precio (€)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.precio}
                  onChange={(event) => updateField('precio', event.target.value)}
                  onBlur={() => markTouched('precio')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.precio && mergedErrors.precio ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
                  }`}
                />
                {touched.precio && mergedErrors.precio && <p className="text-xs text-red-600">{mergedErrors.precio}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Coste unitario (€)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.costoUnitario}
                  onChange={(event) => updateField('costoUnitario', event.target.value)}
                  onBlur={() => markTouched('costoUnitario')}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    touched.costoUnitario && mergedErrors.costoUnitario ? 'border-red-500 ring-2 ring-red-100' : 'border-input focus:border-ring'
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
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Cancelar
            </button>
            <div className="text-right">
              {footerError && <p className="mb-1 text-xs text-red-600">{footerError}</p>}
              <button
                type="submit"
                disabled={saving || hasValidationErrors}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
