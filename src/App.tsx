import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import FlowPage from './page/FlowPage'
import LoginPage from './page/LoginPage'
import './App.css'

function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('oem-auth') === 'true',
  )

  function handleLogin() {
    localStorage.setItem('oem-auth', 'true')
    setIsLoggedIn(true)
  }

  function handleLogout() {
    localStorage.removeItem('oem-auth')
    setIsLoggedIn(false)
  }

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
            <FlowPage onLogout={handleLogout} />
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
