import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { crearCliente, editarCliente } from '@/api/cliente'
import type { Cliente } from '@/types/cliente'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ModalShell, { ModalFooter, ModalSection, ModalSubmitButton, RequiredMark } from '@/components/ModalShell'

interface ClienteModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  cliente?: Cliente | null
  canEdit?: boolean
}

const emptyForm = { nombre: '', email: '', telefono: '', notas: '' }

export default function ClienteModal({ open, onClose, onSaved, cliente, canEdit = true }: ClienteModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (cliente) {
      setForm({
        nombre: cliente.nombre,
        email: cliente.email ?? '',
        telefono: cliente.telefono ?? '',
        notas: cliente.notas ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, cliente])

  const nombreValid = Boolean(form.nombre.trim()) && !/\d/.test(form.nombre.trim())
  const emailValid = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const telefonoValid = !form.telefono.trim() || /^\d{9}$/.test(form.telefono.trim())

  const isFormValid = useMemo(
    () => nombreValid && emailValid && telefonoValid,
    [nombreValid, emailValid, telefonoValid]
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEdit) return

    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (/\d/.test(form.nombre.trim())) {
      toast.error('El nombre no puede contener numeros')
      return
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('El formato del email no es valido')
      return
    }
    if (form.telefono.trim() && !/^\d{9}$/.test(form.telefono.trim())) {
      toast.error('El telefono debe tener exactamente 9 numeros')
      return
    }

    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        notas: form.notas.trim() || undefined,
      }

      if (cliente) {
        await editarCliente(cliente.id, payload)
        toast.success('Cliente actualizado')
      } else {
        await crearCliente(payload)
        toast.success('Cliente creado')
      }

      onClose()
      onSaved()
    } catch {
      toast.error('No se pudo guardar el cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      description="Completa los datos de contacto del cliente."
      widthClassName="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        <ModalSection title="Datos del cliente">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nombre <RequiredMark /></label>
            <Input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  nombre: e.target.value.replace(/\d/g, ''),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              placeholder="correo@ejemplo.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Telefono</label>
            <Input
              placeholder="Telefono"
              inputMode="numeric"
              maxLength={9}
              value={form.telefono}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  telefono: e.target.value.replace(/\D/g, '').slice(0, 9),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notas</label>
            <Textarea
              placeholder="Notas"
              rows={3}
              value={form.notas}
              onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
            />
          </div>
        </ModalSection>

        <ModalFooter onCancel={onClose}>
          <ModalSubmitButton disabled={saving || !canEdit || !isFormValid}>
            {saving ? 'Guardando...' : 'Guardar cliente'}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </ModalShell>
  )
}
