export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  nombre: string
  apellidos: string
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  username: string
  role: string
  expiresIn: number
  mustChangePassword: boolean
  timeZone: string
}

export interface AuthUser {
  username: string
  role: string
  token: string
  mustChangePassword: boolean
}

export interface UserProfile {
  id: number
  username: string
  email: string
  nombre: string
  apellidos: string
  role: string
  activo: boolean
  avatarUrl: string | null
  mustChangePassword: boolean
  timeZone: string
  onboardingCompleted: boolean
}

export interface UpdateProfileRequest {
  nombre: string
  apellidos: string
  email: string
  timeZone?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface SessionUser {
  id: number
  email: string
  username: string
}

export interface SessionOrganization {
  id: number
  name: string
  slug: string
}

export interface SessionContext {
  user: SessionUser
  organization: SessionOrganization | null
  role: string | null
  requiresOrganizationOnboarding: boolean
}

export interface CreateOrganizationRequest {
  name: string
}

export interface UpdateOrganizationRequest {
  name: string
}

export interface JoinOrganizationRequest {
  organizationId: number
}

export interface OrganizationSearchItem {
  id: number
  name: string
  slug: string
}

export interface OrganizationMembershipResponse {
  id: number
  organizationId: number
  userId: number
  role: string
}

export interface OrganizationWithMembershipResponse {
  organization: SessionOrganization
  membership: OrganizationMembershipResponse
}
