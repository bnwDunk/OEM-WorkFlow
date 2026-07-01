import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ManagedFlow } from '../../data/adminDashboard'
import CustomerNameCombobox from './CustomerNameCombobox'
import type { CustomerNameOption } from './CustomerNameCombobox'

type CreateCustomerModalProps = {
  customers?: CustomerNameOption[]
  flows: ManagedFlow[]
  loading: boolean
  onClose: () => void
  onCreate: (payload: { flowId: number; name: string }) => void
}

function CreateCustomerModal({ customers = [], flows, loading, onClose, onCreate }: CreateCustomerModalProps) {
  const [name, setName] = useState('')
  const [duplicateCustomer, setDuplicateCustomer] = useState<CustomerNameOption | undefined>()

  const typedName = name.trim()
  const canCreate = Boolean(typedName) && !duplicateCustomer

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const flowId = Number(data.get('flowId') || 0)

    if (!canCreate || !flowId) return
    onCreate({ flowId, name: typedName })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm max-sm:items-stretch max-sm:p-3"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        className="grid max-h-[92svh] min-h-[min(560px,calc(100svh-36px))] w-[min(720px,calc(100vw-36px))] gap-5 overflow-visible rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.22)] max-sm:min-h-[min(560px,calc(100svh-24px))] max-sm:w-full max-sm:max-h-[calc(100svh-24px)] max-sm:overflow-auto max-sm:p-5"
        onSubmit={handleSubmit}
      >
        <h3 className="m-0 text-2xl font-black leading-tight text-slate-950">สร้างลูกค้า</h3>
        <div className="grid gap-2 font-bold text-slate-900">
          <CustomerNameCombobox
            autoFocus
            customers={customers}
            id="create-customer-name"
            label="ชื่อลูกค้า / โปรเจกต์"
            onChange={setName}
            onDuplicateChange={setDuplicateCustomer}
            placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
            value={name}
          />
        </div>
        <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
          Flow ที่ต้องการใช้
          <select
            className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold normal-case text-slate-900 outline-none transition hover:border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
            defaultValue={flows[0]?.id || ''}
            name="flowId"
          >
            {flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name} ({flow.stageCount} stages / {flow.phaseCount} phases)
              </option>
            ))}
          </select>
        </label>
        {flows.length === 0 && (
          <p className="m-0 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            ยังไม่มี flow ในฐานข้อมูล กรุณาสร้าง flow ก่อน
          </p>
        )}
        <div className="mt-auto flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            className="min-h-11 rounded-xl !border-0 !bg-slate-100 px-5 text-sm font-black !text-slate-600 transition hover:!bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            ยกเลิก
          </button>
          <button
            className="min-h-11 rounded-xl !border-0 !bg-teal-700 px-5 text-sm font-black !text-white shadow-sm transition hover:!bg-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-300 disabled:!text-slate-500 disabled:opacity-100"
            disabled={loading || flows.length === 0 || !canCreate}
            type="submit"
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างลูกค้า'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateCustomerModal
