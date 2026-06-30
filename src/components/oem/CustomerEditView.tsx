import { useState } from 'react'
import type { FormEvent } from 'react'
import { customerStatusOptions } from '../../data/oemWorkflow'
import type { Customer, CustomerStatus } from '../../data/oemWorkflow'

export type CustomerEditPayload = {
  dueDate: string
  info: Customer['info']
  name: string
  salesperson: string
  status: CustomerStatus
  tagsText: string
}

type CustomerEditViewProps = {
  customer: Customer
  loading?: boolean
  salespersonName: string
  onBack: () => void
  onSave: (payload: CustomerEditPayload) => void
}

function getDaysLeft(dueDate: string) {
  if (!dueDate) return ''

  const due = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return String(Math.ceil((due.getTime() - today.getTime()) / 86_400_000))
}

function CustomerEditView({ customer, loading = false, salespersonName, onBack, onSave }: CustomerEditViewProps) {
  const [dueDate, setDueDate] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    onSave({
      dueDate: String(data.get('dueDate') || ''),
      info: {
        costSyrup: String(data.get('costSyrup') || ''),
        costPackage: String(data.get('costPackage') || ''),
        price: String(data.get('price') || ''),
        volume: String(data.get('volume') || ''),
      },
      name: String(data.get('name') || '').trim(),
      salesperson: String(data.get('salesperson') || ''),
      status: String(data.get('status') || 'brief_spec') as CustomerStatus,
      tagsText: String(data.get('tagsText') || ''),
    })
  }

  return (
    <section className="page-pad">
      <form className="mx-auto grid max-w-6xl gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <label className="sr-only" htmlFor="customer-edit-name">Customer name</label>
            <input
              className="w-full border-0 bg-transparent p-0 text-4xl font-normal leading-tight text-slate-950 outline-none [overflow-wrap:anywhere] focus:ring-0"
              defaultValue={customer.name}
              id="customer-edit-name"
              name="name"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              disabled={loading}
              onClick={onBack}
              type="button"
            >
              Back
            </button>
            <button
              className="min-h-11 rounded-lg border-0 bg-teal-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="border border-slate-500 bg-slate-100 px-4 py-14">
          <div className="grid gap-x-16 gap-y-4 md:grid-cols-2">
            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Due Date</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                name="dueDate"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </label>

            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Days Left</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                name="daysLeft"
                readOnly
                value={getDaysLeft(dueDate)}
              />
            </label>

            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Cost (Syrup)</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                defaultValue={customer.info.costSyrup}
                name="costSyrup"
              />
            </label>

            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Cost (Package)</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                defaultValue={customer.info.costPackage}
                name="costPackage"
              />
            </label>

            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Price</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                defaultValue={customer.info.price}
                name="price"
              />
            </label>

            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Salesperson</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                defaultValue={salespersonName}
                name="salesperson"
              />
            </label>

            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Volume</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                defaultValue={customer.info.volume}
                name="volume"
              />
            </label>

            <label className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 text-xl text-black">
              <span>Tags</span>
              <input
                className="h-8 min-w-0 border-0 border-b border-black bg-transparent px-1 text-xl outline-none focus:border-teal-700 focus:ring-0"
                defaultValue={customer.tags.map((tag) => tag.name).join(', ')}
                name="tagsText"
              />
            </label>
          </div>

          <label className="mt-5 grid max-w-md grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-xl text-black">
            <span>Status</span>
            <select
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-base font-bold text-slate-900"
              defaultValue={customer.status || 'brief_spec'}
              name="status"
            >
              {customerStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </section>
  )
}

export default CustomerEditView
