import { FiBell } from 'react-icons/fi'
import { getRoleDisplayName } from '../../data/adminDashboard'
import type { AuthUser } from '../../data/adminDashboard'
import type { NotificationItem } from '../../data/oemWorkflow'

type TopNavNotification = NotificationItem & {
  customerId: string
  customerName: string
  notificationId?: number
  notificationIndex: number
}

type OemTopNavProps = {
  activeView: string
  currentUser: AuthUser
  currentDept: string
  departments: string[]
  notifications: TopNavNotification[]
  bellOpen: boolean
  profileOpen: boolean
  onChangeDept: (dept: string) => void
  onChangeView: (view: 'overview' | 'customers' | 'dept' | 'config' | 'admin') => void
  onMarkAllNotificationsRead: () => void | Promise<void>
  onMarkNotificationRead: (customerId: string, notificationIndex: number, notificationId?: number) => void | Promise<void>
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
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onOpenProfile,
  onToggleBell,
  onToggleProfile,
  profileOpen,
}: OemTopNavProps) {
  const unreadNotifications = notifications.filter((notification) => !notification.read)
  const readNotifications = notifications.filter((notification) => notification.read)

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
        <button className="icon-btn" onClick={onToggleBell} type="button" aria-label="การแจ้งเตือน" title="การแจ้งเตือน">
          <FiBell aria-hidden="true" size={18} />
          {unreadNotifications.length > 0 && <span>{unreadNotifications.length}</span>}
        </button>
        {bellOpen && (
          <div className="dropdown-panel notification-panel">
            <div className="notification-head">
              <h5>การแจ้งเตือนล่าสุด</h5>
              {unreadNotifications.length > 0 && (
                <button className="mark-read-btn" onClick={() => void onMarkAllNotificationsRead()} type="button">
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            <div className="notification-group">
              <div className="notification-section-title">
                <span>ยังไม่อ่าน</span>
                <em>{unreadNotifications.length}</em>
              </div>
              {unreadNotifications.slice(0, 8).map((item) => (
                <button
                  className="dropdown-item notification-item unread"
                  key={`${item.customerId}-${item.notificationIndex}-${item.text}`}
                  onClick={() => void onMarkNotificationRead(item.customerId, item.notificationIndex, item.notificationId)}
                  type="button"
                >
                  <i aria-hidden="true" />
                  <strong>{item.customerName}</strong>
                  <small>{item.text}</small>
                </button>
              ))}
              {unreadNotifications.length === 0 && <div className="notification-empty">ไม่มีรายการที่ยังไม่อ่าน</div>}
            </div>

            <div className="notification-group">
              <div className="notification-section-title">
                <span>อ่านแล้ว</span>
                <em>{readNotifications.length}</em>
              </div>
              {readNotifications.slice(0, 8).map((item) => (
                <button className="dropdown-item notification-item read" key={`${item.customerId}-${item.notificationIndex}-${item.text}`} type="button">
                  <strong>{item.customerName}</strong>
                  <small>{item.text}</small>
                </button>
              ))}
              {readNotifications.length === 0 && <div className="notification-empty">ยังไม่มีรายการที่อ่านแล้ว</div>}
            </div>
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
