import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { switchRole } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const roles = [
  { value: 'ROLE_ADMIN', label: 'Administrador' },
  { value: 'ROLE_MANAGER', label: 'Manager' },
  { value: 'ROLE_VIEWER', label: 'Viewer' },
]

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [selectedRole, setSelectedRole] = useState(user?.role ?? 'ROLE_VIEWER')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelectedRole(user?.role ?? 'ROLE_VIEWER')
  }, [user?.role])

  const currentRoleLabel = useMemo(() => {
    const found = roles.find((role) => role.value === (user?.role ?? 'ROLE_VIEWER'))
    return found?.label ?? user?.role ?? 'Sin rol'
  }, [user?.role])

  const onSaveRole = async () => {
    if (!user) return

    setSaving(true)

    try {
      const data = await switchRole(selectedRole)
      setUser({ username: data.username, role: data.role, token: data.token })
      toast.success('Rol actualizado correctamente. Los permisos ya están activos.')
    } catch {
      toast.error('No se pudo actualizar el rol. Revisa tu sesión e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">General</h1>
          <p className="text-gray-500">Configuración general de la aplicación y de tu sesión.</p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Rol de usuario</h2>
          <p className="mt-1 text-sm text-gray-500">
            Rol actual: <span className="font-medium text-gray-700">{currentRoleLabel}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Esta opción está pensada para pruebas locales y demo del TFG.
          </p>

          <div className="mt-5 grid gap-2">
            <Label htmlFor="role-select">Selecciona un rol</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role-select" className="w-full sm:max-w-sm">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6">
            <Button className="w-full sm:w-auto" onClick={onSaveRole} disabled={saving || !user || selectedRole === user?.role}>
              {saving ? 'Guardando...' : 'Guardar rol'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
