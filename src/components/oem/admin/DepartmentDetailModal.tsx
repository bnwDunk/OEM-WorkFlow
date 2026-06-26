import type { ManagedDepartment, ManagedUser } from '../../../data/adminDashboard'

export type DepartmentWorkItem = {
  flowId: number
  flowName: string
  phaseLabel: string
  phaseName: string
  stageName: string
}

type DepartmentDetailModalProps = {
  busy: boolean
  department: ManagedDepartment
  loading: boolean
  members: ManagedUser[]
  workItems: DepartmentWorkItem[]
  onClose: () => void
  onToggleStatus: (departmentId: number) => void
}

function DepartmentDetailModal({
  busy,
  department,
  loading,
  members,
  workItems,
  onClose,
  onToggleStatus,
}: DepartmentDetailModalProps) {
  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-box department-detail-modal" aria-label={`${department.name} department details`}>
        <div className="department-detail-head">
          <div>
            <h3>{department.name}</h3>
            <p>{department.code}</p>
          </div>
          <span className={`department-status-pill ${department.status}`}>{department.status}</span>
        </div>

        <div className="department-detail-summary">
          <div>
            <span>Members</span>
            <strong>{members.length}</strong>
          </div>
          <div>
            <span>Responsible work</span>
            <strong>{workItems.length}</strong>
          </div>
        </div>

        <section className="department-detail-block">
          <h4>Members</h4>
          <div className="department-member-list">
            {members.map((member) => (
              <div className="department-member-row" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>
                <span className={`department-status-pill ${member.status}`}>{member.role}</span>
              </div>
            ))}
            {members.length === 0 && <p className="department-empty">No users in this department yet.</p>}
          </div>
        </section>

        <section className="department-detail-block">
          <h4>Responsible workflow phases</h4>
          <div className="department-work-list">
            {loading && <p className="department-empty">Loading responsible work...</p>}
            {!loading && workItems.map((item, index) => (
              <div className="department-work-row" key={`${item.flowId}-${item.stageName}-${item.phaseLabel}-${index}`}>
                <span>{item.flowName}</span>
                <strong>{item.stageName} - Phase {item.phaseLabel}</strong>
                <p>{item.phaseName}</p>
              </div>
            ))}
            {!loading && workItems.length === 0 && <p className="department-empty">No workflow phases assigned to this department.</p>}
          </div>
        </section>

        <div className="modal-actions">
          <button className="ghost" disabled={busy} onClick={onClose} type="button">
            Close
          </button>
          <button className="primary" disabled={busy} onClick={() => onToggleStatus(department.id)} type="button">
            {department.status === 'active' ? 'Disable department' : 'Enable department'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default DepartmentDetailModal
