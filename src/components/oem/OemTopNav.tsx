import { useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { configSectionOptions } from '../../data/configSections'
import type { ConfigSection } from '../../data/configSections'
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
  bellOpen: boolean
  configSection: ConfigSection
  currentDept: string
  currentUser: AuthUser
  departments: string[]
  notifications: TopNavNotification[]
  profileOpen: boolean
  onChangeConfigSection: (section: ConfigSection) => void
  onChangeDept: (dept: string) => void
  onChangeView: (view: 'overview' | 'customers' | 'dept' | 'config' | 'admin') => void
  onLogout: () => void
  onMarkAllNotificationsRead: () => void | Promise<void>
  onMarkNotificationRead: (customerId: string, notificationIndex: number, notificationId?: number) => void | Promise<void>
  onOpenProfile: () => void
  onToggleBell: () => void
  onToggleProfile: () => void
}

function OemTopNav({
  activeView,
  bellOpen,
  configSection,
  currentDept,
  currentUser,
  departments,
  notifications,
  onChangeConfigSection,
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
  const [configOpen, setConfigOpen] = useState(false)
  const unreadNotifications = notifications.filter((notification) => !notification.read)
  const readNotifications = notifications.filter((notification) => notification.read)
  const visibleConfigSections = currentUser.role === 'admin'
    ? configSectionOptions
    : configSectionOptions.filter((option) => option.value === 'flows')

  function goTo(view: 'overview' | 'customers' | 'dept' | 'config' | 'admin') {
    setConfigOpen(false)
    onChangeView(view)
  }

  return (
    <header className="config-nav">
      <div className="config-nav-brand">P.Piya Solution</div>
      <nav className="config-nav-items" aria-label="OEM sections">
        <button className={`config-nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => goTo('overview')} type="button">
          Overview
        </button>
        <button className={`config-nav-item ${activeView === 'customers' ? 'active' : ''}`} onClick={() => goTo('customers')} type="button">
          Customer
        </button>
        <button className={`config-nav-item ${activeView === 'dept' ? 'active' : ''}`} onClick={() => goTo('dept')} type="button">
          Department
        </button>
        <div className={`config-nav-config ${configOpen ? 'open' : ''}`}>
          <button
            aria-expanded={configOpen}
            aria-haspopup="menu"
            className={`config-nav-item ${activeView === 'config' ? 'active' : ''}`}
            onClick={() => setConfigOpen((open) => !open)}
            type="button"
          >
            Configuration <span aria-hidden="true">▼</span>
          </button>
          {configOpen && (
            <div className="config-nav-dropdown" role="menu">
              {visibleConfigSections.map((option) => (
                <button
                  className={`config-nav-dd-item ${configSection === option.value ? 'active' : ''}`}
                  key={option.value}
                  onClick={() => {
                    setConfigOpen(false)
                    onChangeConfigSection(option.value)
                  }}
                  role="menuitem"
                  type="button"
                >
                  <b>{option.label}</b>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {currentUser.role === 'admin' && (
          <button className={`config-nav-item ${activeView === 'admin' ? 'active' : ''}`} onClick={() => goTo('admin')} type="button">
            Admin
          </button>
        )}
      </nav>

      <div className="config-nav-right oem-nav-actions">
        <button className="config-bell-btn" onClick={onToggleBell} type="button" aria-label="Notifications" title="Notifications">
          <FiBell aria-hidden="true" size={17} />
          {unreadNotifications.length > 0 && <span>{unreadNotifications.length}</span>}
        </button>
        {bellOpen && (
          <div className="dropdown-panel notification-panel">
            <div className="notification-head">
              <h5>Notifications</h5>
              {unreadNotifications.length > 0 && (
                <button className="mark-read-btn" onClick={() => void onMarkAllNotificationsRead()} type="button">
                  Mark all read
                </button>
              )}
            </div>

            <div className="notification-group">
              <div className="notification-section-title">
                <span>Unread</span>
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
              {unreadNotifications.length === 0 && <div className="notification-empty">No unread notifications</div>}
            </div>

            <div className="notification-group">
              <div className="notification-section-title">
                <span>Read</span>
                <em>{readNotifications.length}</em>
              </div>
              {readNotifications.slice(0, 8).map((item) => (
                <button className="dropdown-item notification-item read" key={`${item.customerId}-${item.notificationIndex}-${item.text}`} type="button">
                  <strong>{item.customerName}</strong>
                  <small>{item.text}</small>
                </button>
              ))}
              {readNotifications.length === 0 && <div className="notification-empty">No read notifications</div>}
            </div>
          </div>
        )}

        <button className="config-avatar-btn" onClick={onToggleProfile} type="button">
          <span className="config-avatar">{currentUser.name.slice(0, 1)}</span>
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
            <h5>Department</h5>
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
