import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { AuthUser } from './data/adminDashboard'
import FlowPage from './page/FlowPage'
import LoginPage from './page/LoginPage'
import './App.css'

const fallbackUser: AuthUser = {
  id: 2,
  name: 'OEM User',
  email: 'user@oem.local',
  role: 'user',
  department: 'Sales',
}

function readStoredToken() {
  return localStorage.getItem('oem-access-token')
}

function readStoredUser() {
  const rawUser = localStorage.getItem('oem-user')
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser) as AuthUser
  } catch {
    return null
  }
}

function AppRoutes() {
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

  const isLoggedIn = Boolean(currentUser && accessToken)
  const user = currentUser || fallbackUser

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/flow" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/flow"
        element={
          isLoggedIn ? (
            <FlowPage accessToken={accessToken || ''} currentUser={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
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
    </BrowserRouter>
  )
}

export default App
