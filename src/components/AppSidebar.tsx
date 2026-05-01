import { NavLink, useNavigate } from 'react-router'
import { useAuthStore } from '@/store/authStore'
import { logout as logoutRequest } from '@/api/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Tags,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/categorias', label: 'Categorías', icon: Tags },
]

export function AppSidebar() {
  const { user, logout: clearSession } = useAuthStore()
  const navigate = useNavigate()

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'

  const handleLogout = async () => {
    try {
      await logoutRequest()
    } catch {
      // Si falla la llamada remota, igualmente cerramos sesión local.
    }
    clearSession()
    navigate('/login')
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="h-7 w-7 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.username ?? 'Usuario'}</span>
                    <span className="truncate text-xs">NeuralStock</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg" align="start" side="bottom" sideOffset={4}>
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Avatar className="h-7 w-7 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.username ?? 'Usuario'}</span>
                <span className="truncate text-xs text-muted-foreground">Activo</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
