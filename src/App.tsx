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

  function handleLogin(user: AuthUser) {
    localStorage.setItem('oem-auth', 'true')
    localStorage.setItem('oem-user', JSON.stringify(user))
    setCurrentUser(user)
  }

  function handleLogout() {
    localStorage.removeItem('oem-auth')
    localStorage.removeItem('oem-user')
    setCurrentUser(null)
  }

  const isLoggedIn = Boolean(currentUser) || localStorage.getItem('oem-auth') === 'true'
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
            <FlowPage currentUser={user} onLogout={handleLogout} />
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
