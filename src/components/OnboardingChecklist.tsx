import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronDown,
  Package,
  ReceiptText,
  Rocket,
  Truck,
  UserSquare2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { completeOnboarding } from '@/features/auth/api/auth'
import { useProfileStore } from '@/store/profileStore'

type Task = {
  id: string
  label: string
  description: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const TASKS: Task[] = [
  {
    id: 'product',
    label: 'Añade tu primer producto',
    description: 'Crea un artículo en el catálogo con precio y stock',
    path: '/productos',
    icon: Package,
  },
  {
    id: 'supplier',
    label: 'Añade un proveedor',
    description: 'Registra un proveedor con sus datos de contacto',
    path: '/proveedores',
    icon: Truck,
  },
  {
    id: 'client',
    label: 'Registra un cliente',
    description: 'Añade un cliente a tu base de datos comercial',
    path: '/clientes',
    icon: UserSquare2,
  },
  {
    id: 'sale',
    label: 'Haz tu primera venta',
    description: 'Registra una venta y descuenta stock automáticamente',
    path: '/ventas',
    icon: ReceiptText,
  },
  {
    id: 'alert',
    label: 'Revisa las alertas de stock',
    description: 'Configura umbrales mínimos para no quedarte sin productos',
    path: '/alertas',
    icon: AlertTriangle,
  },
  {
    id: 'org',
    label: 'Personaliza tu organización',
    description: 'Edita el nombre y los datos de tu empresa',
    path: '/settings/organization',
    icon: Building2,
  },
]

function storageKey(userId: number) {
  return `ns_onboarding_${userId}`
}

function loadDone(userId: number): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveDone(userId: number, done: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...done]))
  } catch {
    // ignore storage errors
  }
}

export function OnboardingChecklist({ userId }: { userId: number }) {
  const [collapsed, setCollapsed] = useState(false)
  const [doneTasks, setDoneTasks] = useState<Set<string>>(() => loadDone(userId))
  const [completing, setCompleting] = useState(false)
  const profile = useProfileStore((s) => s.profile)
  const setProfile = useProfileStore((s) => s.setProfile)
  const navigate = useNavigate()

  const completedCount = doneTasks.size
  const total = TASKS.length
  const progress = (completedCount / total) * 100
  const allDone = completedCount === total

  const dismiss = useCallback(async () => {
    if (completing) return
    setCompleting(true)
    try {
      await completeOnboarding()
    } catch {
      // non-critical — hide anyway
    } finally {
      if (profile) setProfile({ ...profile, onboardingCompleted: true })
      setCompleting(false)
    }
  }, [completing, profile, setProfile])

  useEffect(() => {
    if (allDone) void dismiss()
  }, [allDone]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTask = useCallback(
    (id: string) => {
      setDoneTasks((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        saveDone(userId, next)
        return next
      })
    },
    [userId],
  )

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      >
        <Rocket className="h-4 w-4" />
        Primeros pasos
        <Badge className="ml-1 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0">
          {completedCount}/{total}
        </Badge>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[22rem]">
      <Card className="overflow-hidden border-border/70 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-primary/5 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Empieza con NeuralStock</p>
              <p className="text-xs text-muted-foreground">{completedCount} de {total} completados</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCollapsed(true)}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Minimizar"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={() => void dismiss()}
              disabled={completing}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Ya conozco la plataforma"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2.5 border-b">
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Task list */}
        <div className="max-h-72 overflow-y-auto">
          {TASKS.map((task) => {
            const done = doneTasks.has(task.id)
            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors ${done ? 'bg-secondary/20' : 'hover:bg-secondary/30'}`}
              >
                <Checkbox
                  checked={done}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => navigate(task.path)}
                    className={`group flex w-full items-center gap-1 text-left text-sm leading-tight transition-colors ${
                      done
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground hover:text-primary'
                    }`}
                  >
                    <span>{task.label}</span>
                    {!done && (
                      <ArrowRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                  <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
                </div>
                <task.icon className={`h-4 w-4 shrink-0 mt-0.5 ${done ? 'text-muted-foreground/40' : 'text-primary/50'}`} />
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/20">
          <button
            onClick={() => void dismiss()}
            disabled={completing}
            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Ya conozco la plataforma
          </button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => navigate('/settings/docs')}
          >
            Ver docs
          </Button>
        </div>
      </Card>
    </div>
  )
}
