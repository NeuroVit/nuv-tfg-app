import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { crearPedidoProveedor } from '@/features/pedidosproveedor/api/providerOrder'
import type { Producto } from '@/features/productos/types/producto'
import type { Proveedor } from '@/features/proveedores/types/provider'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker, formatDayKey, parseDayKey } from '@/components/ui/date-picker'
import ModalShell, { ModalFooter, ModalSection, ModalSubmitButton, RequiredMark } from '@/components/ModalShell'
import { userDayKeyToUtcDateKey } from '@/lib/datetime'
import { parseApiError } from '@/lib/apiError'
import { useFormatters } from '@/lib/useFormatters'

type OrderItemForm = {
  productoId: string
  cantidad: number
  precioUnitario: number
}

interface PedidoFormModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  provider: Proveedor | null
  providerProducts: Producto[]
  prefillProductId?: number | null
}

export default function PedidoFormModal({
  open,
  onClose,
  onCreated,
  provider,
  providerProducts,
  prefillProductId = null,
}: PedidoFormModalProps) {
  const { timeZone, userTodayKey } = useFormatters()
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }),
    [],
  )
  const [arrivalDate, setArrivalDate] = useState<string>(userTodayKey())
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<OrderItemForm[]>([{ productoId: '', cantidad: 1, precioUnitario: 0 }])
  const [creating, setCreating] = useState(false)
  const [footerError, setFooterError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const prefillProduct =
      prefillProductId != null
        ? providerProducts.find((product) => product.id === prefillProductId) ?? null
        : null
    const suggestedQuantity = prefillProduct
      ? Math.max(prefillProduct.nivelMinimoStock - prefillProduct.cantidadActual, 1)
      : 1

    setArrivalDate(userTodayKey())
    setNotes('')
    setItems([
      prefillProduct
        ? {
            productoId: String(prefillProduct.id),
            cantidad: suggestedQuantity,
            precioUnitario: prefillProduct.costoUnitario ?? prefillProduct.precioUnitario ?? 0,
          }
        : { productoId: '', cantidad: 1, precioUnitario: 0 },
    ])
    setFooterError(null)
  }, [open, prefillProductId, providerProducts, userTodayKey])

  const recommendedOrderDate = useMemo(() => {
    if (!provider) return null
    const arrival = parseDayKey(arrivalDate)
    if (!arrival) return null
    arrival.setDate(arrival.getDate() - provider.diasEntrega)
    return formatDayKey(arrival)
  }, [arrivalDate, provider])

  const addItem = () => {
    setItems((current) => [...current, { productoId: '', cantidad: 1, precioUnitario: 0 }])
  }

  const removeItem = (index: number) => {
    setItems((current) => {
      const next = current.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [{ productoId: '', cantidad: 1, precioUnitario: 0 }]
    })
  }

  const updateItem = (index: number, patch: Partial<OrderItemForm>) => {
    setItems((current) => current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const isFormValid = useMemo(() => {
    if (!provider) return false
    if (!arrivalDate || !parseDayKey(arrivalDate)) return false
    const selected = items
      .map((item) => ({
        productoId: Number(item.productoId),
        cantidad: Number(item.cantidad),
        precioUnitario: Number(item.precioUnitario),
      }))
      .filter((item) => item.productoId > 0)
    if (selected.length === 0) return false
    if (selected.some((item) => !Number.isFinite(item.cantidad) || item.cantidad < 1)) return false
    if (selected.some((item) => !Number.isFinite(item.precioUnitario) || item.precioUnitario <= 0)) return false
    const ids = selected.map((item) => item.productoId)
    return new Set(ids).size === ids.length
  }, [provider, arrivalDate, items])

  const totalPedido = useMemo(
    () =>
      items.reduce((acc, item) => {
        const productoId = Number(item.productoId)
        const cantidad = Number(item.cantidad)
        const precioUnitario = Number(item.precioUnitario)
        if (productoId <= 0 || !Number.isFinite(cantidad) || !Number.isFinite(precioUnitario)) return acc
        return acc + cantidad * precioUnitario
      }, 0),
    [items],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFooterError(null)
    if (!provider) return

    const payloadItems = items
      .map((item) => ({
        productoId: Number(item.productoId),
        cantidad: Number(item.cantidad),
        precioUnitario: Number(item.precioUnitario),
      }))
      .filter((item) => item.productoId > 0)

    if (payloadItems.length === 0) {
      toast.error('Debes seleccionar al menos un producto')
      return
    }
    if (payloadItems.some((item) => item.cantidad < 1)) {
      toast.error('La cantidad debe ser mayor o igual a 1')
      return
    }
    if (payloadItems.some((item) => !Number.isFinite(item.precioUnitario) || item.precioUnitario <= 0)) {
      toast.error('El precio unitario debe ser mayor a 0')
      return
    }

    const ids = payloadItems.map((item) => item.productoId)
    if (new Set(ids).size !== ids.length) {
      toast.error('No puedes repetir productos en el mismo pedido')
      return
    }

    setCreating(true)
    try {
      const utcDate = userDayKeyToUtcDateKey(arrivalDate, timeZone)
      if (!utcDate) {
        toast.error('Fecha inválida')
        setCreating(false)
        return
      }
      await crearPedidoProveedor(provider.id, {
        fechaLlegadaDeseada: utcDate,
        notas: notes.trim() || undefined,
        items: payloadItems,
      })
      onClose()
      onCreated()
      toast.success('Pedido creado en estado DRAFT')
    } catch (error: unknown) {
      setFooterError(parseApiError(error, 'No se pudo crear el pedido'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Crear pedido para ${provider?.nombre ?? ''}`}
      description="Indica la fecha de llegada deseada y las líneas del pedido."
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        <ModalSection title="Fechas y notas">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Fecha de llegada deseada <RequiredMark /></label>
              <DatePicker
                value={arrivalDate}
                onChange={setArrivalDate}
                timeZone={timeZone}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Fecha de pedido recomendada</label>
              <Input value={recommendedOrderDate ?? '—'} readOnly />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notas (opcional)</label>
            <Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </ModalSection>

        <ModalSection title="Productos" className="border-t pt-4">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              + Añadir línea
            </button>
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded-md p-3 md:grid-cols-[minmax(0,1fr)_88px_120px_120px_auto]">
              <Select
                value={item.productoId}
                onValueChange={(value) => {
                  const selectedProduct = providerProducts.find((product) => String(product.id) === value)
                  updateItem(index, {
                    productoId: value,
                    precioUnitario: selectedProduct?.costoUnitario ?? selectedProduct?.precioUnitario ?? 0,
                  })
                }}
              >
                <SelectTrigger className="w-full min-w-0 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {providerProducts.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      <span className="block max-w-full truncate">{product.nombre} ({product.sku})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={item.cantidad}
                onChange={(event) => updateItem(index, { cantidad: Number(event.target.value) })}
                className="w-[88px] text-right"
              />
              <div className="flex h-9 items-center px-3 text-sm text-foreground">
                {item.productoId ? currencyFormatter.format(Number(item.precioUnitario || 0)) : '—'}
              </div>
              <div className="flex h-9 items-center px-3 text-sm font-medium text-foreground">
                {item.productoId
                  ? currencyFormatter.format(Number(item.cantidad || 0) * Number(item.precioUnitario || 0))
                  : '—'}
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Quitar línea"
                title="Quitar línea"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-3">
            <p className="text-sm text-muted-foreground">
              Total pedido:{' '}
              <span className="font-semibold text-foreground">{currencyFormatter.format(totalPedido)}</span>
            </p>
          </div>
        </ModalSection>

        <ModalFooter onCancel={onClose} error={footerError}>
          <ModalSubmitButton disabled={creating || !isFormValid}>
            {creating ? 'Creando…' : 'Crear pedido (DRAFT)'}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </ModalShell>
  )
}
