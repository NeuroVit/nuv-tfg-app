import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  activarUsuario,
  actualizarRolUsuario,
  desactivarUsuario,
  getAuditoriaUsuarios,
  getUsuarios,
  invitarUsuario,
} from '@/api/usuario'
import type { UsuarioAdmin, UsuarioRoleAudit } from '@/types/usuario'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const roles = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_VIEWER']

export default function UsuariosPage() {
  const user = useAuthStore((state) => state.user)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [auditoria, setAuditoria] = useState<UsuarioRoleAudit[]>([])
  const [loading, setLoading] = useState(true)

  const [invite, setInvite] = useState({
    username: '',
    email: '',
    nombre: '',
    apellidos: '',
    role: 'ROLE_VIEWER',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [users, audit] = await Promise.all([getUsuarios(), getAuditoriaUsuarios()])
      setUsuarios(users)
      setAuditoria(audit)
    } catch {
      toast.error('No se pudieron cargar los datos de usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'ROLE_ADMIN') {
      void load()
    }
  }, [user?.role])

  if (user?.role !== 'ROLE_ADMIN') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-lg border bg-white p-6 text-sm text-gray-600">
          Esta sección está disponible solo para administradores.
        </div>
      </div>
    )
  }

  const onInvite = async () => {
    if (!invite.username || !invite.email || !invite.nombre || !invite.apellidos) {
      toast.error('Completa todos los campos de invitación')
      return
    }

    try {
      const response = await invitarUsuario(invite)
      toast.success(`Usuario invitado. Contraseña temporal: ${response.temporaryPassword}`)
      setInvite({ username: '', email: '', nombre: '', apellidos: '', role: 'ROLE_VIEWER' })
      await load()
    } catch {
      toast.error('No se pudo invitar al usuario')
    }
  }

  const onRoleChange = async (id: number, role: string) => {
    try {
      await actualizarRolUsuario(id, role)
      toast.success('Rol actualizado')
      await load()
    } catch {
      toast.error('No se pudo actualizar el rol')
    }
  }

  const onToggleActive = async (target: UsuarioAdmin) => {
    try {
      if (target.activo) {
        await desactivarUsuario(target.id)
      } else {
        await activarUsuario(target.id)
      }
      toast.success('Estado de usuario actualizado')
      await load()
    } catch {
      toast.error('No se pudo actualizar el estado del usuario')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios y permisos</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona accesos, roles e historial de cambios.</p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Invitar usuario</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input placeholder="username" value={invite.username} onChange={(e) => setInvite((prev) => ({ ...prev, username: e.target.value }))} />
            <Input placeholder="email" value={invite.email} onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))} />
            <Input placeholder="nombre" value={invite.nombre} onChange={(e) => setInvite((prev) => ({ ...prev, nombre: e.target.value }))} />
            <Input placeholder="apellidos" value={invite.apellidos} onChange={(e) => setInvite((prev) => ({ ...prev, apellidos: e.target.value }))} />
            <Select value={invite.role} onValueChange={(value) => setInvite((prev) => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="mt-3" onClick={() => void onInvite()}>Invitar</Button>
        </div>

        <Tabs defaultValue="usuarios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">Cargando...</TableCell></TableRow>
                ) : usuarios.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell>
                      <p className="font-medium">{target.username}</p>
                      <p className="text-xs text-gray-500">{target.nombre} {target.apellidos}</p>
                    </TableCell>
                    <TableCell>{target.email}</TableCell>
                    <TableCell>
                      <Select value={target.role} onValueChange={(value) => void onRoleChange(target.id, value)}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{target.activo ? 'Activo' : 'Inactivo'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => void onToggleActive(target)}>
                        {target.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="auditoria" className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Cambio</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">Cargando...</TableCell></TableRow>
                ) : auditoria.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.changedAt).toLocaleString('es-ES')}</TableCell>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>{row.oldRole} → {row.newRole}</TableCell>
                    <TableCell>{row.changedByUsername ?? 'Sistema'}</TableCell>
                    <TableCell>{row.reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
