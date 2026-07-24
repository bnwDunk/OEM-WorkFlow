import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import type { AuthUser } from './data/adminDashboard'
import FlowPage from './page/FlowPage'
import LoginPage from './page/LoginPage'
import { apiRequest, SESSION_EXPIRED_EVENT } from './lib/api'
import './App.css'

const fallbackUser: AuthUser = {
  id: 2,
  name: 'OEM User',
  email: 'user@oem.local',
  role: 'user',
  department: 'Sales',
  departments: [{ id: 1, name: 'Sales' }],
  departmentIds: [1],
}

function readStoredToken() {
  return localStorage.getItem('oem-access-token')
}

function normalizeRole(role: unknown): AuthUser['role'] {
  const value = String(role || 'user').trim().toLowerCase()
  return value === 'admin' || value === 'manager' ? value : 'user'
}

function normalizeUser(user: unknown): AuthUser | null {
  if (!user || typeof user !== 'object') return null

  const value = user as {
    id: number
    name: string
    email: string
    role: AuthUser['role']
    department?: string | { name?: string } | null
    departments?: { id?: number; name?: string }[]
    departmentIds?: number[]
  }
  const departments = Array.isArray(value.departments)
    ? value.departments
        .map((department) => ({
          id: Number(department.id || 0),
          name: String(department.name || '').trim(),
        }))
        .filter((department) => department.id && department.name)
    : []
  const department =
    typeof value.department === 'object' && value.department
      ? value.department.name || 'Sales'
      : value.department || departments[0]?.name || 'Sales'

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    role: normalizeRole(value.role),
    department,
    departments: departments.length ? departments : [{ id: 0, name: department }],
    departmentIds: departments.length ? departments.map((item) => item.id) : value.departmentIds || [],
  }
}

function readStoredUser() {
  const rawUser = localStorage.getItem('oem-user')
  if (!rawUser) return null

  try {
    return normalizeUser(JSON.parse(rawUser))
  } catch {
    return null
  }
}

function AppRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => readStoredUser())
  const [accessToken, setAccessToken] = useState<string | null>(() => readStoredToken())

  function handleLogin(user: AuthUser, accessTokenValue: string, refreshTokenValue: string) {
    localStorage.setItem('oem-auth', 'true')
    localStorage.setItem('oem-user', JSON.stringify(user))
    localStorage.setItem('oem-access-token', accessTokenValue)
    localStorage.setItem('oem-refresh-token', refreshTokenValue)
    setCurrentUser(user)
    setAccessToken(accessTokenValue)
  }

  function handleLogout() {
    localStorage.removeItem('oem-auth')
    localStorage.removeItem('oem-user')
    localStorage.removeItem('oem-access-token')
    localStorage.removeItem('oem-refresh-token')
    setCurrentUser(null)
    setAccessToken(null)
  }

  function handleUserChange(user: AuthUser) {
    localStorage.setItem('oem-user', JSON.stringify(user))
    setCurrentUser(user)
  }

  useEffect(() => {
    function handleSessionExpired() {
      setCurrentUser(null)
      setAccessToken(null)
      navigate('/login', { replace: true })
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [navigate])

  useEffect(() => {
    if (!accessToken) return

    let active = true

    async function syncCurrentUser() {
      try {
        const response = await apiRequest<{ user: unknown }>('/auth/me', { token: accessToken })
        const user = normalizeUser(response.user)
        if (active && user) {
          localStorage.setItem('oem-user', JSON.stringify(user))
          setCurrentUser(user)
        }
      } catch {
        // apiRequest will publish the session-expired event for invalid sessions.
      }
    }

    void syncCurrentUser()

    return () => {
      active = false
    }
  }, [accessToken])

  const isLoggedIn = Boolean(currentUser && accessToken)
  const user = currentUser || fallbackUser
  const requestedNextPath = new URLSearchParams(location.search).get('next') || ''
  const safeNextPath = requestedNextPath === '/flow' || requestedNextPath.startsWith('/flow/')
    ? requestedNextPath
    : '/flow'

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to={safeNextPath} replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/flow/*"
        element={
          isLoggedIn ? (
            <FlowPage
              accessToken={accessToken || ''}
              currentUser={user}
              onLogout={handleLogout}
              onUserChange={handleUserChange}
            />
          ) : (
            <Navigate
              to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
              replace
            />
          )
        }
      />
      <Route path="*" element={<Navigate to={isLoggedIn ? '/flow' : '/login'} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        gutter={10}
        position="top-right"
        toastOptions={{
          className: 'text-sm font-semibold',
          duration: 4000,
          style: {
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 18px 50px rgba(15, 23, 42, 0.12)',
          },
        }}
      />
    </BrowserRouter>
  )
}

export default App
