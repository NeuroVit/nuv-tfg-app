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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const PAGE_SIZE = 20
const emptyForm = { nombre: '', email: '', telefono: '', notas: '' }

export default function ClientesPage() {
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [clients, setClients] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('active')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

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

  const total = filteredClients.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedClients = useMemo(
    () => filteredClients.slice(offset, offset + PAGE_SIZE),
    [filteredClients, offset]
  )

  useEffect(() => {
    setOffset(0)
  }, [search, status])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (client: Cliente) => {
    setEditing(client)
    setForm({
      nombre: client.nombre,
      email: client.email ?? '',
      telefono: client.telefono ?? '',
      notas: client.notas ?? '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const submit = async () => {
    if (!canEdit) return
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
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

      if (editing) {
        await editarCliente(editing.id, payload)
        toast.success('Cliente actualizado')
      } else {
        await crearCliente(payload)
        toast.success('Cliente creado')
      }

      closeModal()
      await loadClients()
    } catch {
      toast.error('No se pudo guardar el cliente')
    } finally {
      setSaving(false)
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

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nombre, email o teléfono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as 'all' | 'active' | 'archived')}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="archived">Archivados</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => void loadClients()}>Recargar</Button>
            {canEdit && <Button onClick={openCreate}>+ Nuevo cliente</Button>}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                {canEdit && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    Cargando clientes...
                  </TableCell>
                </TableRow>
              ) : paginatedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    No hay clientes para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nombre}</TableCell>
                    <TableCell>{client.email ?? '—'}</TableCell>
                    <TableCell>{client.telefono ?? '—'}</TableCell>
                    <TableCell>{client.activo ? 'Activo' : 'Archivado'}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(client)}>
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void toggleArchive(client)}>
                            {client.activo ? 'Archivar' : 'Restaurar'}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Pagina {currentPage} de {totalPages} | {total} registros</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setOffset((prev) => (prev + PAGE_SIZE >= total ? prev : prev + PAGE_SIZE))}
              disabled={offset + PAGE_SIZE >= total}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              placeholder="Nombre *"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
            />
            <Input
              placeholder="Notas"
              value={form.notas}
              onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={() => void submit()} disabled={saving || !canEdit}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

