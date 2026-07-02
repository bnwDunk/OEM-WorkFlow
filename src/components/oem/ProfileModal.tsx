import { useState } from 'react'
import toast from 'react-hot-toast'
import { getRoleDisplayName } from '../../data/adminDashboard'
import type { AuthUser } from '../../data/adminDashboard'

type ProfileModalProps = {
  currentUser: AuthUser
  onClose: () => void
  onSave: (payload: { email: string; name: string }) => Promise<void>
}

function ProfileModal({ currentUser, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    const nextName = name.trim()
    const nextEmail = email.trim().toLowerCase()

    if (!nextName || !nextEmail) {
      setError('Name and email are required.')
      toast.error('Name and email are required.')
      return
    }

    try {
      setError('')
      setSaving(true)
      await onSave({ email: nextEmail, name: nextName })
      toast.success('Updated profile.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to update profile.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        className="modal-box profile-edit-modal"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <h3>My profile</h3>
        {error && <p className="form-error">{error}</p>}
        <label>
          Name
          <input
            autoFocus
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label>
          Email for notifications
          <input
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <div className="profile-readonly-grid">
          <div>
            <span>Role</span>
            <strong>{getRoleDisplayName(currentUser.role)}</strong>
          </div>
          <div>
            <span>Departments</span>
            <strong>{currentUser.departments?.map((department) => department.name).join(', ') || currentUser.department}</strong>
          </div>
        </div>
        <div className="modal-actions">
          <button className="ghost" disabled={saving} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary" disabled={saving || !name.trim() || !email.trim()} type="submit">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProfileModal
