import api from './api'
import { User } from '@/types'

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const res = await api.post('/auth/login', { username, password })
  const { access_token, user } = res.data
  localStorage.setItem('opc_token', access_token)
  localStorage.setItem('opc_user', JSON.stringify(user))
  return { token: access_token, user }
}

export function logout() {
  localStorage.removeItem('opc_token')
  localStorage.removeItem('opc_user')
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('opc_user')
  return stored ? JSON.parse(stored) : null
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('opc_token')
}
