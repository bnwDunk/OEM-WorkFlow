import { getRoleDisplayName } from '../../../data/adminDashboard'
import type { ManagedUser } from '../../../data/adminDashboard'

type UserDetailModalProps = {
  onClose: () => void
  user: ManagedUser
}

function UserDetailModal({ onClose, user }: UserDetailModalProps) {
  const departments = user.departments?.length
    ? user.departments.map((department) => department.name)
    : user.department
      ? [user.department]
      : []

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-box user-detail-modal" aria-label={`${user.name} details`}>
        <div className="user-detail-head">
          <div>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </div>
          <span className={`department-status-pill ${user.status}`}>{user.status}</span>
        </div>

        <div className="user-detail-grid">
          <div>
            <span>Name</span>
            <strong>{user.name}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{getRoleDisplayName(user.role)}</strong>
          </div>
          <div>
            <span>Departments</span>
            <strong>{departments.length ? departments.join(', ') : 'No department'}</strong>
          </div>
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

export default UserDetailModal
