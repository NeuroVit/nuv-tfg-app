import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarBundle, crearBundle, getBundleItems } from '@/features/bundles/api/bundle'
import type { BundleSummary, BundleUpsertRequest } from '@/features/bundles/types/bundle'
import type { Producto } from '@/features/productos/types/producto'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ModalShell, { ModalSection, RequiredMark } from '@/components/ModalShell'
import { parseApiError } from '@/lib/apiError'

type BundleFormItem = {
  productoId: string
  cantidad: number
}

type BundleFormState = {
  nombre: string
  descripcion: string
  descuentoPct: string
  activo: boolean
  items: BundleFormItem[]
}

const emptyBundleForm: BundleFormState = {
  nombre: '',
  descripcion: '',
  descuentoPct: '0',
  activo: true,
  items: [{ productoId: '', cantidad: 1 }],
}

interface BundleFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  bundle?: BundleSummary | null
  productos: Producto[]
}

export default function BundleFormModal({ open, onClose, onSaved, bundle, productos }: BundleFormModalProps) {
  const isEdit = !!bundle
  const [form, setForm] = useState<BundleFormState>(emptyBundleForm)
  const [saving, setSaving] = useState(false)
  const [footerError, setFooterError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFooterError(null)
    if (!bundle) {
      setForm(emptyBundleForm)
      return
    }
    let cancelled = false
    getBundleItems(bundle.id)
      .then((items) => {
        if (cancelled) return
        setForm({
          nombre: bundle.nombre,
          descripcion: bundle.descripcion ?? '',
          descuentoPct: String(bundle.descuentoPct),
          activo: bundle.activo,
          items: items.length
            ? items.map((item) => ({ productoId: String(item.productoId), cantidad: item.cantidad }))
            : [{ productoId: '', cantidad: 1 }],
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        toast.error(parseApiError(error, 'No se pudo abrir el bundle para edición'))
        onClose()
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bundle])

  const addItemRow = () => {
    setForm((current) => ({ ...current, items: [...current.items, { productoId: '', cantidad: 1 }] }))
  }

  const removeItemRow = (index: number) => {
    setForm((current) => {
      const updated = current.items.filter((_, idx) => idx !== index)
      return { ...current, items: updated.length ? updated : [{ productoId: '', cantidad: 1 }] }
    })
  }

  const updateItemProducto = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, productoId: value } : item)),
    }))
  }

  const updateItemCantidad = (index: number, value: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, cantidad: value } : item)),
    }))
  }

  const buildPayload = (): BundleUpsertRequest | null => {
    const nombre = form.nombre.trim()
    if (!nombre) {
      toast.error('El nombre del bundle es obligatorio')
      return null
    }

    const descuento = Number(form.descuentoPct)
    if (Number.isNaN(descuento) || descuento < 0 || descuento > 100) {
      toast.error('El descuento debe estar entre 0 y 100')
      return null
    }

    const selectedItems = form.items
      .map((item) => ({ productoId: Number(item.productoId), cantidad: Number(item.cantidad) }))
      .filter((item) => !Number.isNaN(item.productoId))

    if (selectedItems.length === 0) {
      toast.error('Debes agregar al menos un producto al bundle')
      return null
    }

    if (selectedItems.some((item) => item.cantidad < 1)) {
      toast.error('La cantidad por producto debe ser mayor o igual a 1')
      return null
    }

    const ids = selectedItems.map((item) => item.productoId)
    if (new Set(ids).size !== ids.length) {
      toast.error('No puedes repetir el mismo producto dentro del bundle')
      return null
    }

    return {
      nombre,
      descripcion: form.descripcion.trim() || undefined,
      descuentoPct: descuento,
      activo: form.activo,
      items: selectedItems,
    }
  }

  const isFormValid = useMemo(() => {
    if (!form.nombre.trim()) return false
    const descuento = Number(form.descuentoPct)
    if (Number.isNaN(descuento) || descuento < 0 || descuento > 100) return false
    const selected = form.items
      .map((item) => ({ productoId: Number(item.productoId), cantidad: Number(item.cantidad) }))
      .filter((item) => item.productoId > 0)
    if (selected.length === 0) return false
    if (selected.some((item) => !Number.isFinite(item.cantidad) || item.cantidad < 1)) return false
    const ids = selected.map((item) => item.productoId)
    return new Set(ids).size === ids.length
  }, [form])

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }),
    [],
  )

  const safeDiscount = useMemo(() => {
    const parsed = Number(form.descuentoPct)
    if (!Number.isFinite(parsed)) return 0
    return Math.min(100, Math.max(0, parsed))
  }, [form.descuentoPct])

  const lineItems = useMemo(
    () =>
      form.items.map((item) => {
        const selectedProduct = productos.find((producto) => String(producto.id) === item.productoId) ?? null
        const basePrice = selectedProduct?.precioUnitario ?? 0
        const subtotalBase = basePrice * item.cantidad
        return {
          item,
          selectedProduct,
          basePrice,
          subtotalBase,
        }
      }),
    [form.items, productos],
  )

  const subtotalProductos = useMemo(() => lineItems.reduce((acc, row) => acc + row.subtotalBase, 0), [lineItems])
  const descuentoImporte = useMemo(() => subtotalProductos * (safeDiscount / 100), [safeDiscount, subtotalProductos])
  const totalEstimado = useMemo(() => subtotalProductos - descuentoImporte, [descuentoImporte, subtotalProductos])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFooterError(null)
    const payload = buildPayload()
    if (!payload) return

    setSaving(true)
    try {
      if (isEdit && bundle) {
        await actualizarBundle(bundle.id, payload)
        toast.success(`Bundle "${payload.nombre}" actualizado correctamente.`)
      } else {
        await crearBundle(payload)
        toast.success(`Bundle "${payload.nombre}" creado correctamente.`)
      }
      onClose()
      onSaved()
    } catch (error: unknown) {
      setFooterError(parseApiError(error, 'No se pudo guardar el bundle'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar bundle' : 'Nuevo bundle'}
      description="Configura el bundle, su descuento y los productos que incluye."
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <ModalSection title="Información básica">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nombre <RequiredMark /></label>
                <Input
                  value={form.nombre}
                  onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                  placeholder="Ej. Pack Home Office"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Descuento (%) <RequiredMark /></label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.descuentoPct}
                  onChange={(event) => setForm((current) => ({ ...current, descuentoPct: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Estado</label>
                <Select
                  value={form.activo ? 'true' : 'false'}
                  onValueChange={(value) => setForm((current) => ({ ...current, activo: value === 'true' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Productos</label>
                <div className="flex h-9 items-center justify-between rounded-4xl border border-input bg-input/30 px-3 text-sm text-foreground">
                  <span>{form.items.length}</span>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Descripción (opcional)</label>
              <Textarea
                rows={3}
                value={form.descripcion}
                onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                placeholder="Incluye productos esenciales con descuento para compra conjunta."
              />
            </div>
          </ModalSection>

          <ModalSection title="Productos del bundle" className="border-t pt-5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-input px-4 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                Añadir producto
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border">
              <div className="grid grid-cols-1 gap-2 border-b bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground lg:grid-cols-[minmax(0,1fr)_92px_112px_112px_44px]">
                <p>Producto</p>
                <p>Cantidad</p>
                <p className="lg:text-right">Precio base</p>
                <p className="lg:text-right">Subtotal</p>
                <p className="text-right"> </p>
              </div>

              <div className="divide-y">
                {lineItems.map(({ item, selectedProduct, basePrice, subtotalBase }, index) => (
                  <div key={index} className="grid grid-cols-1 gap-2 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_92px_112px_112px_44px] lg:items-start">
                    <div>
                      <Select value={item.productoId} onValueChange={(value) => updateItemProducto(index, value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((producto) => (
                            <SelectItem key={producto.id} value={String(producto.id)}>
                              {producto.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Disponible: {selectedProduct?.cantidadActual ?? 0} unidades
                      </p>
                    </div>

                    <Input
                      className="mt-0.5"
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(event) => updateItemCantidad(index, Number(event.target.value))}
                    />

                    <p className="mt-1 text-base tabular-nums text-foreground lg:text-right">{currencyFormatter.format(basePrice)}</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-foreground lg:text-right">{currencyFormatter.format(subtotalBase)}</p>

                    <div className="mt-0.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                        aria-label="Quitar producto"
                        title="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full rounded-2xl border bg-muted/20 p-4 sm:w-[420px]">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal productos</span>
                    <span className="font-medium text-foreground">{currencyFormatter.format(subtotalProductos)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Descuento ({safeDiscount.toFixed(0)}%)</span>
                    <span className="font-medium text-red-600">-{currencyFormatter.format(descuentoImporte)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between text-xl font-semibold">
                    <span>Total estimado</span>
                    <span>{currencyFormatter.format(totalEstimado)}</span>
                  </div>
                </div>
              </div>
            </div>
          </ModalSection>
        </div>

        <div className="border-t px-6 py-4">
          {footerError ? <p className="mb-2 text-right text-xs text-red-600">{footerError}</p> : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !isFormValid}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar bundle'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
