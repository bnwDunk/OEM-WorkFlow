import type { FormEvent } from 'react'
import { customerStatusOptions } from '../../data/oemWorkflow'
import type { Customer, CustomerStatus } from '../../data/oemWorkflow'

type CompanyModalProps = {
  loading?: boolean
  customer: Customer
  onClose: () => void
  onSave: (payload: { info: Customer['info']; name: string; status: CustomerStatus }) => void
}

function CompanyModal({ customer, loading = false, onClose, onSave }: CompanyModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    onSave({
      info: {
        costSyrup: String(data.get('costSyrup') || ''),
        costPackage: String(data.get('costPackage') || ''),
        price: String(data.get('price') || ''),
        volume: String(data.get('volume') || ''),
      },
      name: String(data.get('name') || '').trim(),
      status: String(data.get('status') || 'brief_spec') as CustomerStatus,
    })
  }

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-box" onSubmit={handleSubmit}>
        <h3>{customer.name}</h3>
        <div className="company-form-grid">
          <label className="span-2">
            Customer name
            <input defaultValue={customer.name} name="name" required />
          </label>
          <label className="span-2">
            Status
            <select defaultValue={customer.status || 'brief_spec'} name="status">
              {customerStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Cost (Syrup)
            <input defaultValue={customer.info.costSyrup} name="costSyrup" />
          </label>
          <label>
            Cost (Package)
            <input defaultValue={customer.info.costPackage} name="costPackage" />
          </label>
          <label>
            Price
            <input defaultValue={customer.info.price} name="price" />
          </label>
          <label>
            Volume
            <input defaultValue={customer.info.volume} name="volume" />
          </label>
        </div>
        <div className="modal-actions">
          <button className="ghost" disabled={loading} onClick={onClose} type="button">ยกเลิก</button>
          <button className="primary" disabled={loading} type="submit">{loading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </form>
    </div>
  )
}

export default CompanyModal
