import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  archivarCliente,
  getClientes,
  restaurarCliente,
} from '@/api/cliente'
import type { Cliente } from '@/types/cliente'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Archive, MoreHorizontal, Pencil, ReceiptText, RotateCcw } from 'lucide-react'
import ClienteModal from '@/components/ClienteModal'

const PAGE_SIZE = 20

export default function ClientesPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [clients, setClients] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('active')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)

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
    return clients
      .filter((client) => {
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
      .sort((a, b) => {
        const aTime = new Date(a.creadoEn).getTime()
        const bTime = new Date(b.creadoEn).getTime()
        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
          return bTime - aTime
        }
        return b.id - a.id
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
    setModalOpen(true)
  }

  const openEdit = (client: Cliente) => {
    setEditing(client)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
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
                        <div className="inline-flex" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Acciones de cliente">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem onSelect={() => navigate(`/ventas?clientId=${client.id}`)}>
                                <ReceiptText className="h-4 w-4" />
                                Ver ventas
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openEdit(client)}>
                                <Pencil className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void toggleArchive(client)}>
                                {client.activo ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                                {client.activo ? 'Archivar' : 'Restaurar'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <ClienteModal
        open={modalOpen}
        onClose={closeModal}
        onSaved={() => void loadClients()}
        cliente={editing}
        canEdit={canEdit}
      />
    </div>
  )
}


