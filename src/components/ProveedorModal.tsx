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
  email: string
  ubicacionAlmacen: string
  diasEntrega: string
}

const PROVIDER_NAME_MAX_LENGTH = 100
const WAREHOUSE_LOCATION_MAX_LENGTH = 500

const emptyProviderForm: ProviderFormState = {
  nombre: '',
  email: '',
  ubicacionAlmacen: '',
  diasEntrega: '1',
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
        email: proveedor.email ?? '',
        ubicacionAlmacen: proveedor.ubicacionAlmacen,
        diasEntrega: String(proveedor.diasEntrega),
      })
    } else {
      setForm(emptyProviderForm)
    }
  }, [open, proveedor])

  const isFormValid = useMemo(() => {
    const dias = Number(form.diasEntrega)
    const nombre = form.nombre.trim()
    const ubicacionAlmacen = form.ubicacionAlmacen.trim()
    const email = form.email.trim()
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    return (
      Boolean(nombre) &&
      nombre.length <= PROVIDER_NAME_MAX_LENGTH &&
      Boolean(ubicacionAlmacen) &&
      ubicacionAlmacen.length <= WAREHOUSE_LOCATION_MAX_LENGTH &&
      Boolean(email) &&
      emailOk &&
      Number.isFinite(dias) &&
      dias >= 1
    )
  }, [form])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFooterError(null)
    const payload: ProveedorRequest = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      ubicacionAlmacen: form.ubicacionAlmacen.trim(),
      diasEntrega: Number(form.diasEntrega),
    }

    if (!payload.nombre || !payload.ubicacionAlmacen) {
      toast.error('Nombre y ubicacion de almacen son obligatorios')
      return
    }
    if (payload.nombre.length > PROVIDER_NAME_MAX_LENGTH) {
      toast.error(`El nombre no puede superar ${PROVIDER_NAME_MAX_LENGTH} caracteres`)
      return
    }
    if (payload.ubicacionAlmacen.length > WAREHOUSE_LOCATION_MAX_LENGTH) {
      toast.error(`La ubicación no puede superar ${WAREHOUSE_LOCATION_MAX_LENGTH} caracteres`)
      return
    }
    if (Number.isNaN(payload.diasEntrega) || payload.diasEntrega < 1) {
      toast.error('El plazo de entrega debe ser un número mayor o igual a 1')
      return
    }
    if (!payload.email) {
      toast.error('El email del proveedor es obligatorio')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('El email del proveedor no es valido')
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
              maxLength={PROVIDER_NAME_MAX_LENGTH}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Ubicacion del almacen <RequiredMark /></label>
            <Input
              value={form.ubicacionAlmacen}
              maxLength={WAREHOUSE_LOCATION_MAX_LENGTH}
              onChange={(event) => setForm((current) => ({ ...current, ubicacionAlmacen: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email <RequiredMark /></label>
            <Input
              type="email"
              placeholder="proveedor@empresa.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Dias de entrega <RequiredMark /></label>
            <Input
              type="number"
              min="1"
              value={form.diasEntrega}
              onChange={(event) => setForm((current) => ({ ...current, diasEntrega: event.target.value }))}
            />
          </div>
        </ModalSection>

        <ModalFooter onCancel={onClose} error={footerError}>
          <ModalSubmitButton disabled={saving || !isFormValid}>
            {saving ? 'Guardando...' : 'Guardar proveedor'}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </ModalShell>
  )
}
