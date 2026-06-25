const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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

function normalizeStoredUser(user: unknown) {
  if (!user || typeof user !== 'object') return user

  const value = user as {
    department?: string | { name?: string } | null
  }

  if (!value.department || typeof value.department === 'string') return user

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
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) return null

  const body = await response.json() as RefreshResponse
  localStorage.setItem('oem-access-token', body.access_token)
  localStorage.setItem('oem-refresh-token', body.refresh_token)
  localStorage.setItem('oem-user', JSON.stringify(normalizeStoredUser(body.user)))

  return body.access_token
}

function clearStoredSession() {
  localStorage.removeItem('oem-auth')
  localStorage.removeItem('oem-user')
  localStorage.removeItem('oem-access-token')
  localStorage.removeItem('oem-refresh-token')
}

async function sendRequest(path: string, options: ApiOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  const token = options.token || localStorage.getItem('oem-access-token')

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

  return response.json() as Promise<T>
}

export { API_BASE_URL }
