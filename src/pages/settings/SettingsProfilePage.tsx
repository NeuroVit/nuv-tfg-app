import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { getMe, updateMe } from '@/api/auth'
import type { UserProfile } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const parseApiError = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback
  const payload = error.response?.data
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; error?: string }
    if (data.message) return data.message
    if (data.error) return data.error
  }
  return fallback
}

export default function SettingsProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const me = await getMe()
        setProfile(me)
        setForm({
          nombre: me.nombre ?? '',
          apellidos: me.apellidos ?? '',
          email: me.email ?? '',
        })
      } catch (error: unknown) {
        toast.error(parseApiError(error, 'No se pudo cargar tu perfil'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const onSave = async () => {
    if (!form.nombre.trim() || !form.apellidos.trim() || !form.email.trim()) {
      toast.error('Nombre, apellidos y email son obligatorios')
      return
    }

    setSaving(true)
    try {
      const updated = await updateMe({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim(),
      })
      setProfile(updated)
      toast.success('Perfil actualizado correctamente')
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo actualizar el perfil'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl text-sm text-gray-500">Cargando perfil...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona tu información de cuenta.</p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-username">Usuario</Label>
              <Input id="profile-username" value={profile?.username ?? ''} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Rol</Label>
              <Input id="profile-role" value={profile?.role ?? ''} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-lastname">Apellidos</Label>
              <Input
                id="profile-lastname"
                value={form.apellidos}
                onChange={(event) => setForm((prev) => ({ ...prev, apellidos: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div>
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
