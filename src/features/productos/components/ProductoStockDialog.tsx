import type { Dispatch, SetStateAction } from 'react'
import type { ActualizarStockRequest, Producto } from '@/features/productos/types/producto'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ProductoStockDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProducto: Producto | null
  stockForm: ActualizarStockRequest
  setStockForm: Dispatch<SetStateAction<ActualizarStockRequest>>
  stockError: string | null
  submitting: boolean
  onSubmit: () => Promise<void> | void
}

export default function ProductoStockDialog({
  open,
  onOpenChange,
  selectedProducto,
  stockForm,
  setStockForm,
  stockError,
  submitting,
  onSubmit,
}: ProductoStockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Actualizar Stock — {selectedProducto?.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {stockError && (
            <Alert variant="destructive">
              <AlertDescription>{stockError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1">
            <Label>Cantidad a ajustar en el stock</Label>
            <Input
              type="number"
              placeholder="Usa un número positivo si entra stock o negativo si sale stock."
              value={stockForm.delta}
              onChange={(event) =>
                setStockForm((current) => ({ ...current, delta: Number(event.target.value) }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Razón</Label>
            <Select
              value={stockForm.razon}
              onValueChange={(value) =>
                setStockForm((current) => ({
                  ...current,
                  razon: value as ActualizarStockRequest['razon'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PURCHASE">Compra</SelectItem>
                <SelectItem value="SALE">Venta</SelectItem>
                <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                <SelectItem value="RETURN">Devolución</SelectItem>
                <SelectItem value="DAMAGE">Merma</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Input
              value={stockForm.notas ?? ''}
              onChange={(event) =>
                setStockForm((current) => ({ ...current, notas: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
