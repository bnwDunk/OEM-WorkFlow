import { useMemo, useState } from 'react'

export type SalespersonOption = {
  department?: string
  email?: string
  id: number | string
  name: string
  role?: string
  status?: string
}

type SalespersonComboboxProps = {
  currentUserName: string
  id: string
  name?: string
  onChange: (value: string) => void
  options?: SalespersonOption[]
  value: string
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function SalespersonCombobox({
  currentUserName,
  id,
  name = 'salesperson',
  onChange,
  options = [],
  value,
}: SalespersonComboboxProps) {
  const [open, setOpen] = useState(false)
  const normalizedValue = normalizeName(value)
  const normalizedCurrentUserName = normalizeName(currentUserName)

  const sortedOptions = useMemo(() => {
    const seen = new Set<string>()
    return options
      .filter((option) => option.name.trim())
      .filter((option) => {
        const key = normalizeName(option.name)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((first, second) => {
        const firstIsCurrent = normalizeName(first.name) === normalizedCurrentUserName
        const secondIsCurrent = normalizeName(second.name) === normalizedCurrentUserName
        if (firstIsCurrent && !secondIsCurrent) return -1
        if (!firstIsCurrent && secondIsCurrent) return 1
        return first.name.localeCompare(second.name)
      })
  }, [normalizedCurrentUserName, options])

  return (
    <div className="relative">
      <div className="relative flex h-12 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-teal-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-100">
        <input
          autoComplete="off"
          className="h-full min-w-0 flex-1 !border-0 !bg-transparent px-4 text-base font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:ring-0 focus-visible:!outline-none"
          id={id}
          name={name}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          role="combobox"
          value={value}
        />
        <button
          aria-label="Open salesperson dropdown"
          className="grid h-full w-12 flex-none place-items-center !border-0 !bg-transparent !p-0 text-slate-600 transition hover:!bg-teal-50 hover:text-teal-700 focus-visible:!outline-none"
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
        <div className="absolute left-0 right-0 top-full z-30 overflow-hidden rounded-b-2xl rounded-t-none border border-t-0 border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5">
          <div className="max-h-64 overflow-y-auto pr-1" role="listbox">
            {sortedOptions.length === 0 && (
              <div className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-400">ไม่พบรายชื่อผู้ใช้</div>
            )}
            {sortedOptions.map((option) => {
              const isCurrentLogin = normalizeName(option.name) === normalizedCurrentUserName
              const selected = normalizeName(option.name) === normalizedValue
              const meta = [option.department, option.role, option.email].filter(Boolean).join(' · ')

              return (
                <button
                  className={`flex min-h-12 w-full items-center justify-between gap-3 !border-0 px-4 py-2 text-left shadow-none transition ${
                    selected
                      ? '!bg-teal-50 !text-teal-800'
                      : '!bg-transparent !text-slate-700 hover:!bg-slate-100 hover:!text-slate-900'
                  }`}
                  key={`${option.id}-${option.name}`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onChange(option.name)
                    setOpen(false)
                  }}
                  role="option"
                  style={{ borderRadius: 12 }}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{option.name}</span>
                    {meta && <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">{meta}</span>}
                  </span>
                  {isCurrentLogin && (
                    <span className="shrink-0 rounded-full bg-teal-100 px-2 py-1 text-[11px] font-black text-teal-700">
                      Login
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SalespersonCombobox
