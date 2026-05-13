import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalShellProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  widthClassName?: string
  children: ReactNode
}

/**
 * Shared modal layout: overlay + bordered card + header (title / description / close).
 * Mirrors the structure used by ProductoModal. Callers render their form (sections
 * separated by `border-t pt-4`) and the footer buttons as `children`.
 */
export default function ModalShell({
  open,
  onClose,
  title,
  description,
  widthClassName = 'max-w-[560px]',
  children,
}: ModalShellProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex max-h-[90vh] w-full ${widthClassName} flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl [&_[data-slot=input]]:bg-transparent [&_[data-slot=textarea]]:bg-transparent [&_[data-slot=select-trigger]]:bg-transparent [&_[data-slot=input-group]]:bg-transparent`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/** Footer row: Cancelar + primary action, right-aligned, matching ProductoModal. */
export function ModalFooter({
  onCancel,
  children,
  error,
}: {
  onCancel: () => void
  children: ReactNode
  error?: string | null
}) {
  return (
    <div className="border-t pt-4">
      {error ? <p className="mb-1 text-right text-xs text-red-600">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
        >
          Cancelar
        </button>
        {children}
      </div>
    </div>
  )
}

/** Primary submit button styled like ProductoModal's "Guardar" button. */
export function ModalSubmitButton({
  disabled,
  children,
}: {
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

/** Red asterisk marking a required form field. Place right after the label text. */
export function RequiredMark() {
  return <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
}

/** Section heading used to divide a modal form into labelled blocks. */
export function ModalSection({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-4 ${className}`}>
      {title ? <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3> : null}
      {children}
    </section>
  )
}
