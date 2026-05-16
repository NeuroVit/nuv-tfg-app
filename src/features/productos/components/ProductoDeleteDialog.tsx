import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Producto } from '@/features/productos/types/producto'

type ProductoDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productoEliminando: Producto | null
  submitting: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

export default function ProductoDeleteDialog({
  open,
  onOpenChange,
  productoEliminando,
  submitting,
  onConfirm,
  onClose,
}: ProductoDeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Seguro que quieres eliminar el producto "{productoEliminando?.nombre}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
