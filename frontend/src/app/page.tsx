'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/ho-so-gpmb')
    } else {
      router.replace('/login')
    }
  }, [router])
  return null
}
