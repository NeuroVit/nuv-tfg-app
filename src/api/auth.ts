import client from './client'
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth'

export const login = (data: LoginRequest) =>
  client.post<AuthResponse>('/api/auth/login', data).then((r) => r.data)

export const register = (data: RegisterRequest) =>
  client.post<AuthResponse>('/api/auth/register', data).then((r) => r.data)