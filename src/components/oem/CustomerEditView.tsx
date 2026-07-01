import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { customerStatusOptions } from '../../data/oemWorkflow'
import type { Customer, CustomerStatus, CustomerTag } from '../../data/oemWorkflow'
import CustomerNameCombobox from './CustomerNameCombobox'
import type { CustomerNameOption } from './CustomerNameCombobox'
import SalespersonCombobox from './SalespersonCombobox'
import type { SalespersonOption } from './SalespersonCombobox'

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
  customers?: CustomerNameOption[]
  loading?: boolean
  salespersonName: string
  salespersonOptions?: SalespersonOption[]
  onBack: () => void
  onRemoveTag?: (tag: CustomerTag) => Promise<void>
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

function CustomerEditView({
  customer,
  customers = [],
  loading = false,
  salespersonName,
  salespersonOptions = [],
  onBack,
  onRemoveTag,
  onSave,
}: CustomerEditViewProps) {
  const [dueDate, setDueDate] = useState(customer.dueDate || '')
  const [name, setName] = useState(customer.name)
  const [salesperson, setSalesperson] = useState(customer.salesperson || salespersonName)
  const [tags, setTags] = useState<CustomerTag[]>(customer.tags)
  const [tagDraft, setTagDraft] = useState('')
  const [removingTagKey, setRemovingTagKey] = useState('')
  const [duplicateCustomer, setDuplicateCustomer] = useState<CustomerNameOption | undefined>()

  useEffect(() => {
    setName(customer.name)
    setSalesperson(customer.salesperson || salespersonName)
    setDueDate(customer.dueDate || '')
    setTags(customer.tags)
    setTagDraft('')
    setRemovingTagKey('')
  }, [customer.dueDate, customer.id, customer.name, customer.salesperson, customer.tags, salespersonName])

  const typedName = name.trim()
  const canSubmit = Boolean(typedName) && !duplicateCustomer && !loading

  function addTagFromDraft() {
    const nextTagName = tagDraft.trim().replace(/^,+|,+$/g, '').trim()
    if (!nextTagName) return

    setTags((currentTags) => {
      const alreadyExists = currentTags.some((tag) => tag.name.trim().toLowerCase() === nextTagName.toLowerCase())
      if (alreadyExists) return currentTags
      return [...currentTags, { name: nextTagName }]
    })
    setTagDraft('')
  }

  async function removeTag(tagToRemove: CustomerTag) {
    const tagKey = `${tagToRemove.id || tagToRemove.name}-${tagToRemove.color || ''}`
    setRemovingTagKey(tagKey)

    try {
      if (tagToRemove.id && onRemoveTag) {
        await onRemoveTag(tagToRemove)
      }

      setTags((currentTags) =>
        currentTags.filter((tag) => {
          if (tagToRemove.id && tag.id) return tag.id !== tagToRemove.id
          return tag.name !== tagToRemove.name
        }),
      )
    } catch {
      return
    } finally {
      setRemovingTagKey('')
    }
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    addTagFromDraft()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    const data = new FormData(event.currentTarget)

    onSave({
      dueDate: String(data.get('dueDate') || ''),
      info: {
        costSyrup: String(data.get('costSyrup') || ''),
        costPackage: String(data.get('costPackage') || ''),
        price: String(data.get('price') || ''),
        volume: String(data.get('volume') || ''),
      },
      name: name.trim(),
      salesperson,
      status: String(data.get('status') || 'brief_spec') as CustomerStatus,
      tagsText: tags.map((tag) => tag.name.trim()).filter(Boolean).join(', '),
    })
  }

  return (
    <section className="min-h-[calc(100svh-52px)] bg-white px-5 py-6 sm:px-8">
      <form className="mx-auto grid max-w-7xl gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-teal-700">Customer profile</p>
            <div className="relative max-w-4xl">
              <CustomerNameCombobox
                customers={customers}
                excludeCustomerId={customer.id}
                id="customer-edit-name"
                label="Customer"
                onChange={setName}
                onDuplicateChange={setDuplicateCustomer}
                value={name}
                warningClassName="mt-2 text-sm font-bold text-rose-600"
              />
            </div>
          </div>
          <div className="flex gap-2 lg:pt-6">
            <button
              className="min-h-11 rounded-xl !border !border-slate-200 !bg-white px-5 text-sm font-black !text-slate-700 shadow-sm transition hover:!bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={onBack}
              type="button"
            >
              Back
            </button>
            <button
              className="min-h-11 rounded-xl !border-0 !bg-teal-700 px-5 text-sm font-black !text-white shadow-sm transition hover:!bg-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-300 disabled:!text-slate-500 disabled:opacity-100"
              disabled={!canSubmit}
              type="submit"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-xl font-black text-slate-950">Customer details</h2>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-500">แก้ไขข้อมูลราคา สถานะ และรายละเอียดงานของลูกค้า</p>
            </div>
          </div>

          <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Due Date</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                name="dueDate"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Days Left</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-100 px-4 text-base font-bold text-slate-500 outline-none focus-visible:!outline-none"
                name="daysLeft"
                readOnly
                value={getDaysLeft(dueDate)}
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Cost (Syrup)</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                defaultValue={customer.info.costSyrup}
                name="costSyrup"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Cost (Package)</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                defaultValue={customer.info.costPackage}
                name="costPackage"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Price</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                defaultValue={customer.info.price}
                name="price"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Salesperson</span>
              <SalespersonCombobox
                currentUserName={salespersonName}
                id="customer-edit-salesperson"
                onChange={setSalesperson}
                options={salespersonOptions}
                value={salesperson}
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Volume</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                defaultValue={customer.info.volume}
                name="volume"
              />
            </label>

            <div className="grid gap-2 text-sm font-black text-slate-700">
              <span>Tags</span>
              <div className="min-h-12 rounded-xl !border !border-slate-200 !bg-slate-50 px-3 py-2 transition focus-within:!border-teal-600 focus-within:!bg-white focus-within:ring-4 focus-within:ring-teal-100">
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    (() => {
                      const tagKey = `${tag.id || tag.name}-${tag.color || ''}`
                      const removing = removingTagKey === tagKey

                      return (
                        <span
                          className="inline-flex max-w-full items-center overflow-hidden rounded-full border border-teal-100 bg-teal-50 text-xs font-black text-teal-800 shadow-sm"
                          key={tagKey}
                          style={tag.color ? { background: tag.color, borderColor: tag.color, color: '#fff' } : undefined}
                        >
                          <span className="truncate px-3 py-1.5">{tag.name}</span>
                          <button
                            aria-label={`Remove ${tag.name}`}
                            className={`mr-1 grid h-5 w-5 place-items-center rounded-full !border-0 !bg-transparent text-sm font-black leading-none opacity-70 transition disabled:cursor-wait disabled:opacity-50 focus-visible:!outline-none focus-visible:ring-2 focus-visible:ring-teal-200 ${tag.color ? '!text-white' : '!text-teal-700'}`}
                            disabled={removing}
                            onClick={() => void removeTag(tag)}
                            type="button"
                          >
                            {removing ? '...' : 'x'}
                          </button>
                        </span>
                      )
                    })()
                  ))}
                  <input
                    className="min-h-8 min-w-[140px] flex-1 !border-0 !bg-transparent px-1 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:ring-0 focus-visible:!outline-none"
                    onBlur={addTagFromDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length ? 'Add tag' : 'เพิ่ม tag'}
                    value={tagDraft}
                  />
                </div>
              </div>
            </div>
          </div>

          <label className="mt-5 grid max-w-md gap-2 text-sm font-black text-slate-700">
            <span>Status</span>
            <select
              className="min-h-12 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
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
