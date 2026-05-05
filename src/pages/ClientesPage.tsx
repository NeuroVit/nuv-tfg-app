import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  archivarCliente,
  crearCliente,
  editarCliente,
  getClientes,
  restaurarCliente,
} from '@/api/cliente'
import type { Cliente } from '@/types/cliente'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const emptyForm = { nombre: '', email: '', telefono: '', notas: '' }

export default function ClientesPage() {
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [clients, setClients] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('active')
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadClients = async () => {
    setLoading(true)
    try {
      const data = await getClientes(true)
      setClients(data)
    } catch {
      toast.error('No se pudieron cargar los clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadClients()
  }, [])

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase()
    return clients.filter((client) => {
      const statusOk =
        status === 'all' ||
        (status === 'active' && client.activo) ||
        (status === 'archived' && !client.activo)

      const textOk =
        !term ||
        client.nombre.toLowerCase().includes(term) ||
        (client.email ?? '').toLowerCase().includes(term) ||
        (client.telefono ?? '').toLowerCase().includes(term)

      return statusOk && textOk
    })
  }, [clients, search, status])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const openEdit = (client: Cliente) => {
    setEditing(client)
    setForm({
      nombre: client.nombre,
      email: client.email ?? '',
      telefono: client.telefono ?? '',
      notas: client.notas ?? '',
    })
  }

  const submit = async () => {
    if (!canEdit) return
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        notas: form.notas.trim() || undefined,
      }

      if (editing) {
        await editarCliente(editing.id, payload)
        toast.success('Cliente actualizado')
      } else {
        await crearCliente(payload)
        toast.success('Cliente creado')
      }

      setEditing(null)
      setForm(emptyForm)
      await loadClients()
    } catch {
      toast.error('No se pudo guardar el cliente')
    }
  }

  const toggleArchive = async (client: Cliente) => {
    if (!canEdit) return
    try {
      if (client.activo) {
        await archivarCliente(client.id)
      } else {
        await restaurarCliente(client.id)
      }
      toast.success('Estado de cliente actualizado')
      await loadClients()
    } catch {
      toast.error('No se pudo actualizar el cliente')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de cartera de clientes para ventas.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
          <Input
            placeholder="Buscar por nombre, email o teléfono"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select value={status} onValueChange={(value) => setStatus(value as 'all' | 'active' | 'archived')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="archived">Archivados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={openCreate}>Nuevo cliente</Button>
          <Button variant="outline" onClick={() => void loadClients()}>Recargar</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Cargando clientes...</TableCell></TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay clientes para mostrar.</TableCell></TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.nombre}</TableCell>
                      <TableCell>{client.email ?? '—'}</TableCell>
                      <TableCell>{client.telefono ?? '—'}</TableCell>
                      <TableCell>{client.activo ? 'Activo' : 'Archivado'}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          {canEdit && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openEdit(client)}>Editar</Button>
                              <Button variant="outline" size="sm" onClick={() => void toggleArchive(client)}>
                                {client.activo ? 'Archivar' : 'Restaurar'}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <div className="mt-4 space-y-3">
              <Input placeholder="Nombre" value={form.nombre} onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))} />
              <Input placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              <Input placeholder="Teléfono" value={form.telefono} onChange={(event) => setForm((prev) => ({ ...prev, telefono: event.target.value }))} />
              <Input placeholder="Notas" value={form.notas} onChange={(event) => setForm((prev) => ({ ...prev, notas: event.target.value }))} />
              <div className="flex items-center gap-2">
                <Button onClick={() => void submit()} disabled={!canEdit}>Guardar</Button>
                <Button variant="outline" onClick={() => { setEditing(null); setForm(emptyForm) }}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
