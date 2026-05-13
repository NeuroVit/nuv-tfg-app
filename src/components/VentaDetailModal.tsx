import type { Venta } from '@/types/venta'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ModalShell, { ModalSection } from '@/components/ModalShell'

const euro = (value: number) => `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`

interface VentaDetailModalProps {
  open: boolean
  onClose: () => void
  venta: Venta | null
}

export default function VentaDetailModal({ open, onClose, venta }: VentaDetailModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Detalle de venta #${venta?.id ?? ''}`}
      description="Resumen de importes y líneas de la venta."
      widthClassName="max-w-2xl"
    >
      <div className="space-y-5 px-6 py-5">
        {!venta ? (
          <p className="text-sm text-muted-foreground">No se encontró la venta seleccionada.</p>
        ) : (
          <>
            <ModalSection title="Resumen">
              <div className="grid grid-cols-2 gap-3 p-3 text-sm">
                <p><span className="text-muted-foreground">Cliente:</span> {venta.clientName}</p>
                <p><span className="text-muted-foreground">Fecha:</span> {new Date(venta.soldAt).toLocaleString('es-ES')}</p>
                <p><span className="text-muted-foreground">Subtotal:</span> {euro(venta.subtotalAmount ?? venta.totalAmount)}</p>
                <p><span className="text-muted-foreground">Descuento:</span> {euro(venta.discountTotalAmount ?? 0)}</p>
                <p><span className="text-muted-foreground">Descuento global:</span> {(venta.globalDiscountPct ?? 0).toFixed(2)}%</p>
                <p><span className="text-muted-foreground">Total:</span> {euro(venta.totalAmount)}</p>
              </div>
            </ModalSection>

            <ModalSection title="Líneas" className="border-t pt-4">
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio unitario</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venta.items.map((item) => (
                      <TableRow key={`${venta.id}-${item.productId}`}>
                        <TableCell>{item.productoNombre}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{euro(item.unitPriceSnapshot)}</TableCell>
                        <TableCell>{euro(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {venta.notas ? (
                <div className="p-3 text-sm">
                  <span className="text-muted-foreground">Notas:</span> {venta.notas}
                </div>
              ) : null}
            </ModalSection>
          </>
        )}

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
