import client from './client'
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth'

export const login = (data: LoginRequest) =>
  client.post<AuthResponse>('/auth/login', data).then((r) => r.data)

export const register = (data: RegisterRequest) =>
  client.post<AuthResponse>('/auth/register', data).then((r) => r.data)

export const googleLogin = async (credential: string) => {
  const { data } = await client.post<AuthResponse>('/auth/google/verify', { credential })
  return data
}