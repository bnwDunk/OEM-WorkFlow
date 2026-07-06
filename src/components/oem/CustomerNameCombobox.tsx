import { useEffect, useMemo, useState } from 'react'
import type { Customer } from '../../data/oemWorkflow'

export type CustomerNameOption = Pick<Customer, 'id' | 'name'> & Partial<Pick<Customer, 'currentPhase' | 'status' | 'tags'>>

type CustomerNameComboboxProps = {
  allowDuplicateNames?: boolean
  autoFocus?: boolean
  customers?: CustomerNameOption[]
  excludeCustomerId?: string
  id: string
  inputClassName?: string
  label?: string
  onChange: (value: string) => void
  onDuplicateChange?: (customer: CustomerNameOption | undefined) => void
  placeholder?: string
  value: string
  variant?: 'boxed' | 'underline'
  warningClassName?: string
}

export function normalizeCustomerName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function CustomerNameCombobox({
  allowDuplicateNames = false,
  autoFocus = false,
  customers = [],
  excludeCustomerId,
  id,
  inputClassName = '',
  label,
  onChange,
  onDuplicateChange,
  placeholder = 'พิมพ์หรือเลือกชื่อลูกค้า',
  value,
  variant = 'boxed',
  warningClassName = 'm-0 text-sm font-bold text-rose-600',
}: CustomerNameComboboxProps) {
  const [open, setOpen] = useState(false)

  const customerHistory = useMemo(() => {
    const seen = new Set<string>()
    return customers
      .filter((item) => item.id !== excludeCustomerId && item.name.trim())
      .filter((item) => {
        const key = normalizeCustomerName(item.name)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [customers, excludeCustomerId])

  const normalizedName = normalizeCustomerName(value)
  const duplicateCustomer = !allowDuplicateNames && normalizedName
    ? customerHistory.find((item) => normalizeCustomerName(item.name) === normalizedName)
    : undefined
  const suggestedCustomers = customerHistory
    .filter((item) => !normalizedName || normalizeCustomerName(item.name).includes(normalizedName))
    .slice(0, 8)
  const warningId = `${id}-warning`

  useEffect(() => {
    onDuplicateChange?.(duplicateCustomer)
  }, [duplicateCustomer, onDuplicateChange])

  const frameClassName = variant === 'underline'
    ? `relative flex h-14 items-center border-b-2 bg-white transition ${
        duplicateCustomer ? 'border-rose-400' : 'border-teal-600'
      }`
    : `relative flex h-14 items-center overflow-hidden rounded-2xl border bg-white shadow-sm transition focus-within:shadow-[0_14px_30px_rgba(15,110,102,0.12)] ${
        duplicateCustomer
          ? 'border-rose-300 ring-4 ring-rose-50'
          : 'border-slate-200 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-50'
      }`
  const defaultInputClassName = variant === 'underline'
    ? 'h-full min-w-0 flex-1 !border-0 !bg-transparent px-0 text-2xl font-black leading-tight text-slate-950 outline-none [overflow-wrap:anywhere] placeholder:text-slate-400 focus:ring-0 focus-visible:!outline-none sm:text-3xl'
    : 'h-full min-w-0 flex-1 !border-0 !bg-transparent px-4 text-base font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 focus-visible:!outline-none'
  const toggleClassName = variant === 'underline'
    ? 'grid h-10 w-10 flex-none place-items-center !border-0 !bg-transparent !p-0 text-slate-500 transition hover:!bg-slate-100 hover:text-teal-700 focus-visible:!outline-none'
    : 'grid h-full w-12 flex-none place-items-center !border-0 !bg-transparent !p-0 text-slate-600 transition hover:!bg-teal-50 hover:text-teal-700 focus-visible:!outline-none'

  return (
    <div className="grid gap-2">
      {label && (
        <label className="font-bold text-slate-600" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        <div className={frameClassName}>
          <input
            aria-describedby={duplicateCustomer ? warningId : undefined}
            aria-expanded={open}
            aria-haspopup="listbox"
            autoComplete="off"
            autoFocus={autoFocus}
            className={`${defaultInputClassName} ${inputClassName}`}
            id={id}
            name="name"
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              onChange(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            required
            role="combobox"
            value={value}
          />
          <button
            aria-label="Open customer dropdown"
            className={toggleClassName}
            onMouseDown={(event) => {
              event.preventDefault()
              setOpen((current) => !current)
            }}
            type="button"
          >
            <span aria-hidden="true" className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-current" />
          </button>
        </div>

        {open && (
          <div className="absolute left-0 right-0 z-30 overflow-hidden rounded-b-2xl rounded-t-none border border-t-0 border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5">
            <div className="max-h-64 overflow-y-auto pr-1" role="listbox">
              {suggestedCustomers.length === 0 && (
                <div className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-400">No matching customer</div>
              )}
              {suggestedCustomers.map((item, index) => {
                const exactMatch = !allowDuplicateNames && normalizeCustomerName(item.name) === normalizedName
                return (
                  <button
                    className={`flex min-h-11 w-full items-center justify-between gap-3 !border-0 px-4 py-2 text-left text-sm font-black shadow-none transition ${
                      exactMatch
                        ? '!bg-rose-50 !text-rose-700 hover:!bg-rose-100'
                        : index === 0
                          ? '!bg-slate-100 !text-slate-800 hover:!bg-slate-100'
                          : '!bg-transparent !text-slate-600 hover:!bg-teal-50 hover:!text-teal-800'
                    }`}
                    key={item.id}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onChange(item.name)
                      setOpen(false)
                    }}
                    role="option"
                    style={{ borderRadius: 12 }}
                    type="button"
                  >
                    <span className="min-w-0 truncate">{item.name}</span>
                    {exactMatch && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-xs font-black text-rose-700">
                        มีอยู่แล้ว
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

          </div>
        )}
      </div>
      {duplicateCustomer && (
        <p className={warningClassName} id={warningId}>
          มีชื่อลูกค้านี้อยู่แล้ว: {duplicateCustomer.name}
        </p>
      )}
    </div>
  )
}

export default CustomerNameCombobox
