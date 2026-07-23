const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
export const SESSION_EXPIRED_EVENT = 'oem-session-expired'

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is required. Please set it in the frontend .env file.')
}

type ApiOptions = RequestInit & {
  token?: string | null
}

type RefreshResponse = {
  access_token: string
  refresh_token: string
  user: unknown
}

const latin1MojibakePattern = /(?:Ã.|Â.|à¸|à¹|â€|â€™|â€œ|â€�|â€“|â€”|เน|เธ|โเธ|เเธ)/

function repairMojibakeString(value: string) {
  if (!latin1MojibakePattern.test(value)) return value

  try {
    const bytes = Uint8Array.from([...value].map((character) => character.charCodeAt(0) & 0xff))
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes)

    return /[\u0E00-\u0E7F]/.test(repaired) ? repaired : value
  } catch {
    return value
  }
}

function normalizeTextEncoding<T>(value: T): T {
  if (typeof value === 'string') {
    return repairMojibakeString(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeTextEncoding(item)) as T
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeTextEncoding(item)]),
    ) as T
  }

  return value
}

function normalizeStoredUser(user: unknown) {
  if (!user || typeof user !== 'object') return user

  const value = user as {
    department?: string | { name?: string } | null
    departments?: { name?: string }[]
  }

  if (!value.department || typeof value.department === 'string') {
    return {
      ...value,
      department: value.department || value.departments?.[0]?.name || 'Sales',
    }
  }

  return {
    ...value,
    department: value.department.name || 'Sales',
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('oem-refresh-token')
  if (!refreshToken) return null

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json; charset=utf-8',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) return null

  const body = await response.json() as RefreshResponse
  localStorage.setItem('oem-access-token', body.access_token)
  localStorage.setItem('oem-refresh-token', body.refresh_token)
  localStorage.setItem('oem-user', JSON.stringify(normalizeStoredUser(normalizeTextEncoding(body.user))))

  return body.access_token
}

function clearStoredSession() {
  localStorage.removeItem('oem-auth')
  localStorage.removeItem('oem-user')
  localStorage.removeItem('oem-access-token')
  localStorage.removeItem('oem-refresh-token')
}

function notifySessionExpired() {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

async function sendRequest(path: string, options: ApiOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json; charset=utf-8')
  headers.set('Content-Type', 'application/json; charset=utf-8')

  const token = localStorage.getItem('oem-access-token') || options.token

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  let response = await sendRequest(path, options)

  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const newToken = await refreshAccessToken()

    if (newToken) {
      response = await sendRequest(path, { ...options, token: newToken })
    } else {
      clearStoredSession()
      notifySessionExpired()
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.json() as T

  return normalizeTextEncoding(body)
}

export async function apiBlobRequest(path: string, options: ApiOptions = {}): Promise<Blob> {
  let response = await sendRequest(path, options)

  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const newToken = await refreshAccessToken()

    if (newToken) {
      response = await sendRequest(path, { ...options, token: newToken })
    } else {
      clearStoredSession()
      notifySessionExpired()
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `Request failed with status ${response.status}`)
  }

  return response.blob()
}

export { API_BASE_URL }
