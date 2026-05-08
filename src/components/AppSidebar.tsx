import { useNavigate, NavLink } from 'react-router'
import { toast } from 'sonner'
import { logout as logoutRequest } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Truck,
  UserCircle2,
  UserSquare2,
  Users,
} from 'lucide-react'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> }

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { to: '/productos', label: 'Productos', icon: Package },
      { to: '/proveedores', label: 'Proveedores', icon: Truck },
      { to: '/movimientos', label: 'Movimientos', icon: Activity },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/alertas', label: 'Alertas', icon: AlertTriangle },
      { to: '/analitica', label: 'Analítica', icon: BarChart3 },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/clientes', label: 'Clientes', icon: UserSquare2 },
      { to: '/ventas', label: 'Ventas', icon: ReceiptText },
    ],
  },
]

const settingsNavItems: NavItem[] = [
  { to: '/settings/profile', label: 'Perfil', icon: UserCircle2 },
  { to: '/settings/organization', label: 'Organización', icon: Building2 },
  { to: '/settings/users', label: 'Usuarios', icon: Users },
  { to: '/settings/general', label: 'General', icon: SlidersHorizontal },
  { to: '/settings/security', label: 'Seguridad', icon: ShieldCheck },
]

type AppSidebarProps = {
  isSettingsRoute?: boolean
}

export function AppSidebar({ isSettingsRoute = false }: AppSidebarProps) {
  const { user, logout: clearSession } = useAuthStore()
  const displayName = useProfileStore((s) => s.displayName)
  const organizationName = useProfileStore((s) => s.organizationName)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'
  const roleLabel = (user?.role ?? 'ROLE_VIEWER').replace('ROLE_', '')
  const accountLabel = displayName || user?.username || 'Usuario'
  const organizationLabel = organizationName || 'Organización'

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
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {isSettingsRoute ? (
              <NavLink to="/dashboard">
                {({ isActive }) => (
                  <SidebarMenuButton isActive={isActive} size="lg" tooltip="Volver a la app">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <ArrowLeft className="h-4 w-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Volver a la app</span>
                      <span className="truncate text-xs text-muted-foreground">Regresar al dashboard</span>
                    </div>
                  </SidebarMenuButton>
                )}
              </NavLink>
            ) : (
              <SidebarMenuButton size="lg" className="cursor-default">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground">
                  NS
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{organizationLabel}</span>
                  <span className="truncate text-xs text-muted-foreground">NeuralStock</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isSettingsRoute ? (
          <SidebarGroup>
            <SidebarGroupLabel>Ajustes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsNavItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to}>
                      {({ isActive }) => (
                        <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          navGroups.map((group, i) => (
            <SidebarGroup key={i}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <NavLink to={item.to}>
                        {({ isActive }) => (
                          <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={accountLabel}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-7 w-7 rounded-full">
                    <AvatarFallback className="rounded-full bg-muted text-muted-foreground text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{accountLabel}</span>
                    <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={4}
                className="w-[--radix-popper-anchor-width] min-w-52"
              >
                <DropdownMenuItem onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
