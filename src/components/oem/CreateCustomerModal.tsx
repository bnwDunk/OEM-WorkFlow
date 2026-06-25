import type { FormEvent } from 'react'
import type { ManagedFlow } from '../../data/adminDashboard'

type CreateCustomerModalProps = {
  flows: ManagedFlow[]
  loading: boolean
  onClose: () => void
  onCreate: (payload: { flowId: number; name: string }) => void
}

function CreateCustomerModal({ flows, loading, onClose, onCreate }: CreateCustomerModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const flowId = Number(data.get('flowId') || 0)

    if (!name || !flowId) return
    onCreate({ flowId, name })
  }

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-box create-customer-modal" onSubmit={handleSubmit}>
        <h3>สร้างลูกค้า</h3>
        <label>
          ชื่อลูกค้า / โปรเจกต์
          <input autoFocus name="name" placeholder="เช่น บริษัท ตัวอย่าง จำกัด" />
        </label>
        <label>
          Flow ที่ต้องการใช้
          <select defaultValue={flows[0]?.id || ''} name="flowId">
            {flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name} ({flow.stageCount} stages / {flow.phaseCount} phases)
              </option>
            ))}
          </select>
        </label>
        {flows.length === 0 && <p className="form-error">ยังไม่มี flow ในฐานข้อมูล กรุณาสร้าง flow ก่อน</p>}
        <div className="modal-actions">
          <button className="ghost" disabled={loading} onClick={onClose} type="button">ยกเลิก</button>
          <button className="primary" disabled={loading || flows.length === 0} type="submit">
            {loading ? 'กำลังสร้าง...' : 'สร้างลูกค้า'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateCustomerModal
