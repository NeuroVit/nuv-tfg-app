import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { getClientes } from '@/api/cliente'
import { getProductos } from '@/api/producto'
import { getVentas } from '@/api/venta'
import type { Cliente } from '@/types/cliente'
import type { Producto } from '@/types/producto'
import type { Venta } from '@/types/venta'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import VentaFormModal from '@/components/VentaFormModal'
import VentaDetailModal from '@/components/VentaDetailModal'

const PAGE_SIZE = 20
const euro = (value: number) => `€${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`

export default function VentasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasRole } = useAuthStore()
  const canCreate = hasRole('ROLE_ADMIN') || hasRole('ROLE_MANAGER')

  const [clients, setClients] = useState<Cliente[]>([])
  const [products, setProducts] = useState<Producto[]>([])
  const [sales, setSales] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)

  const [filterClientId, setFilterClientId] = useState('all')
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [clientData, productData, salesData] = await Promise.all([
        getClientes(true),
        getProductos(),
        getVentas(),
      ])
      setClients(clientData)
      setProducts(productData)
      setSales(salesData)
    } catch {
      toast.error('No se pudieron cargar las ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const clientId = searchParams.get('clientId')
    const q = searchParams.get('q')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (clientId) setFilterClientId(clientId)
    if (q) setSearch(q)
    if (from) setFromDate(from)
    if (to) setToDate(to)
    // Hidrata filtros desde URL en primer render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (filterClientId !== 'all') next.set('clientId', filterClientId)
    else next.delete('clientId')
    if (search.trim()) next.set('q', search.trim())
    else next.delete('q')
    if (fromDate) next.set('from', fromDate)
    else next.delete('from')
    if (toDate) next.set('to', toDate)
    else next.delete('to')

    const prevSerialized = searchParams.toString()
    const nextSerialized = next.toString()
    if (prevSerialized !== nextSerialized) {
      setSearchParams(next, { replace: true })
    }
  }, [filterClientId, fromDate, search, searchParams, setSearchParams, toDate])

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sales.filter((sale) => {
      const clientOk = filterClientId === 'all' || String(sale.clientId) === filterClientId
      const textOk =
        !term ||
        String(sale.id).includes(term) ||
        (sale.notas ?? '').toLowerCase().includes(term)
      const soldDate = sale.soldAt.slice(0, 10)
      const fromOk = !fromDate || soldDate >= fromDate
      const toOk = !toDate || soldDate <= toDate
      return clientOk && textOk && fromOk && toOk
    })
  }, [filterClientId, fromDate, sales, search, toDate])

  const openDetail = (sale: Venta) => {
    setSelectedSale(sale)
    setDetailOpen(true)
  }

  const total = filteredSales.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginatedSales = useMemo(
    () => filteredSales.slice(offset, offset + PAGE_SIZE),
    [filteredSales, offset]
  )

  useEffect(() => {
    setOffset(0)
  }, [filterClientId, search, fromDate, toDate])

  useEffect(() => {
    if (offset >= total && total > 0) {
      setOffset(Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE))
    }
  }, [offset, total])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterClientId} onValueChange={setFilterClientId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={String(client.id)}>{client.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ID o notas"
            className="w-56"
          />
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-44" />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-44" />
          <div className="ml-auto flex gap-2">
            {canCreate && <Button onClick={() => setModalOpen(true)}>+ Nueva venta</Button>}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">ID</TableHead>
                <TableHead className="text-center">Cliente</TableHead>
                <TableHead className="text-center">Fecha</TableHead>
                <TableHead className="text-center">Artículos</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando ventas...</TableCell></TableRow>
              ) : paginatedSales.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay ventas para mostrar.</TableCell></TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow key={sale.id} className="cursor-pointer hover:bg-accent" onClick={() => openDetail(sale)}>
                    <TableCell className="text-center align-middle">#{sale.id}</TableCell>
                    <TableCell className="text-center align-middle">{sale.clientName}</TableCell>
                    <TableCell className="text-center align-middle">{new Date(sale.soldAt).toLocaleString('es-ES')}</TableCell>
                    <TableCell className="text-center align-middle">{sale.items.length}</TableCell>
                    <TableCell className="text-center align-middle">
                      {sale.items.reduce((totalQuantity, item) => totalQuantity + item.quantity, 0)}
                    </TableCell>
                    <TableCell className="text-center align-middle">{euro(sale.totalAmount)}</TableCell>
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

      <VentaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => void loadData()}
        clients={clients}
        products={products}
        canCreate={canCreate}
      />

      <VentaDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        venta={selectedSale}
      />
    </div>
  )
}
