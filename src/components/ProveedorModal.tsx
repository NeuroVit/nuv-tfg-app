import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { crearProveedor, editarProveedor } from '@/api/provider'
import type { Proveedor, ProveedorRequest } from '@/types/provider'
import { Input } from '@/components/ui/input'
import ModalShell, { ModalFooter, ModalSection, ModalSubmitButton, RequiredMark } from '@/components/ModalShell'
import { parseApiError } from '@/lib/apiError'

interface ProveedorModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  proveedor?: Proveedor | null
}

type ProviderFormState = {
  nombre: string
  ubicacionAlmacen: string
  diasEntrega: string
}

const emptyProviderForm: ProviderFormState = {
  nombre: '',
  ubicacionAlmacen: '',
  diasEntrega: '0',
}

export default function ProveedorModal({ open, onClose, onSaved, proveedor }: ProveedorModalProps) {
  const [form, setForm] = useState<ProviderFormState>(emptyProviderForm)
  const [saving, setSaving] = useState(false)
  const [footerError, setFooterError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFooterError(null)
    if (proveedor) {
      setForm({
        nombre: proveedor.nombre,
        ubicacionAlmacen: proveedor.ubicacionAlmacen,
        diasEntrega: String(proveedor.diasEntrega),
      })
    } else {
      setForm(emptyProviderForm)
    }
  }, [open, proveedor])

  const isFormValid = useMemo(() => {
    const dias = Number(form.diasEntrega)
    return (
      Boolean(form.nombre.trim()) &&
      Boolean(form.ubicacionAlmacen.trim()) &&
      Number.isFinite(dias) &&
      dias >= 0
    )
  }, [form])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFooterError(null)
    const payload: ProveedorRequest = {
      nombre: form.nombre.trim(),
      ubicacionAlmacen: form.ubicacionAlmacen.trim(),
      diasEntrega: Number(form.diasEntrega),
    }

    if (!payload.nombre || !payload.ubicacionAlmacen) {
      toast.error('Nombre y ubicación de almacén son obligatorios')
      return
    }
    if (Number.isNaN(payload.diasEntrega) || payload.diasEntrega < 0) {
      toast.error('El plazo de entrega debe ser un número mayor o igual a 0')
      return
    }

    setSaving(true)
    try {
      if (proveedor) {
        await editarProveedor(proveedor.id, payload)
        toast.success('Proveedor actualizado correctamente')
      } else {
        await crearProveedor(payload)
        toast.success('Proveedor creado correctamente')
      }
      onClose()
      onSaved()
    } catch (error: unknown) {
      setFooterError(parseApiError(error, 'No se pudo guardar el proveedor'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
      description="Define los datos del proveedor y su plazo de entrega."
      widthClassName="max-w-[520px]"
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        <ModalSection title="Datos del proveedor">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nombre <RequiredMark /></label>
            <Input
              value={form.nombre}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Ubicación del almacén <RequiredMark /></label>
            <Input
              value={form.ubicacionAlmacen}
              onChange={(event) => setForm((current) => ({ ...current, ubicacionAlmacen: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Días de entrega <RequiredMark /></label>
            <Input
              type="number"
              min="0"
              value={form.diasEntrega}
              onChange={(event) => setForm((current) => ({ ...current, diasEntrega: event.target.value }))}
            />
          </div>
        </ModalSection>

        <ModalFooter onCancel={onClose} error={footerError}>
          <ModalSubmitButton disabled={saving || !isFormValid}>
            {saving ? 'Guardando…' : 'Guardar proveedor'}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </ModalShell>
  )
}
