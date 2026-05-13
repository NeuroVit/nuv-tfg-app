import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getBundleItems } from '@/api/bundle'
import type { BundleItem, BundleSummary } from '@/types/bundle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ModalShell, { ModalSection } from '@/components/ModalShell'
import { parseApiError } from '@/lib/apiError'

interface BundleDetailModalProps {
  open: boolean
  onClose: () => void
  bundle: BundleSummary | null
}

export default function BundleDetailModal({ open, onClose, bundle }: BundleDetailModalProps) {
  const [items, setItems] = useState<BundleItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !bundle) return
    let cancelled = false
    setLoading(true)
    setItems([])
    getBundleItems(bundle.id)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setItems([])
          toast.error(parseApiError(error, 'No se pudieron cargar los productos del bundle'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, bundle])

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Productos del bundle: ${bundle?.nombre ?? ''}`}
      description="Productos incluidos en este bundle."
      widthClassName="max-w-2xl"
    >
      <div className="space-y-5 px-6 py-5">
        <ModalSection title="Productos">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Cargando productos del bundle...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Este bundle no tiene productos asociados.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.productoId}>
                      <TableCell className="font-medium">{item.productoNombre}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                      <TableCell>{item.cantidad}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ModalSection>

        <div className="flex items-center justify-end border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
