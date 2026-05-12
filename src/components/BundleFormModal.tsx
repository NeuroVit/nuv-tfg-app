import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { actualizarBundle, crearBundle, getBundleItems } from '@/api/bundle'
import type { BundleSummary, BundleUpsertRequest } from '@/types/bundle'
import type { Producto } from '@/types/producto'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ModalShell, { ModalFooter, ModalSection, ModalSubmitButton, RequiredMark } from '@/components/ModalShell'
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
      widthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        <ModalSection title="Información básica">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descripción (opcional)</label>
            <Textarea
              rows={3}
              value={form.descripcion}
              onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Estado</label>
            <Select
              value={form.activo ? 'true' : 'false'}
              onValueChange={(value) => setForm((current) => ({ ...current, activo: value === 'true' }))}
            >
              <SelectTrigger className="w-full md:w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ModalSection>

        <ModalSection title="Productos del bundle" className="border-t pt-4">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={addItemRow}
              className="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Añadir producto
            </button>
          </div>

          <div className="space-y-2">
            {form.items.map((item, index) => {
              const selectedProduct = productos.find((producto) => String(producto.id) === item.productoId) ?? null
              const basePrice = selectedProduct?.precioUnitario ?? 0
              const discount = Number(form.descuentoPct)
              const safeDiscount = Number.isFinite(discount) ? Math.min(100, Math.max(0, discount)) : 0
              const subtotal = basePrice * item.cantidad * (1 - safeDiscount / 100)

              return (
                <div key={index} className="space-y-2 rounded-md border p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_auto]">
                    <Select value={item.productoId} onValueChange={(value) => updateItemProducto(index, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {productos.map((producto) => (
                          <SelectItem key={producto.id} value={String(producto.id)}>
                            {producto.nombre} ({producto.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(event) => updateItemCantidad(index, Number(event.target.value))}
                    />

                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                    >
                      Quitar
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Precio base: €{basePrice.toFixed(2)} · Subtotal estimado línea: €{subtotal.toFixed(2)}
                  </p>
                </div>
              )
            })}
          </div>
        </ModalSection>

        <ModalFooter onCancel={onClose} error={footerError}>
          <ModalSubmitButton disabled={saving || !isFormValid}>
            {saving ? 'Guardando…' : 'Guardar bundle'}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </ModalShell>
  )
}
