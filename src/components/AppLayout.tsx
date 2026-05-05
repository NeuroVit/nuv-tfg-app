import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getMe, logout as logoutRequest } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import type { UserProfile } from '@/types/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useProfileStore } from '@/store/profileStore'

const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())

type TopTab = {
  to: string
  label: string
}

const productosTabs: TopTab[] = [
  { to: '/productos', label: 'Productos' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/bundles', label: 'Bundles' },
]

const proveedoresTabs: TopTab[] = [
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/pedidos', label: 'Pedidos' },
]

const inRouteGroup = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

export default function AppLayout() {
  const { user, logout: clearSession } = useAuthStore()
  const setDisplayName = useProfileStore((s) => s.setDisplayName)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const isSettingsRoute = location.pathname.startsWith('/settings')
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'
  const roleLabel = (user?.role ?? 'ROLE_VIEWER').replace('ROLE_', '')
  const topTabs = useMemo(() => {
    if (isSettingsRoute) return []

    if (inRouteGroup(location.pathname, ['/productos', '/categorias', '/bundles'])) {
      return productosTabs
    }

    if (inRouteGroup(location.pathname, ['/proveedores', '/pedidos'])) {
      return proveedoresTabs
    }

    return []
  }, [isSettingsRoute, location.pathname])
  const accountLabel = useMemo(() => {
    const fullName = [profile?.nombre?.trim(), profile?.apellidos?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim()
    return toTitleCase(fullName || user?.username || 'Usuario')
  }, [profile?.apellidos, profile?.nombre, user?.username])

  useEffect(() => {
    setDisplayName(accountLabel)
  }, [accountLabel, setDisplayName])

  const sectionLabel = useMemo(() => {
    const path = location.pathname
    if (path === '/' || path === '/inicio' || path === '/dashboard') return 'Inicio'
    if (inRouteGroup(path, ['/productos', '/categorias', '/bundles'])) return 'Productos'
    if (inRouteGroup(path, ['/proveedores', '/pedidos'])) return 'Proveedores'
    if (path.startsWith('/movimientos')) return 'Movimientos'
    if (path.startsWith('/alertas')) return 'Alertas'
    if (path.startsWith('/analitica')) return 'Analítica'
    if (path.startsWith('/clientes')) return 'Clientes'
    if (path.startsWith('/ventas')) return 'Ventas'
    if (path.startsWith('/settings')) return 'Ajustes'
    return ''
  }, [location.pathname])

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      if (!user?.token) {
        if (isMounted) setProfile(null)
        return
      }

      try {
        const me = await getMe()
        if (!isMounted) return
        setProfile(me)
      } catch {
        if (!isMounted) return
        setProfile(null)
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [user?.token])

  const handleLogout = async () => {
    try {
      await logoutRequest()
      toast.success('Sesión cerrada correctamente.')
    } catch {
      // Si falla la llamada remota, igualmente cerramos sesión local.
      toast.error('No se pudo cerrar sesión en el servidor. Se cerrará localmente.')
    }
    clearSession()
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar isSettingsRoute={isSettingsRoute} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b bg-background px-3 py-2 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          {sectionLabel && (
            <span className="ml-1 text-sm font-medium text-foreground">{sectionLabel}</span>
          )}
          {topTabs.length > 0 && (
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          )}
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {topTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Cambiar tema</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto gap-2 px-1.5 py-1 data-[state=open]:bg-accent sm:px-2"
              >
                <Avatar className="h-7 w-7 rounded-full">
                  <AvatarFallback className="rounded-full bg-muted text-muted-foreground text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left text-sm leading-tight sm:grid">
                  <span className="max-w-44 truncate font-medium">{accountLabel}</span>
                  <Badge variant="secondary" className="mt-1 w-fit px-1.5 py-0 text-[10px]">
                    {roleLabel}
                  </Badge>
                </div>
                <ChevronsUpDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="end" side="bottom" sideOffset={8}>
              <DropdownMenuItem onSelect={() => navigate('/settings/general')}>
                <Settings className="h-4 w-4" />
                Ajustes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  void handleLogout()
                }}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
