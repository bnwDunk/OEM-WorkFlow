import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { TbCalendarDue } from 'react-icons/tb'
import type { ManagedFlow } from '../../data/adminDashboard'
import { customerStatusOptions as fallbackCustomerStatusOptions } from '../../data/oemWorkflow'
import type { Customer, CustomerStatus, CustomerStatusOption, CustomerTag } from '../../data/oemWorkflow'
import CustomerNameCombobox from './CustomerNameCombobox'
import type { CustomerNameOption } from './CustomerNameCombobox'
import SalespersonCombobox from './SalespersonCombobox'
import type { SalespersonOption } from './SalespersonCombobox'

export type CustomerCreatePayload = {
  dueDate: string
  flowId: number
  info: Customer['info']
  name: string
  salesperson: string
  status: CustomerStatus
  tagsText: string
}

type CustomerCreateViewProps = {
  customerStatusOptions?: CustomerStatusOption[]
  customers?: CustomerNameOption[]
  flows: ManagedFlow[]
  loading?: boolean
  salespersonName: string
  salespersonOptions?: SalespersonOption[]
  onBack: () => void
  onCreate: (payload: CustomerCreatePayload) => void
}

function parseInputDate(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''

  const match = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return ''

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

function formatDateForInput(value: string) {
  if (!value) return ''

  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

function getDaysLeft(dueDate: string) {
  if (!dueDate) return ''

  const due = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return String(Math.ceil((due.getTime() - today.getTime()) / 86_400_000))
}

function CustomerCreateView({
  customerStatusOptions = fallbackCustomerStatusOptions,
  customers = [],
  flows,
  loading = false,
  salespersonName,
  salespersonOptions = [],
  onBack,
  onCreate,
}: CustomerCreateViewProps) {
  const [dueDate, setDueDate] = useState('')
  const [name, setName] = useState('')
  const [salesperson, setSalesperson] = useState(salespersonName)
  const [tags, setTags] = useState<CustomerTag[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const datePickerRef = useRef<HTMLInputElement>(null)

  const typedName = name.trim()
  const parsedDueDate = parseInputDate(dueDate)
  const dueDateIsValid = !dueDate.trim() || Boolean(parsedDueDate)
  const canSubmit = Boolean(typedName) && dueDateIsValid && flows.length > 0 && !loading
  const activeStatusOptions = customerStatusOptions.filter((option) => option.status !== 'inactive')

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

  function removeTag(tagName: string) {
    setTags((currentTags) => currentTags.filter((tag) => tag.name !== tagName))
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    addTagFromDraft()
  }

  function openDatePicker() {
    const picker = datePickerRef.current
    if (!picker) return

    if (typeof picker.showPicker === 'function') {
      picker.showPicker()
      return
    }

    picker.click()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    const data = new FormData(event.currentTarget)

    onCreate({
      dueDate: parseInputDate(String(data.get('dueDate') || '')),
      flowId: Number(data.get('flowId') || 0),
      info: {
        costSyrup: String(data.get('costSyrup') || ''),
        costPackage: String(data.get('costPackage') || ''),
        price: String(data.get('price') || ''),
        volume: String(data.get('volume') || ''),
      },
      name: typedName,
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
            <div className="grid max-w-4xl gap-4">
              <CustomerNameCombobox
                allowDuplicateNames
                autoFocus
                customers={customers}
                id="customer-create-name"
                label="Customer"
                onChange={setName}
                value={name}
                warningClassName="mt-2 text-sm font-bold text-rose-600"
              />
              <label className="grid gap-2 text-sm font-black text-slate-700">
                <span>Flow</span>
                <select
                  className="min-h-12 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
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
                  No active flow is available. Create or activate a flow first.
                </p>
              )}
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
          <div className="mb-6">
            <h2 className="m-0 text-xl font-black text-slate-950">Customer details</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Add pricing, status, owner, and customer tags.</p>
          </div>

          <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Due Date</span>
              <div className="relative">
                <input
                  className="h-12 w-full min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 pr-14 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                  inputMode="numeric"
                  name="dueDate"
                  onChange={(event) => setDueDate(event.target.value)}
                  pattern="\d{1,2}/\d{1,2}/\d{4}"
                  placeholder="dd/mm/yyyy"
                  type="text"
                  value={dueDate}
                />
                <input
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 my-auto h-8 w-8 opacity-0"
                  onChange={(event) => setDueDate(formatDateForInput(event.target.value))}
                  ref={datePickerRef}
                  tabIndex={-1}
                  type="date"
                  value={parsedDueDate}
                />
                <button
                  aria-label="Select date"
                  className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-lg !border-0 !bg-transparent text-slate-700 hover:!bg-slate-100 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                  onClick={openDatePicker}
                  type="button"
                >
                  <TbCalendarDue aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              {!dueDateIsValid && <small className="text-xs font-bold text-rose-600">Please use dd/mm/yyyy.</small>}
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Days Left</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-100 px-4 text-base font-bold text-slate-500 outline-none focus-visible:!outline-none"
                readOnly
                value={getDaysLeft(parsedDueDate)}
              />
            </label>

            {[
              ['Cost (Syrup)', 'costSyrup'],
              ['Cost (Package)', 'costPackage'],
              ['Price', 'price'],
              ['Volume', 'volume'],
            ].map(([label, field]) => (
              <label className="grid gap-2 text-sm font-black text-slate-700" key={field}>
                <span>{label}</span>
                <input
                  className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                  name={field}
                />
              </label>
            ))}

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Salesperson</span>
              <SalespersonCombobox
                currentUserName={salespersonName}
                id="customer-create-salesperson"
                onChange={setSalesperson}
                options={salespersonOptions}
                value={salesperson}
              />
            </label>

            <div className="grid gap-2 text-sm font-black text-slate-700">
              <span>Tags</span>
              <div className="min-h-12 rounded-xl !border !border-slate-200 !bg-slate-50 px-3 py-2 transition focus-within:!border-teal-600 focus-within:!bg-white focus-within:ring-4 focus-within:ring-teal-100">
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span className="inline-flex max-w-full items-center overflow-hidden rounded-full border border-teal-100 bg-teal-50 text-xs font-black text-teal-800 shadow-sm" key={tag.name}>
                      <span className="truncate px-3 py-1.5">{tag.name}</span>
                      <button
                        aria-label={`Remove ${tag.name}`}
                        className="mr-1 grid h-5 w-5 place-items-center rounded-full !border-0 !bg-transparent text-sm font-black leading-none !text-teal-700 opacity-70 transition hover:!bg-teal-100 hover:opacity-100 focus-visible:!outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                        onClick={() => removeTag(tag.name)}
                        type="button"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <input
                    className="min-h-8 min-w-[140px] flex-1 !border-0 !bg-transparent px-1 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:ring-0 focus-visible:!outline-none"
                    onBlur={addTagFromDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length ? 'Add tag' : 'Add tag'}
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
              defaultValue="brief_spec"
              name="status"
            >
              {activeStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </section>
  )
}

export default CustomerCreateView
