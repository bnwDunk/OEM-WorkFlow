import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { TbCalendarDue } from 'react-icons/tb'
import { customerStatusOptions as fallbackCustomerStatusOptions } from '../../data/oemWorkflow'
import type { Customer, CustomerStatus, CustomerStatusOption, CustomerTag } from '../../data/oemWorkflow'
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
  availableTags?: CustomerTag[]
  canDelete?: boolean
  customer: Customer
  customerStatusOptions?: CustomerStatusOption[]
  customers?: CustomerNameOption[]
  deleting?: boolean
  loading?: boolean
  salespersonName: string
  salespersonOptions?: SalespersonOption[]
  onBack: () => void
  onDelete?: () => void
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

function formatDateForInput(value: string) {
  if (!value) return ''

  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
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

function CustomerEditView({
  availableTags = [],
  canDelete = true,
  customer,
  customerStatusOptions = fallbackCustomerStatusOptions,
  customers = [],
  deleting = false,
  loading = false,
  salespersonName,
  salespersonOptions = [],
  onBack,
  onDelete,
  onRemoveTag,
  onSave,
}: CustomerEditViewProps) {
  const [dueDate, setDueDate] = useState(formatDateForInput(customer.dueDate || ''))
  const [name, setName] = useState(customer.name)
  const [salesperson, setSalesperson] = useState(customer.salesperson || salespersonName)
  const [tags, setTags] = useState<CustomerTag[]>(customer.tags)
  const [tagDraft, setTagDraft] = useState('')
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false)
  const [removingTagKey, setRemovingTagKey] = useState('')
  const datePickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(customer.name)
    setSalesperson(customer.salesperson || salespersonName)
    setDueDate(formatDateForInput(customer.dueDate || ''))
    setTags(customer.tags)
    setTagDraft('')
    setRemovingTagKey('')
  }, [customer.dueDate, customer.id, customer.name, customer.salesperson, customer.tags, salespersonName])

  const typedName = name.trim()
  const parsedDueDate = parseInputDate(dueDate)
  const dueDateIsValid = !dueDate.trim() || Boolean(parsedDueDate)
  const busy = loading || deleting
  const canSubmit = Boolean(typedName) && dueDateIsValid && !busy
  const normalizedTagDraft = tagDraft.trim().toLowerCase()
  const suggestedTags = useMemo(() => {
    const selectedNames = new Set(tags.map((tag) => tag.name.trim().toLowerCase()).filter(Boolean))
    const seen = new Set<string>()

    return availableTags
      .filter((tag) => tag.name.trim())
      .filter((tag) => {
        const key = tag.name.trim().toLowerCase()
        if (selectedNames.has(key) || seen.has(key)) return false
        seen.add(key)
        return !normalizedTagDraft || key.includes(normalizedTagDraft)
      })
      .slice(0, 8)
  }, [availableTags, normalizedTagDraft, tags])

  function addTag(nextTag: CustomerTag) {
    const nextTagName = nextTag.name.trim().replace(/^,+|,+$/g, '').trim()
    if (!nextTagName) return

    setTags((currentTags) => {
      const alreadyExists = currentTags.some((tag) => tag.name.trim().toLowerCase() === nextTagName.toLowerCase())
      if (alreadyExists) return currentTags
      return [...currentTags, { ...nextTag, name: nextTagName }]
    })
    setTagDraft('')
    setTagSuggestionsOpen(false)
  }

  function addTagFromDraft() {
    const nextTagName = tagDraft.trim().replace(/^,+|,+$/g, '').trim()
    const existingTag = availableTags.find((tag) => tag.name.trim().toLowerCase() === nextTagName.toLowerCase())

    addTag(existingTag || { name: nextTagName })
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
    if (event.key === 'Enter' && suggestedTags[0] && tagSuggestionsOpen) {
      event.preventDefault()
      addTag(suggestedTags[0])
      return
    }

    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    addTagFromDraft()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    const data = new FormData(event.currentTarget)

    onSave({
      dueDate: parseInputDate(String(data.get('dueDate') || '')),
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

  function openDatePicker() {
    const picker = datePickerRef.current
    if (!picker) return

    if (typeof picker.showPicker === 'function') {
      picker.showPicker()
      return
    }

    picker.click()
  }

  return (
    <section className="min-h-[calc(100svh-52px)] bg-white px-5 py-6 sm:px-8">
      <form className="mx-auto grid max-w-7xl gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-teal-700">Customer profile</p>
            <div className="relative max-w-4xl">
              <CustomerNameCombobox
                allowDuplicateNames
                customers={customers}
                excludeCustomerId={customer.id}
                id="customer-edit-name"
                label="Customer"
                onChange={setName}
                value={name}
              />
            </div>
          </div>
          <div className="flex gap-2 lg:pt-6">
            <button
              className="min-h-11 rounded-xl !border !border-slate-200 !bg-white px-5 text-sm font-black !text-slate-700 shadow-sm transition hover:!bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
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
              <div className="relative">
                <input
                  className="h-12 w-full min-w-0 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 pr-14 text-base font-bold text-slate-950 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                  inputMode="numeric"
                  name="dueDate"
                  onChange={(event) => setDueDate(event.target.value)}
                  pattern="\d{1,2}/\d{1,2}/\d{4}"
                  placeholder="dd/mm/yyyy"
                  title="กรุณากรอกวันที่เป็น วัน/เดือน/ปี เช่น 31/12/2026"
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
                  aria-label="เลือกวันที่"
                  className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-lg !border-0 !bg-transparent text-slate-700 hover:!bg-slate-100 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                  onClick={openDatePicker}
                  title="เลือกวันที่"
                  type="button"
                >
                  <TbCalendarDue aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              {!dueDateIsValid && <small className="text-xs font-bold text-rose-600">กรุณากรอกเป็น dd/mm/yyyy</small>}
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Days Left</span>
              <input
                className="h-12 min-w-0 rounded-xl !border !border-slate-200 !bg-slate-100 px-4 text-base font-bold text-slate-500 outline-none focus-visible:!outline-none"
                name="daysLeft"
                readOnly
                value={getDaysLeft(parsedDueDate)}
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
              <div className="relative">
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
                    aria-expanded={tagSuggestionsOpen}
                    aria-haspopup="listbox"
                    className="min-h-8 min-w-[140px] flex-1 !border-0 !bg-transparent px-1 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:ring-0 focus-visible:!outline-none"
                    onBlur={() => {
                      window.setTimeout(() => {
                        addTagFromDraft()
                        setTagSuggestionsOpen(false)
                      }, 120)
                    }}
                    onChange={(event) => {
                      setTagDraft(event.target.value)
                      setTagSuggestionsOpen(true)
                    }}
                    onFocus={() => setTagSuggestionsOpen(true)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length ? 'Add tag' : 'เพิ่ม tag'}
                    role="combobox"
                    value={tagDraft}
                  />
                  </div>
                </div>
                {tagSuggestionsOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5">
                    <div className="max-h-64 overflow-y-auto pr-1" role="listbox">
                      {suggestedTags.length === 0 && (
                        <div className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-400">No matching tag</div>
                      )}
                      {suggestedTags.map((tag, index) => (
                        <button
                          className={`flex min-h-11 w-full items-center gap-3 !border-0 px-4 py-2 text-left text-sm font-black shadow-none transition ${
                            index === 0
                              ? '!bg-slate-100 !text-slate-800 hover:!bg-slate-100'
                              : '!bg-transparent !text-slate-600 hover:!bg-teal-50 hover:!text-teal-800'
                          }`}
                          key={`${tag.id || tag.name}-${tag.color || ''}`}
                          onMouseDown={(event) => {
                            event.preventDefault()
                            addTag(tag)
                          }}
                          role="option"
                          style={{ borderRadius: 12 }}
                          type="button"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full bg-teal-600"
                            style={tag.color ? { background: tag.color } : undefined}
                          />
                          <span className="min-w-0 truncate">{tag.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
        {onDelete && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h2 className="m-0 text-base font-black text-rose-900">Delete customer</h2>
              <p className="m-0 mt-1 text-sm font-semibold text-rose-700">
                การดำเนินการนี้จะลบข้อมูลของลูกค้า
              </p>
            </div>
            <button
              className="mt-4 min-h-11 rounded-xl !border-0 !bg-rose-600 px-5 text-sm font-black !text-white shadow-sm transition hover:!bg-rose-700 disabled:cursor-not-allowed disabled:!bg-rose-200 disabled:!text-rose-500 sm:mt-0"
              disabled={busy || !canDelete}
              onClick={onDelete}
              type="button"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}

export default CustomerEditView
