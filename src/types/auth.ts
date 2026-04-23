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
