import type { Department, NotificationItem } from '../../data/oemWorkflow'

type OemTopNavProps = {
  activeView: string
  currentDept: string
  departments: Department[]
  notifications: (NotificationItem & { customerName: string })[]
  bellOpen: boolean
  profileOpen: boolean
  onChangeView: (view: 'overview' | 'dept' | 'config') => void
  onChangeDept: (dept: string) => void
  onToggleBell: () => void
  onToggleProfile: () => void
  onLogout: () => void
}

function OemTopNav({
  activeView,
  bellOpen,
  currentDept,
  departments,
  notifications,
  onChangeDept,
  onChangeView,
  onLogout,
  onToggleBell,
  onToggleProfile,
  profileOpen,
}: OemTopNavProps) {
  return (
    <header className="oem-topnav">
      <div className="oem-brand">OEM Flow</div>
      <nav className="oem-tabs" aria-label="OEM sections">
        <button className={activeView === 'overview' ? 'active' : ''} onClick={() => onChangeView('overview')} type="button">
          Overview
        </button>
        <button className={activeView === 'dept' ? 'active' : ''} onClick={() => onChangeView('dept')} type="button">
          แผนกของฉัน
        </button>
        <button className={activeView === 'config' ? 'active' : ''} onClick={() => onChangeView('config')} type="button">
          Configuration
        </button>
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
          <span className="avatar">{currentDept.slice(0, 1)}</span>
          {currentDept}
        </button>
        {profileOpen && (
          <div className="dropdown-panel profile-menu">
            <h5>ดูในนามแผนก</h5>
            {departments.map((department) => (
              <button
                className={department.name === currentDept ? 'dropdown-item selected' : 'dropdown-item'}
                key={department.name}
                onClick={() => onChangeDept(department.name)}
                type="button"
              >
                {department.name}
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
