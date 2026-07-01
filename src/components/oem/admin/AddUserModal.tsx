import { getRoleDisplayName } from '../../../data/adminDashboard'
import type { AppRole, ManagedDepartment } from '../../../data/adminDashboard'

export type NewUserDraft = {
  departmentIds: number[]
  email: string
  name: string
  password: string
  role: AppRole
}

type AddUserModalProps = {
  busy: boolean
  departments: ManagedDepartment[]
  draft: NewUserDraft
  roleOptions: AppRole[]
  onAddDepartment: (departmentId: number) => void
  onChange: (patch: Partial<NewUserDraft>) => void
  onClose: () => void
  onRemoveDepartment: (departmentId: number) => void
  onSubmit: () => void
}

function AddUserModal({
  busy,
  departments,
  draft,
  roleOptions,
  onAddDepartment,
  onChange,
  onClose,
  onRemoveDepartment,
  onSubmit,
}: AddUserModalProps) {
  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        className="modal-box"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <h3>Add user</h3>
        <label>
          Name
          <input
            aria-label="New user name"
            autoFocus
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Name"
            value={draft.name}
          />
        </label>
        <label>
          Email
          <input
            aria-label="New user email"
            onChange={(event) => onChange({ email: event.target.value })}
            placeholder="Email"
            type="email"
            value={draft.email}
          />
        </label>
        <label>
          Role
          <select
            aria-label="New user role"
            onChange={(event) => onChange({ role: event.target.value as AppRole })}
            value={draft.role}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>{getRoleDisplayName(role)}</option>
            ))}
          </select>
        </label>
        <label>
          Password
          <input
            aria-label="New user password"
            onChange={(event) => onChange({ password: event.target.value })}
            placeholder="Password"
            type="password"
            value={draft.password}
          />
        </label>
        <label>
          Departments
          <select
            aria-label="New user departments"
            onChange={(event) => {
              onAddDepartment(Number(event.target.value))
              event.currentTarget.value = ''
            }}
            value=""
          >
            <option value="">Add department...</option>
            {departments
              .filter((department) => !draft.departmentIds.includes(department.id))
              .map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
          </select>
        </label>
        <div className="flex min-h-11 flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {draft.departmentIds.map((departmentId) => {
            const department = departments.find((item) => item.id === departmentId)
            if (!department) return null

            return (
              <span className="admin-user-chip" key={department.id}>
                {department.name}
                <button onClick={() => onRemoveDepartment(department.id)} type="button">x</button>
              </span>
            )
          })}
          {draft.departmentIds.length === 0 && <span className="self-center text-xs font-extrabold text-slate-500">Optional: choose departments</span>}
        </div>
        <div className="modal-actions">
          <button className="ghost" disabled={busy} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary" disabled={busy || !draft.name.trim() || !draft.email.trim()} type="submit">
            {busy ? 'Adding...' : 'Add user'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddUserModal
