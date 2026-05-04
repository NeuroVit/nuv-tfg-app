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
}

export interface AuthUser {
  username: string
  role: string
  token: string
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
}

export interface UpdateProfileRequest {
  nombre: string
  apellidos: string
  email: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
