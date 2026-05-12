import type { PedidoProveedor } from '@/types/provider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ModalShell, { ModalSection } from '@/components/ModalShell'

const statusLabelMap: Record<PedidoProveedor['status'], string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  RECEIVED: 'Recibido',
  CANCELLED: 'Cancelado',
}

interface PedidoDetailModalProps {
  open: boolean
  onClose: () => void
  pedido: PedidoProveedor | null
}

export default function PedidoDetailModal({ open, onClose, pedido }: PedidoDetailModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Detalle pedido #${pedido?.id ?? ''}`}
      description="Datos del pedido y líneas solicitadas."
      widthClassName="max-w-2xl"
    >
      <div className="space-y-5 px-6 py-5">
        {!pedido ? (
          <p className="text-sm text-muted-foreground">Pedido no disponible.</p>
        ) : (
          <>
            <ModalSection title="Resumen">
              <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
                <p><span className="text-muted-foreground">Proveedor:</span> {pedido.providerNombre}</p>
                <p><span className="text-muted-foreground">Estado:</span> {statusLabelMap[pedido.status] ?? pedido.status}</p>
                <p><span className="text-muted-foreground">Llegada deseada:</span> {pedido.fechaLlegadaDeseada}</p>
                <p><span className="text-muted-foreground">Pedido recomendado:</span> {pedido.fechaPedidoRecomendada}</p>
              </div>
            </ModalSection>

            <ModalSection title="Líneas" className="border-t pt-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio snapshot</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedido.items.map((item) => (
                      <TableRow key={item.productoId}>
                        <TableCell>{item.productoNombre}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>{item.cantidad}</TableCell>
                        <TableCell>€{Number(item.precioUnitarioSnapshot).toFixed(2)}</TableCell>
                        <TableCell>€{(Number(item.precioUnitarioSnapshot) * item.cantidad).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
