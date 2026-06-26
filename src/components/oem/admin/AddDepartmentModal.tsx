type AddDepartmentModalProps = {
  busy: boolean
  name: string
  onChangeName: (name: string) => void
  onClose: () => void
  onSubmit: () => void
}

function AddDepartmentModal({ busy, name, onChangeName, onClose, onSubmit }: AddDepartmentModalProps) {
  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        className="modal-box"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <h3>Create department</h3>
        <p className="modal-subtitle">Add a department that can own workflow phases and receive assigned users.</p>
        <label>
          Department name
          <input
            aria-label="Department name"
            autoFocus
            onChange={(event) => onChangeName(event.target.value)}
            placeholder="Department name"
            value={name}
          />
        </label>
        <div className="modal-actions">
          <button className="ghost" disabled={busy} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary" disabled={busy || !name.trim()} type="submit">
            {busy ? 'Creating...' : 'Create department'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddDepartmentModal
