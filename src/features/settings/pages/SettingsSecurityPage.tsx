import { useState } from 'react'
import { toast } from 'sonner'
import { changePassword } from '@/features/auth/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseApiError } from '@/lib/apiError'

export default function SettingsSecurityPage() {
  const user = useAuthStore((state) => state.user)
  const setMustChangePassword = useAuthStore((state) => state.setMustChangePassword)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const onChangePassword = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error('Completa todos los campos')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('La nueva contraseña y su confirmación no coinciden')
      return
    }

    setSaving(true)
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setMustChangePassword(false)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Contraseña actualizada correctamente')
    } catch (error: unknown) {
      toast.error(parseApiError(error, 'No se pudo cambiar la contraseña'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seguridad</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona tu contraseña y seguridad de cuenta.</p>
        </div>

        {user?.mustChangePassword ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Debes cambiar tu contraseña temporal para continuar usando el resto de la aplicación.
          </div>
        ) : null}

        <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="security-current-password">Contraseña actual</Label>
            <Input
              id="security-current-password"
              type="password"
              value={form.currentPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="security-new-password">Nueva contraseña</Label>
            <Input
              id="security-new-password"
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, con al menos una mayúscula y un número.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="security-confirm-password">Confirmar nueva contraseña</Label>
            <Input
              id="security-confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            />
          </div>

          <div>
            <Button onClick={onChangePassword} disabled={saving}>
              {saving ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
