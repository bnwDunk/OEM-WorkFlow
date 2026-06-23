import type { FormEvent } from 'react'
import type { Customer } from '../../data/oemWorkflow'

type CompanyModalProps = {
  customer: Customer
  onClose: () => void
  onSave: (info: Customer['info']) => void
}

function CompanyModal({ customer, onClose, onSave }: CompanyModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    onSave({
      costSyrup: String(data.get('costSyrup') || ''),
      costPackage: String(data.get('costPackage') || ''),
      price: String(data.get('price') || ''),
      volume: String(data.get('volume') || ''),
    })
  }

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-box" onSubmit={handleSubmit}>
        <h3>{customer.name}</h3>
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
        <div className="modal-actions">
          <button className="ghost" onClick={onClose} type="button">ยกเลิก</button>
          <button className="primary" type="submit">บันทึก</button>
        </div>
      </form>
    </div>
  )
}

export default CompanyModal
