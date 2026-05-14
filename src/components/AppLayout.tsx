import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Activity, AlertTriangle, BarChart3, Bell, LayoutDashboard, LogOut, Moon, Package, ReceiptText, Settings, Sun, Truck, UserSquare2 } from 'lucide-react'

import { getMetaAnalitica } from '@/api/analitica'
import { getAlertas } from '@/api/alerta'
import { getMe, logout as logoutRequest, updateMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useDisplayName, useProfileStore } from '@/store/profileStore'
import type { AnaliticaMeta } from '@/types/analitica'
import type { AlertaStock } from '@/types/alerta'
import { AppSidebar } from '@/components/AppSidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { normalizeAvatarUrl } from '@/lib/googleAvatar'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

type TopTab = { to: string; label: string }
type MobileNavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: (pathname: string) => boolean
}

const productosTabs: TopTab[] = [
  { to: '/productos', label: 'Productos' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/bundles', label: 'Bundles' },
]

const proveedoresTabs: TopTab[] = [
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/pedidos', label: 'Pedidos' },
]

const analiticaTabs: TopTab[] = [
  { to: '/analitica/resumen', label: 'Resumen' },
  { to: '/analitica/ventas-rentabilidad', label: 'Ventas y Rentabilidad' },
  { to: '/analitica/inventario', label: 'Inventario' },
  { to: '/analitica/precios-bundles', label: 'Precios y Bundles' },
  { to: '/analitica/proveedores', label: 'Proveedores' },
]

const settingsTabs: TopTab[] = [
  { to: '/settings/profile', label: 'Perfil' },
  { to: '/settings/organization', label: 'Organización' },
  { to: '/settings/users', label: 'Usuarios' },
  { to: '/settings/general', label: 'General' },
  { to: '/settings/security', label: 'Seguridad' },
]

const mobileNavItems: MobileNavItem[] = [
  {
    to: '/productos',
    label: 'Productos',
    icon: Package,
    isActive: (pathname) => inRouteGroup(pathname, ['/productos', '/categorias', '/bundles']),
  },
  {
    to: '/proveedores',
    label: 'Proveedores',
    icon: Truck,
    isActive: (pathname) => inRouteGroup(pathname, ['/proveedores', '/pedidos']),
  },
  {
    to: '/dashboard',
    label: 'Inicio',
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === '/' || pathname === '/inicio' || pathname === '/dashboard',
  },
  {
    to: '/clientes',
    label: 'Clientes',
    icon: UserSquare2,
    isActive: (pathname) => pathname.startsWith('/clientes'),
  },
  {
    to: '/ventas',
    label: 'Ventas',
    icon: ReceiptText,
    isActive: (pathname) => pathname.startsWith('/ventas'),
  },
]

const inRouteGroup = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

export default function AppLayout() {
  const { user, logout: clearSession } = useAuthStore()
  const setProfile = useProfileStore((s) => s.setProfile)
  const displayName = useDisplayName()
  const profileAvatarUrl = useProfileStore((s) => s.profile?.avatarUrl)
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, resolvedTheme, setTheme } = useTheme()

  const isSettingsRoute = location.pathname.startsWith('/settings')
  const [analyticsMeta, setAnalyticsMeta] = useState<AnaliticaMeta | null>(null)
  const [openAlertsCount, setOpenAlertsCount] = useState(0)
  const [recentOpenAlerts, setRecentOpenAlerts] = useState<AlertaStock[]>([])
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isMobile = useIsMobile()
  const activeTheme = theme === 'system' ? resolvedTheme : theme
  const isDarkTheme = activeTheme === 'dark'
  const accountLabel = displayName || user?.username || 'Usuario'
  const roleLabel = (user?.role ?? 'ROLE_VIEWER').replace('ROLE_', '')
  const initials = accountLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
    .slice(0, 2) || 'U'
  const effectiveAvatarUrl = normalizeAvatarUrl(profileAvatarUrl)

  const topTabs = useMemo(() => {
    if (isSettingsRoute) return settingsTabs
    if (inRouteGroup(location.pathname, ['/productos', '/categorias', '/bundles'])) return productosTabs
    if (inRouteGroup(location.pathname, ['/proveedores', '/pedidos'])) return proveedoresTabs
    if (inRouteGroup(location.pathname, ['/analitica'])) return analiticaTabs
    return []
  }, [isSettingsRoute, location.pathname])

  const sectionLabel = useMemo(() => {
    const path = location.pathname
    if (path === '/' || path === '/inicio' || path === '/dashboard') return 'Inicio'
    if (inRouteGroup(path, ['/productos', '/categorias', '/bundles'])) return 'Productos'
    if (inRouteGroup(path, ['/proveedores', '/pedidos'])) return 'Proveedores'
    if (path.startsWith('/movimientos')) return 'Movimientos'
    if (path.startsWith('/alertas')) return 'Alertas'
    if (path.startsWith('/analitica')) return 'Analitica'
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
        let me = await getMe()
        const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const shouldDetect =
          (!me.timeZone || me.timeZone === 'Europe/Madrid') &&
          !localStorage.getItem('tz-detected-once') &&
          Boolean(detectedTimeZone)
        if (shouldDetect) {
          try {
            me = await updateMe({
              nombre: me.nombre,
              apellidos: me.apellidos,
              email: me.email,
              timeZone: detectedTimeZone,
            })
            localStorage.setItem('tz-detected-once', '1')
          } catch {
            // ignore auto-detection errors
          }
        }
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
  }, [user?.token, setProfile])

  useEffect(() => {
    let isMounted = true
    const loadMeta = async () => {
      if (!user?.token) {
        if (isMounted) setAnalyticsMeta(null)
        return
      }
      try {
        const meta = await getMetaAnalitica(30)
        if (!isMounted) return
        setAnalyticsMeta(meta)
      } catch {
        if (!isMounted) return
        setAnalyticsMeta(null)
      }
    }
    void loadMeta()
    return () => {
      isMounted = false
    }
  }, [user?.token])

  useEffect(() => {
    let isMounted = true
    const loadOpenAlerts = async () => {
      if (!user?.token) {
        if (isMounted) {
          setOpenAlertsCount(0)
          setRecentOpenAlerts([])
        }
        return
      }
      try {
        const openAlerts = await getAlertas(false)
        if (!isMounted) return
        setOpenAlertsCount(openAlerts.length)
        setRecentOpenAlerts(openAlerts.slice(0, 5))
      } catch {
        if (!isMounted) return
        setOpenAlertsCount(0)
        setRecentOpenAlerts([])
      }
    }

    void loadOpenAlerts()
    const timer = window.setInterval(() => {
      void loadOpenAlerts()
    }, 30000)

    return () => {
      isMounted = false
      window.clearInterval(timer)
    }
  }, [user?.token])

  const dataModeLabel = useMemo(() => {
    if (!analyticsMeta) return null
    const isMockMode =
      analyticsMeta.source === 'API_REAL_LOCAL_SEEDED' ||
      analyticsMeta.source === 'API_REAL_SEED_PENDING'
    return isMockMode ? 'Modo de datos de prueba' : 'API real'
  }, [analyticsMeta])

  const handleLogout = async () => {
    try {
      await logoutRequest()
      toast.success('Sesión cerrada correctamente.')
    } catch {
      toast.error('No se pudo cerrar sesión en el servidor. Se cerrará localmente.')
    }
    clearSession()
    navigate('/login')
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      {!isMobile ? <AppSidebar isSettingsRoute={isSettingsRoute} collapsible="offcanvas" /> : null}
      <SidebarInset className="relative h-dvh min-h-0 min-w-0 overflow-hidden bg-transparent">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #f4f7fb 0%, #e9eef6 52%, #e3e9f3 100%)' }} />
          <div
            className="absolute inset-[-20%] dark:hidden blur-[24px]"
            style={{
              background:
                'radial-gradient(circle at 20% 18%, rgba(71,85,105,0.20), transparent 30%), radial-gradient(circle at 78% 26%, rgba(59,130,246,0.16), transparent 33%), linear-gradient(180deg, #f8fbff, #e9eef6)',
            }}
          />
          <div
            className="absolute inset-0 dark:hidden opacity-90 blur-[5px]"
            style={{
              background:
                'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.98), transparent 60%), radial-gradient(120% 60% at 50% 24%, rgba(203,213,225,0.42), transparent 61%), radial-gradient(120% 60% at 50% 50%, rgba(148,163,184,0.33), transparent 62%), radial-gradient(120% 60% at 50% 76%, rgba(148,163,184,0.24), transparent 62%)',
            }}
          />
          <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0b0b0c 0%, #050505 100%)' }} />
          <div
            className="absolute inset-[-20%] hidden dark:block blur-[34px]"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 25%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.05), transparent 30%), linear-gradient(180deg, #0b0b0c, #050505)',
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block opacity-95 blur-[8px]"
            style={{
              background:
                'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(120% 60% at 50% 25%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(120% 60% at 50% 50%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(120% 60% at 50% 75%, rgba(255,255,255,0.04), transparent 60%)',
            }}
          />
        </div>

        <header
          className="sticky top-0 z-50 shrink-0 overflow-hidden border-b border-border/60"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 dark:hidden"
            style={{ background: 'linear-gradient(180deg, #f4f7fb 0%, #e9eef6 52%, #e3e9f3 100%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-20%] z-0 dark:hidden blur-[24px]"
            style={{
              background:
                'radial-gradient(circle at 20% 18%, rgba(71,85,105,0.20), transparent 30%), radial-gradient(circle at 78% 26%, rgba(59,130,246,0.16), transparent 33%), linear-gradient(180deg, #f8fbff, #e9eef6)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 dark:hidden opacity-90 blur-[5px]"
            style={{
              background:
                'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.98), transparent 60%), radial-gradient(120% 60% at 50% 24%, rgba(203,213,225,0.42), transparent 61%), radial-gradient(120% 60% at 50% 50%, rgba(148,163,184,0.33), transparent 62%), radial-gradient(120% 60% at 50% 76%, rgba(148,163,184,0.24), transparent 62%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
            style={{ background: 'linear-gradient(180deg, #0b0b0c 0%, #050505 100%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-20%] z-0 hidden dark:block blur-[34px]"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 25%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.05), transparent 30%), linear-gradient(180deg, #0b0b0c, #050505)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 hidden dark:block opacity-95 blur-[8px]"
            style={{
              background:
                'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(120% 60% at 50% 25%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(120% 60% at 50% 50%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(120% 60% at 50% 75%, rgba(255,255,255,0.04), transparent 60%)',
            }}
          />
          <div className="relative z-10 flex min-h-14 items-center gap-2 px-3 sm:px-4">
            {!isMobile ? <SidebarTrigger className="-ml-1 shrink-0" /> : null}
            {topTabs.length > 0 ? (
              <Tabs value={location.pathname} className="min-w-0 flex-1 pr-20 sm:pr-24">
                <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsList
                    variant="line"
                    className="h-auto min-w-max justify-start gap-0 rounded-none bg-transparent"
                  >
                    {topTabs.map((tab) => (
                      <TabsTrigger
                        key={tab.to}
                        value={tab.to}
                        onClick={() => {
                          const shouldKeepSearch = location.pathname.startsWith('/analitica')
                          navigate({ pathname: tab.to, search: shouldKeepSearch ? location.search : '' })
                        }}
                        className="flex-none rounded-none px-3 py-2 text-sm"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>
            ) : (
              <div className="flex flex-1 items-center pr-20 sm:pr-24">
                {sectionLabel && <span className="ml-1 text-sm font-medium text-foreground">{sectionLabel}</span>}
                <div className="flex-1" />
              </div>
            )}

            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 sm:right-4 sm:gap-2">
              <Sheet open={alertsDrawerOpen} onOpenChange={setAlertsDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notificaciones de alertas">
                    <Bell className="h-4 w-4" />
                    {openAlertsCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                        {openAlertsCount > 99 ? '99+' : openAlertsCount}
                      </span>
                    ) : null}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md">
                  <SheetHeader className="pb-2">
                    <SheetTitle>Notificaciones</SheetTitle>
                    <SheetDescription>Alertas abiertas ({openAlertsCount})</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-4">
                    {recentOpenAlerts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay alertas abiertas.</p>
                    ) : (
                      recentOpenAlerts.map((alert) => (
                        <button
                          key={alert.id}
                          type="button"
                          className="w-full rounded-md bg-secondary/55 p-3 text-left transition-colors hover:bg-muted"
                          onClick={() => {
                            setAlertsDrawerOpen(false)
                            navigate('/alertas')
                          }}
                        >
                          <p className="text-sm font-medium">{alert.productoNombre} - {alert.tipo}</p>
                          <p className="truncate text-xs text-muted-foreground">{alert.mensaje}</p>
                        </button>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Perfil">
                    <Avatar className="h-7 w-7 rounded-full">
                      {effectiveAvatarUrl ? <img src={effectiveAvatarUrl} alt={accountLabel} referrerPolicy="no-referrer" className="aspect-square size-full rounded-full object-cover" /> : null}
                      <AvatarFallback className="rounded-full bg-muted text-[10px] text-muted-foreground">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="min-w-52">
                  <DropdownMenuLabel className="py-2">
                    <div className="truncate text-sm font-medium text-foreground">{accountLabel}</div>
                    <div className="truncate text-xs text-muted-foreground">{roleLabel}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setTheme(isDarkTheme ? 'light' : 'dark')}>
                    {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDarkTheme ? 'Modo claro' : 'Modo oscuro'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/movimientos')}>
                    <Activity className="h-4 w-4" />
                    Movimientos
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/alertas')}>
                    <AlertTriangle className="h-4 w-4" />
                    Alertas
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/analitica/resumen')}>
                    <BarChart3 className="h-4 w-4" />
                    Analítica
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/settings/general')}>
                    <Settings className="h-4 w-4" />
                    Ajustes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => { void handleLogout() }}>
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {dataModeLabel ? (
                <Badge
                  variant={dataModeLabel === 'Modo de datos de prueba' ? 'outline' : 'secondary'}
                  className="mr-1 hidden lg:inline-flex"
                >
                  {dataModeLabel}
                </Badge>
              ) : null}
            </div>
          </div>
        </header>

        <main className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pt-2 sm:pt-3 ${isMobile ? 'pb-24' : ''}`}>
          <Outlet />
        </main>

        {isMobile ? (
          <nav
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
          >
            <div className="grid grid-cols-5 gap-1 px-2 pt-2">
              {mobileNavItems.map((item) => {
                const active = item.isActive(location.pathname)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] leading-none transition-colors ${
                      active
                        ? 'bg-secondary/70 text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/45 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </nav>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  )
}
