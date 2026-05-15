import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { getBundleItems, getBundles } from '@/features/bundles/api/bundle'
import { crearVenta } from '@/features/ventas/api/venta'
import { parseApiError } from '@/lib/apiError'
import type { BundleItem, BundleSummary } from '@/features/bundles/types/bundle'
import type { Cliente } from '@/features/clientes/types/cliente'
import type { Producto } from '@/features/productos/types/producto'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ModalShell, { RequiredMark } from '@/components/ModalShell'

type SaleItemForm = {
  productId: string
  quantity: string
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

type SaleErrorPayload = {
  message?: string
  mensaje?: string
  error?: string
  errors?: Array<{ field?: string; message?: string } | string>
  reasons?: string[]
  details?: string[]
}

const extractSaleErrorReasons = (error: unknown): string[] => {
  if (!isAxiosError(error)) return []

  const reasons: string[] = []
  const payload = error.response?.data

  if (typeof payload === 'string') {
    const text = payload.trim()
    if (text) reasons.push(text)
  }

  if (payload && typeof payload === 'object') {
    const data = payload as SaleErrorPayload

    const topMessage = data.message ?? data.mensaje ?? data.error
    if (typeof topMessage === 'string' && topMessage.trim()) {
      reasons.push(topMessage.trim())
    }

    if (Array.isArray(data.errors)) {
      for (const item of data.errors) {
        if (typeof item === 'string') {
          const text = item.trim()
          if (text) reasons.push(text)
          continue
        }
        const msg = item?.message?.trim()
        if (!msg) continue
        const field = item.field?.trim()
        reasons.push(field ? `${field}: ${msg}` : msg)
      }
    }

    if (Array.isArray(data.reasons)) {
      for (const reason of data.reasons) {
        const text = reason?.trim()
        if (text) reasons.push(text)
      }
    }

    if (Array.isArray(data.details)) {
      for (const detail of data.details) {
        const text = detail?.trim()
        if (text) reasons.push(text)
      }
    }
  }

  return Array.from(new Set(reasons))
}

const buildSaleErrorToastMessage = (reasons: string[], fallback: string): string => {
  if (reasons.length === 0) return fallback
  if (reasons.length === 1) return reasons[0]
  return ['No se pudo crear la venta por:', ...reasons.map((reason) => `• ${reason}`)].join('\n')
}

export default function VentaFormModal({ open, onClose, onCreated, clients, products, canCreate = true }: VentaFormModalProps) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<SaleItemForm[]>([{ productId: '', quantity: '1' }])
  const [bundles, setBundles] = useState<BundleSummary[]>([])
  const [bundleSectionOpen, setBundleSectionOpen] = useState(false)
  const [selectedBundleId, setSelectedBundleId] = useState('none')
  const [bundleQuantityInput, setBundleQuantityInput] = useState('1')
  const [bundleProductsById, setBundleProductsById] = useState<Record<string, BundleItem[]>>({})
  const [loadingBundleProducts, setLoadingBundleProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const bundleRequestRef = useRef(0)

  const resetFormState = () => {
    bundleRequestRef.current += 1
    setSelectedClientId('')
    setNotes('')
    setItems([{ productId: '', quantity: '1' }])
    setBundleSectionOpen(false)
    setSelectedBundleId('none')
    setBundleQuantityInput('1')
    setBundleProductsById({})
    setLoadingBundleProducts(false)
    setSaving(false)
  }

  const handleClose = () => {
    resetFormState()
    onClose()
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getBundles()
      .then((data) => {
        if (cancelled) return
        setBundles(data.filter((bundle) => bundle.activo))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setBundles([])
        toast.error(parseApiError(error, 'No se pudieron cargar los bundles'))
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const handleBundleChange = (value: string) => {
    setSelectedBundleId(value)
    const bundleId = Number(value)
    if (!bundleId || bundleProductsById[value]) {
      setLoadingBundleProducts(false)
      return
    }

    const requestId = bundleRequestRef.current + 1
    bundleRequestRef.current = requestId
    setLoadingBundleProducts(true)
    getBundleItems(bundleId)
      .then((data) => {
        if (bundleRequestRef.current !== requestId) return
        setBundleProductsById((current) => ({ ...current, [value]: data }))
      })
      .catch((error: unknown) => {
        if (bundleRequestRef.current !== requestId) return
        toast.error(parseApiError(error, 'No se pudieron cargar los productos del bundle'))
      })
      .finally(() => {
        if (bundleRequestRef.current === requestId) {
          setLoadingBundleProducts(false)
        }
      })
  }

  const addItem = () => setItems((prev) => [...prev, { productId: '', quantity: '1' }])

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      return next.length > 0 ? next : [{ productId: '', quantity: '1' }]
    })
  }

  const updateItem = (index: number, patch: Partial<SaleItemForm>) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const productById = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products])
  const bundleById = useMemo(() => new Map(bundles.map((bundle) => [String(bundle.id), bundle])), [bundles])
  const selectedBundle = selectedBundleId === 'none' ? null : bundleById.get(selectedBundleId) ?? null
  const bundleProducts = useMemo(
    () => (selectedBundle ? bundleProductsById[selectedBundleId] ?? [] : []),
    [selectedBundle, bundleProductsById, selectedBundleId],
  )
  const bundleDiscountPct = selectedBundle ? Number(selectedBundle.descuentoPct) : 0
  const safeBundleDiscountPct =
    Number.isFinite(bundleDiscountPct) && bundleDiscountPct >= 0 ? Math.min(100, bundleDiscountPct) : 0
  const safeBundleQuantity = Math.max(1, Number(bundleQuantityInput) || 1)

  const directItemsTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = productById.get(item.productId)
        if (!product) return sum
        return sum + product.precioUnitario * Math.max(1, Number(item.quantity) || 1)
      }, 0),
    [items, productById],
  )

  const bundleProductsSubtotal = useMemo(
    () =>
      bundleProducts.reduce((sum, bundleItem) => {
        const product = productById.get(String(bundleItem.productoId))
        if (!product) return sum
        const quantity = Math.max(1, bundleItem.cantidad) * safeBundleQuantity
        return sum + product.precioUnitario * quantity
      }, 0),
    [bundleProducts, productById, safeBundleQuantity],
  )

  const bundleProductsTotal = useMemo(
    () => bundleProductsSubtotal * (1 - safeBundleDiscountPct / 100),
    [bundleProductsSubtotal, safeBundleDiscountPct],
  )

  const bundleDiscountAmount = useMemo(
    () => bundleProductsSubtotal - bundleProductsTotal,
    [bundleProductsSubtotal, bundleProductsTotal],
  )

  const total = useMemo(() => directItemsTotal + bundleProductsTotal, [directItemsTotal, bundleProductsTotal])

  const isFormValid = useMemo(() => {
    if (!canCreate) return false
    if (!Number(selectedClientId)) return false
    const hasSelectedBundle = Number(selectedBundleId) > 0
    const validItems = items
      .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
      .filter((item) => !Number.isNaN(item.productId) && item.productId > 0 && item.quantity > 0)
    if (validItems.length === 0 && !hasSelectedBundle) return false
    const ids = validItems.map((item) => item.productId)
    return new Set(ids).size === ids.length
  }, [canCreate, selectedClientId, selectedBundleId, items])

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
    const payloadBundleId = Number(selectedBundleId)

    if (payloadItems.length === 0 && !payloadBundleId) {
      toast.error('Añade al menos un producto o un bundle')
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
        items: payloadItems.length ? payloadItems : undefined,
        bundles: payloadBundleId
          ? [
              {
                bundleId: payloadBundleId,
                quantity: safeBundleQuantity,
              },
            ]
          : undefined,
      })
      toast.success('Venta creada correctamente')
      handleClose()
      onCreated()
    } catch (error: unknown) {
      const reasons = extractSaleErrorReasons(error)
      const fallback = parseApiError(error, 'No se pudo crear la venta')
      toast.error(buildSaleErrorToastMessage(reasons, fallback))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
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
              <SelectTrigger className="h-12 w-full rounded-2xl border-border px-4 text-base">
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
              className="h-12 rounded-2xl border-border px-4 text-base"
            />
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Bundle / Combo</h3>
            <button
              type="button"
              onClick={() => {
                if (bundleSectionOpen) {
                  setBundleSectionOpen(false)
                  setSelectedBundleId('none')
                  setBundleQuantityInput('1')
                  setLoadingBundleProducts(false)
                  return
                }
                setBundleSectionOpen(true)
              }}
              className="h-10 rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              {bundleSectionOpen ? 'Ocultar bundle' : '+ Añadir bundle'}
            </button>
          </div>

          {bundleSectionOpen && (
            <>
              <div className="grid grid-cols-[2.2fr_0.72fr_0.95fr_0.95fr_0.72fr] items-end gap-x-4 px-1 pb-2 text-sm text-foreground/85">
                <p>Bundle</p>
                <p>Cantidad</p>
                <p>Desc.</p>
                <p>Subtotal</p>
                <span />
              </div>

              <div className="grid grid-cols-[2.2fr_0.72fr_0.95fr_0.95fr_0.72fr] items-start gap-x-4 border-t pt-3">
                <div className="space-y-1">
                  <Select value={selectedBundleId} onValueChange={handleBundleChange}>
                    <SelectTrigger className="h-6 w-full rounded-2xl border-border px-4 text-base">
                      <SelectValue placeholder="Selecciona bundle (opcional)" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} viewportClassName="max-h-[360px] overflow-y-auto">
                      <SelectItem value="none">Sin bundle</SelectItem>
                      {bundles.map((bundle) => (
                        <SelectItem key={bundle.id} value={String(bundle.id)}>
                          {bundle.nombre} ({Number(bundle.descuentoPct).toFixed(2)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={bundleQuantityInput}
                  onChange={(event) => {
                    const digitsOnly = event.target.value.replace(/\D/g, '')
                    setBundleQuantityInput(digitsOnly)
                  }}
                  onBlur={() => {
                    if (!Number.isFinite(Number(bundleQuantityInput)) || Number(bundleQuantityInput) < 1) {
                      setBundleQuantityInput('1')
                    }
                  }}
                  disabled={selectedBundleId === 'none'}
                  className="h-9 rounded-2xl border-border px-3 text-base disabled:opacity-50"
                />

                <p className="pt-3 text-center text-base text-muted-foreground">
                  {selectedBundle ? `-${safeBundleDiscountPct.toFixed(2)}%` : '–'}
                </p>
                <p className="pt-3 text-center text-base">{selectedBundle ? euro(bundleProductsTotal) : '–'}</p>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBundleId('none')
                    setBundleQuantityInput('1')
                    setLoadingBundleProducts(false)
                  }}
                  disabled={selectedBundleId === 'none'}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Quitar bundle"
                  title="Quitar bundle"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {selectedBundle && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-semibold uppercase tracking-wide text-foreground/80">Productos del bundle</p>
                    <span className="text-sm text-muted-foreground">{selectedBundle.nombre}</span>
                  </div>

                  <div className="grid grid-cols-[2.2fr_0.72fr_0.95fr_0.95fr_0.72fr] items-end gap-x-4 px-1 pb-2 text-sm text-foreground/85">
                    <p>Producto</p>
                    <p>Cantidad</p>
                    <p>Precio</p>
                    <p>Subtotal</p>
                    <p className="text-right">Desc.</p>
                  </div>

                  {loadingBundleProducts ? (
                    <p className="text-sm text-muted-foreground">Cargando productos del bundle...</p>
                  ) : bundleProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Este bundle no tiene productos.</p>
                  ) : (
                    bundleProducts.map((bundleItem) => {
                      const product = productById.get(String(bundleItem.productoId))
                      const quantity = Math.max(1, bundleItem.cantidad) * safeBundleQuantity
                      const listSubtotal = product ? product.precioUnitario * quantity : null
                      const discountedSubtotal =
                        listSubtotal == null ? null : listSubtotal * (1 - safeBundleDiscountPct / 100)

                      return (
                        <div
                          key={bundleItem.productoId}
                          className="grid grid-cols-[2.2fr_0.72fr_0.95fr_0.95fr_0.72fr] items-start gap-x-4 border-t pt-3"
                        >
                          <div className="space-y-1">
                            <p className="text-base">{bundleItem.productoNombre}</p>
                            <p className="px-1 text-xs text-muted-foreground">
                              {product ? `Disponible: ${product.cantidadActual} unidades` : 'Producto no disponible'}
                            </p>
                          </div>
                          <p className="pt-3 text-base">{quantity}</p>
                          <p className="pt-3 text-base">{product ? euro(product.precioUnitario) : '–'}</p>
                          <p className="pt-3 text-base">{discountedSubtotal != null ? euro(discountedSubtotal) : '–'}</p>
                          <p className="pt-3 text-right text-xs text-muted-foreground">
                            -{safeBundleDiscountPct.toFixed(2)}%
                          </p>
                        </div>
                      )
                    })
                  )}

                  <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-foreground/90">
                    <p>
                      Descuento del bundle aplicado: <span className="font-semibold">{safeBundleDiscountPct.toFixed(2)}%</span>
                    </p>
                    <p>
                      Ahorro estimado bundle: <span className="font-semibold">{euro(bundleDiscountAmount)}</span>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
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
              const safeQuantity = Math.max(1, Number(item.quantity) || 1)
              const subtotal = product ? product.precioUnitario * safeQuantity : null
              return (
                <div key={index} className="grid grid-cols-[2.2fr_0.72fr_0.95fr_0.95fr_0.72fr] items-start gap-x-4 border-t pt-3">
                  <div className="space-y-1">
                    <Select value={item.productId} onValueChange={(value) => updateItem(index, { productId: value })}>
                      <SelectTrigger className="h-6 w-full rounded-2xl border-border px-4 text-base">
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={item.quantity}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, '')
                      updateItem(index, { quantity: digitsOnly })
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => event.currentTarget.select()}
                    onMouseUp={(event) => event.preventDefault()}
                    onBlur={() => {
                      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1) {
                        updateItem(index, { quantity: '1' })
                      }
                    }}
                    className="h-9 rounded-2xl border-border px-3 text-base"
                  />

                  <p className="pt-3 text-base">{product ? euro(product.precioUnitario) : '–'}</p>
                  <p className="pt-3 text-base">{subtotal != null ? euro(subtotal) : '–'}</p>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                    aria-label="Quitar producto"
                    title="Quitar producto"
                  >
                    <Trash2 className="h-4 w-4" />
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
            onClick={handleClose}
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
