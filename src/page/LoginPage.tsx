import type { FormEvent } from 'react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import BrandBlock from '../components/BrandBlock'
import type { AuthUser } from '../data/adminDashboard'
import { apiRequest } from '../lib/api'

type LoginPageProps = {
  onLogin: (user: AuthUser, accessToken: string, refreshToken: string) => void
}

type LoginResponse = {
  access_token: string
  refresh_token: string
  user: {
    id: number
    name: string
    email: string
    role: string
    department: { name: string } | null
    departments?: { id: number; name: string }[]
  }
}

function normalizeRole(role: unknown): AuthUser['role'] {
  const value = String(role || 'user').trim().toLowerCase()
  return value === 'admin' || value === 'manager' ? value : 'user'
}

function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const identifier = String(data.get('identifier') || '').trim()
    const password = String(data.get('password') || '')

    try {
      setError('')
      setLoading(true)
      const response = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      })

      onLogin(
        {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: normalizeRole(response.user.role),
          department: response.user.department?.name || response.user.departments?.[0]?.name || 'Sales',
          departments: response.user.departments || [],
          departmentIds: response.user.departments?.map((department) => department.id) || [],
        },
        response.access_token,
        response.refresh_token,
      )
      navigate('/flow', { replace: true })
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Login failed.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="OEM overview">
        <BrandBlock title="ระบบติดตาม Flow งานผลิต OEM" />

        <div className="login-flow-preview" aria-hidden="true">
          <span>Brief</span>
          <i />
          <span>Cost</span>
          <i />
          <span>Sample</span>
          <i />
          <span>QC</span>
        </div>

        <div className="login-copy">
          <p>ล็อกอินเพื่อดูสถานะโปรเจกต์, เอกสาร approval, timeline และ QC gate ในที่เดียว</p>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Sign in</p>
          <h2 id="login-title">เข้าสู่ระบบ</h2>
          <p className="login-note">ใช้บัญชีทีมเพื่อเข้า dashboard งาน OEM</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username or email
            <input
              autoComplete="username"
              name="identifier"
              type="text"
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              type="password"
            />
          </label>
          <button className="login-submit" type="submit">
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {error && <p className="form-error">{error}</p>}
        </form>
      </section>
    </main>
  )
}

export default LoginPage
