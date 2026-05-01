const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Convert a relative /uploads/... path returned by the backend
 * into an absolute URL pointing to the FastAPI static file server.
 */
export function getFileUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // path starts with /uploads/... — prepend BE origin
  return `${API_BASE}${path}`
}

export function formatVND(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
