import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Producto } from '@/features/productos/types/producto'

type ProductosTableSectionProps = {
  table: TanstackTable<Producto>
  columnsLength: number
  loading: boolean
  pageSize: number
  currentPage: number
  totalPages: number
  total: number
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
  onRowClick: (producto: Producto) => void
}

export default function ProductosTableSection({
  table,
  columnsLength,
  loading,
  pageSize,
  currentPage,
  totalPages,
  total,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onRowClick,
}: ProductosTableSectionProps) {
  const visibleRows = table.getRowModel().rows

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table className="min-w-[900px] table-auto">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-center">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`skeleton-row-${index}`}>
                  {Array.from({ length: columnsLength }).map((__, cellIndex) => (
                    <TableCell key={`skeleton-cell-${index}-${cellIndex}`} className="text-center align-middle">
                      <Skeleton className="mx-auto h-4 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnsLength} className="py-8 text-center text-muted-foreground">
                  No se encontraron productos.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-center align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages} · {total} registros</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={onPrev} disabled={!canGoPrev}>
            Anterior
          </Button>
          <Button variant="outline" onClick={onNext} disabled={!canGoNext}>
            Siguiente
          </Button>
        </div>
      </div>
    </>
  )
}
