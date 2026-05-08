import client from './client'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserProfile,
  SessionContext,
  UpdateProfileRequest,
  ChangePasswordRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '../types/auth'

export const login = (data: LoginRequest) =>
  client.post<AuthResponse>('/auth/login', data).then((r) => r.data)

export const register = (data: RegisterRequest) =>
  client.post<AuthResponse>('/auth/register', data).then((r) => r.data)

export const googleLogin = async (credential: string) => {
  const { data } = await client.post<AuthResponse>('/auth/google/verify', { credential })
  return data
}

export const logout = async () => {
  await client.post('/auth/logout')
}

export const switchRole = (role: string) =>
  client.post<AuthResponse>('/auth/role', { role }).then((r) => r.data)

export const getMe = () =>
  client.get<UserProfile>('/auth/me').then((r) => r.data)

export const updateMe = (payload: UpdateProfileRequest) =>
  client.put<UserProfile>('/auth/me', payload).then((r) => r.data)

export const changePassword = async (payload: ChangePasswordRequest) => {
  await client.post('/auth/change-password', payload)
}

export const getSession = () =>
  client.get<SessionContext>('/auth/session').then((r) => r.data)

export const createOrganization = (payload: CreateOrganizationRequest) =>
  client.post('/organizations', payload).then((r) => r.data)

export const updateCurrentOrganization = (payload: UpdateOrganizationRequest) =>
  client.put('/organizations/current', payload).then((r) => r.data)
