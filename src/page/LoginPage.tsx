import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandBlock from '../components/BrandBlock'
import type { AuthUser } from '../data/adminDashboard'

type LoginPageProps = {
  onLogin: (user: AuthUser) => void
}

function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim().toLowerCase()
    const isAdmin = email === 'admin@oem.local'

    onLogin({
      id: isAdmin ? 1 : 2,
      name: isAdmin ? 'OEM Admin' : 'OEM User',
      email: isAdmin ? 'admin@oem.local' : 'user@oem.local',
      role: isAdmin ? 'admin' : 'user',
      department: isAdmin ? 'Admin' : 'Sales',
    })
    navigate('/flow', { replace: true })
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
            Email
            <input
              autoComplete="email"
              defaultValue="admin@oem.local"
              name="email"
              type="email"
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              defaultValue="password123"
              name="password"
              type="password"
            />
          </label>
          <button className="login-submit" type="submit">
            Login
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
