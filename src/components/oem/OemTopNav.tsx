import { getRoleDisplayName } from '../../data/adminDashboard'
import type { AuthUser } from '../../data/adminDashboard'
import type { NotificationItem } from '../../data/oemWorkflow'

type OemTopNavProps = {
  activeView: string
  currentUser: AuthUser
  currentDept: string
  departments: string[]
  notifications: (NotificationItem & { customerName: string })[]
  bellOpen: boolean
  profileOpen: boolean
  onChangeDept: (dept: string) => void
  onChangeView: (view: 'overview' | 'customers' | 'dept' | 'config' | 'admin') => void
  onToggleBell: () => void
  onToggleProfile: () => void
  onLogout: () => void
  onOpenProfile: () => void
}

function OemTopNav({
  activeView,
  bellOpen,
  currentUser,
  currentDept,
  departments,
  notifications,
  onChangeDept,
  onChangeView,
  onLogout,
  onOpenProfile,
  onToggleBell,
  onToggleProfile,
  profileOpen,
}: OemTopNavProps) {
  return (
    <header className="oem-topnav">
      <div className="oem-brand">P.Piya Solution</div>
      <nav className="oem-tabs" aria-label="OEM sections">
        <button className={activeView === 'overview' ? 'active' : ''} onClick={() => onChangeView('overview')} type="button">
          Overview
        </button>
        <button className={activeView === 'customers' ? 'active' : ''} onClick={() => onChangeView('customers')} type="button">
          Customer
        </button>
        <button className={activeView === 'dept' ? 'active' : ''} onClick={() => onChangeView('dept')} type="button">
          แผนกของฉัน
        </button>
        <button className={activeView === 'config' ? 'active' : ''} onClick={() => onChangeView('config')} type="button">
          Configuration
        </button>
        {currentUser.role === 'admin' && (
          <button className={activeView === 'admin' ? 'active' : ''} onClick={() => onChangeView('admin')} type="button">
            Admin
          </button>
        )}
      </nav>

      <div className="oem-nav-actions">
        <button className="icon-btn" onClick={onToggleBell} type="button">
          Bell
          {notifications.length > 0 && <span>{notifications.length}</span>}
        </button>
        {bellOpen && (
          <div className="dropdown-panel">
            <h5>การแจ้งเตือนล่าสุด</h5>
            {notifications.slice(0, 8).map((item) => (
              <button className="dropdown-item" key={`${item.customerName}-${item.text}`} type="button">
                <strong>{item.customerName}</strong>
                <small>{item.text}</small>
              </button>
            ))}
          </div>
        )}

        <button className="profile-btn" onClick={onToggleProfile} type="button">
          <span className="avatar">{currentUser.name.slice(0, 1)}</span>
          {currentUser.name}
        </button>
        {profileOpen && (
          <div className="dropdown-panel profile-menu">
            <h5>Signed in</h5>
            <button className="profile-summary profile-summary-btn" onClick={onOpenProfile} type="button">
              <strong>{currentUser.name}</strong>
              <span>{currentUser.email}</span>
              <em>{getRoleDisplayName(currentUser.role)}</em>
            </button>
            <h5>แผนก</h5>
            {departments.map((department) => (
              <button
                className={department === currentDept ? 'dropdown-item selected' : 'dropdown-item'}
                key={department}
                onClick={() => onChangeDept(department)}
                type="button"
              >
                {department}
              </button>
            ))}
            <button className="dropdown-item logout-item" onClick={onLogout} type="button">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default OemTopNav
