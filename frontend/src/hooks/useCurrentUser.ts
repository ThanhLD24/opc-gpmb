import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { User } from '@/types'

export function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    setUser(getCurrentUser())
  }, [])
  return user
}
