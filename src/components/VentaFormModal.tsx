import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { crearVenta } from '@/api/venta'
import type { Cliente } from '@/types/cliente'
import type { Producto } from '@/types/producto'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ModalShell, { RequiredMark } from '@/components/ModalShell'

type SaleItemForm = {
  productId: string
  quantity: number
}

interface VentaFormModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  clients: Cliente[]
  products: Producto[]
  canCreate?: boolean
}

const euro = (value: number) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export default function VentaFormModal({ open, onClose, onCreated, clients, products, canCreate = true }: VentaFormModalProps) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<SaleItemForm[]>([{ productId: '', quantity: 1 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedClientId('')
    setNotes('')
    setItems([{ productId: '', quantity: 1 }])
  }, [open])

  const addItem = () => setItems((prev) => [...prev, { productId: '', quantity: 1 }])

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [{ productId: '', quantity: 1 }]
    })
  }

  const updateItem = (index: number, patch: Partial<SaleItemForm>) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const productById = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products])

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = productById.get(item.productId)
        if (!product) return sum
        return sum + product.precioUnitario * Math.max(1, Number(item.quantity) || 1)
      }, 0),
    [items, productById],
  )

  const isFormValid = useMemo(() => {
    if (!canCreate) return false
    if (!Number(selectedClientId)) return false
    const validItems = items
      .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
      .filter((item) => !Number.isNaN(item.productId) && item.productId > 0 && item.quantity > 0)
    if (validItems.length === 0) return false
    const ids = validItems.map((item) => item.productId)
    return new Set(ids).size === ids.length
  }, [canCreate, selectedClientId, items])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canCreate) return
    const clientId = Number(selectedClientId)
    if (!clientId) {
      toast.error('Selecciona un cliente')
      return
    }

    const payloadItems = items
      .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
      .filter((item) => !Number.isNaN(item.productId) && item.quantity > 0)

    if (payloadItems.length === 0) {
      toast.error('Añade al menos un producto')
      return
    }

    if (new Set(payloadItems.map((item) => item.productId)).size !== payloadItems.length) {
      toast.error('No puedes repetir productos')
      return
    }

    setSaving(true)
    try {
      await crearVenta({
        clientId,
        notas: notes.trim() || undefined,
        items: payloadItems,
      })
      toast.success('Venta creada correctamente')
      onClose()
      onCreated()
    } catch {
      toast.error('No se pudo crear la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Nueva venta"
      description="Registra una venta y descuenta automáticamente el stock."
      widthClassName="max-w-[650px]"
    >
      <form onSubmit={handleSubmit} className="space-y-7 px-4 py-4">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Cliente <RequiredMark />
            </label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="h-12 w-full rounded-2xl border-border bg-transparent px-4 text-base">
                <SelectValue placeholder="Selecciona cliente" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={6} viewportClassName="max-h-[360px] overflow-y-auto">
                {clients
                  .filter((client) => client.activo)
                  .map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">Notas</label>
            <Input
              placeholder="Notas opcionales"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="h-12 rounded-2xl border-border bg-transparent px-4 text-base"
            />
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Productos</h3>

          <div className="grid grid-cols-[2.2fr_0.72fr_0.95fr_0.95fr_0.72fr] items-end gap-x-4 px-1 pb-2 text-sm text-foreground/85">
            <p>Producto</p>
            <p>Cantidad</p>
            <p>Precio</p>
            <p>Subtotal</p>
            <span />
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const product = productById.get(item.productId)
              const quantity = Math.max(1, Number(item.quantity) || 1)
              const subtotal = product ? product.precioUnitario * quantity : null
              return (
                <div key={index} className="grid grid-cols-[2.2fr_0.72fr_0.95fr_0.95fr_0.72fr] items-start gap-x-4 border-t pt-3">
                  <div className="space-y-1">
                    <Select value={item.productId} onValueChange={(value) => updateItem(index, { productId: value })}>
                      <SelectTrigger className="h-6 w-full rounded-2xl border-border bg-transparent px-4 text-base">
                        <SelectValue placeholder="Selecciona producto" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6} viewportClassName="max-h-[360px] overflow-y-auto">
                        {products.map((productOption) => (
                          <SelectItem key={productOption.id} value={String(productOption.id)}>
                            {productOption.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="px-1 text-xs text-muted-foreground">
                      {product ? `Disponible: ${product.cantidadActual} unidades` : ' '}
                    </p>
                  </div>

                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, '')
                      const normalized = digitsOnly.replace(/^0+(?=\d)/, '')
                      const nextQuantity = normalized === '' ? 1 : Number(normalized)
                      updateItem(index, { quantity: nextQuantity })
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => event.currentTarget.select()}
                    onMouseUp={(event) => event.preventDefault()}
                    onBlur={() => {
                      if (!Number.isFinite(item.quantity) || item.quantity < 1) {
                        updateItem(index, { quantity: 1 })
                      }
                    }}
                    className="h-9 rounded-2xl border-border bg-transparent px-3 text-base"
                  />

                  <p className="pt-3 text-base">{product ? euro(product.precioUnitario) : '–'}</p>
                  <p className="pt-3 text-base">{subtotal != null ? euro(subtotal) : '–'}</p>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="h-11 rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-accent"
                  >
                    Quitar
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={addItem}
              className="h-11 rounded-2xl border border-border px-5 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              + Añadir producto
            </button>
            <div className="flex items-center gap-6 pr-1">
              <span className="text-2xl text-foreground/90">Total</span>
              <span className="text-4xl font-semibold text-foreground">{euro(total)}</span>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 pt-4 pb-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl px-5 text-base font-medium text-foreground transition hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !canCreate || !isFormValid}
            className="h-11 rounded-2xl bg-black px-6 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Crear venta'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
