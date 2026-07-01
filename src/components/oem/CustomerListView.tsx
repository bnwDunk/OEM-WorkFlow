import { useMemo, useState } from 'react'
import { flowStops, getCustomerStatusLabel } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'

type CustomerListViewProps = {
  customers: Customer[]
  loading: boolean
  onCreateCustomer?: () => void
  onOpenCustomer: (customerId: string) => void
}

function getDaysLeft(dueDate: string | undefined) {
  if (!dueDate) return '-'

  const due = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return '-'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return String(Math.ceil((due.getTime() - today.getTime()) / 86_400_000))
}

function formatThaiDate(value: string | undefined) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear() + 543
  return `${day}/${month}/${year}`
}

function formatCurrency(value: string | undefined) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return '-'

  const numericValue = Number(trimmed.replace(/,/g, ''))
  if (Number.isNaN(numericValue)) return trimmed

  return `฿${numericValue.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`
}

function formatNumber(value: string | undefined) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return '-'

  const numericValue = Number(trimmed.replace(/,/g, ''))
  if (Number.isNaN(numericValue)) return trimmed

  return numericValue.toLocaleString('en-US')
}

function CustomerListView({ customers, loading, onCreateCustomer, onOpenCustomer }: CustomerListViewProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        if (!normalizedQuery) return true

        const currentStop = flowStops[customer.currentPhase]
        const searchable = [
          customer.name,
          customer.salesperson || '',
          getCustomerStatusLabel(customer.status),
          currentStop?.name || '',
          customer.dueDate || '',
          customer.info.costSyrup,
          customer.info.costPackage,
          customer.info.price,
          customer.info.volume,
          ...customer.tags.map((tag) => tag.name),
        ].join(' ').toLowerCase()

        return searchable.includes(normalizedQuery)
      }),
    [customers, normalizedQuery],
  )

  return (
    <section className="min-h-[calc(100svh-52px)] bg-white px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {onCreateCustomer && (
              <button
                className="min-h-10 rounded-lg !border-0 !bg-[#7b4b6d] px-4 text-sm font-black !text-white shadow-sm transition hover:!bg-[#6b3f5f]"
                onClick={onCreateCustomer}
                type="button"
              >
                New
              </button>
            )}
            <div>
              <h1 className="m-0 text-xl font-black text-slate-950">Customer</h1>
              <p className="m-0 text-xs font-semibold text-slate-500">{filteredCustomers.length} / {customers.length}</p>
            </div>
          </div>

          <label className="relative w-full sm:w-[380px]">
            <span className="sr-only">Search customers</span>
            <input
              className="h-10 w-full rounded-lg !border !border-teal-200 !bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              value={query}
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50">
                  {['ชื่อลูกค้า', 'Product', 'status', 'Due Date', 'Days Left', 'cost (Syrup)', 'Cost (Package)', 'Price', 'Volume'].map((column) => (
                    <th className="border-b border-slate-200 px-4 py-3 text-xs font-black text-slate-700" key={column}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && customers.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-bold text-slate-400" colSpan={9}>
                      Loading customers...
                    </td>
                  </tr>
                )}
                {!loading && filteredCustomers.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-bold text-slate-400" colSpan={9}>
                      No customers found.
                    </td>
                  </tr>
                )}
                {filteredCustomers.map((customer) => {
                  const currentStop = flowStops[customer.currentPhase]
                  const productText = customer.tags.map((tag) => tag.name).join(', ') || '-'

                  return (
                    <tr
                      className="group cursor-pointer transition hover:bg-teal-50/40"
                      key={customer.id}
                      onClick={() => onOpenCustomer(customer.id)}
                    >
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="grid gap-1">
                          <strong className="text-sm font-black text-slate-800 group-hover:text-teal-800">{customer.name}</strong>
                          <span className="text-xs font-semibold text-slate-400">{currentStop ? `Phase ${currentStop.label}` : '-'}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{productText}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{getCustomerStatusLabel(customer.status)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">{formatThaiDate(customer.dueDate)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-slate-700">{getDaysLeft(customer.dueDate)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-slate-700">{formatCurrency(customer.info.costSyrup)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-slate-700">{formatCurrency(customer.info.costPackage)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-slate-700">{formatCurrency(customer.info.price)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-slate-700">{formatNumber(customer.info.volume)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CustomerListView
