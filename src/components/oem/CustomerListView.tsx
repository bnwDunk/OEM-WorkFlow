import { useEffect, useMemo, useState } from 'react'
import { customerStatusOptions as fallbackCustomerStatusOptions, getCustomerStatusLabel } from '../../data/oemWorkflow'
import type { Customer, CustomerStatusOption } from '../../data/oemWorkflow'
import { formatDate } from '../../lib/dateFormat'
import Pagination from './Pagination'

const customerRowsPerPage = 10
const exportColumns = ['Customer Code', 'Customer', 'Product', 'Status', 'Due Date', 'Days Left', 'Cost (Syrup)', 'Cost (Package)', 'Price', 'Volume']
type ExportScope = 'selected' | 'page' | 'filtered' | 'all'

type CustomerListViewProps = {
  customers: Customer[]
  customerStatusOptions?: CustomerStatusOption[]
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

function escapeCsvCell(value: string) {
  return `"${String(value || '').replace(/"/g, '""')}"`
}

function escapeHtmlCell(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function getCustomerExportRow(customer: Customer, customerStatusOptions: CustomerStatusOption[]) {
  return [
    customer.customerCode || '',
    customer.name,
    customer.tags.map((tag) => tag.name).join(', ') || '-',
    getCustomerStatusLabel(customer.status, customerStatusOptions),
    formatDate(customer.dueDate),
    getDaysLeft(customer.dueDate),
    formatCurrency(customer.info.costSyrup),
    formatCurrency(customer.info.costPackage),
    formatCurrency(customer.info.price),
    formatNumber(customer.info.volume),
  ]
}

function CustomerListView({ customers, customerStatusOptions = fallbackCustomerStatusOptions, loading, onCreateCustomer, onOpenCustomer }: CustomerListViewProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv')
  const [exportScope, setExportScope] = useState<ExportScope>('selected')
  const normalizedQuery = query.trim().toLowerCase()

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        if (!normalizedQuery) return true

        const searchable = [
          customer.name,
          customer.customerCode || '',
          customer.salesperson || '',
          getCustomerStatusLabel(customer.status, customerStatusOptions),
          customer.dueDate || '',
          customer.info.costSyrup,
          customer.info.costPackage,
          customer.info.price,
          customer.info.volume,
          ...customer.tags.map((tag) => tag.name),
        ].join(' ').toLowerCase()

        return searchable.includes(normalizedQuery)
      }),
    [customerStatusOptions, customers, normalizedQuery],
  )
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / customerRowsPerPage))
  const currentPage = Math.min(page, pageCount)
  const paginatedCustomers = useMemo(
    () => {
      const startIndex = (currentPage - 1) * customerRowsPerPage

      return filteredCustomers.slice(startIndex, startIndex + customerRowsPerPage)
    },
    [currentPage, filteredCustomers],
  )
  const shouldShowPagination = filteredCustomers.length > customerRowsPerPage
  const selectedCustomerIdSet = useMemo(() => new Set(selectedCustomerIds), [selectedCustomerIds])
  const selectedCustomers = useMemo(
    () => customers.filter((customer) => selectedCustomerIdSet.has(customer.id)),
    [customers, selectedCustomerIdSet],
  )
  const visibleCustomerIds = useMemo(() => paginatedCustomers.map((customer) => customer.id), [paginatedCustomers])
  const allVisibleSelected = visibleCustomerIds.length > 0 && visibleCustomerIds.every((id) => selectedCustomerIdSet.has(id))
  const someVisibleSelected = visibleCustomerIds.some((id) => selectedCustomerIdSet.has(id))
  const exportCustomers = useMemo(() => {
    if (exportScope === 'page') return paginatedCustomers
    if (exportScope === 'filtered') return filteredCustomers
    if (exportScope === 'all') return customers
    return selectedCustomers
  }, [customers, exportScope, filteredCustomers, paginatedCustomers, selectedCustomers])

  useEffect(() => {
    setPage(1)
  }, [normalizedQuery])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  useEffect(() => {
    const validIds = new Set(customers.map((customer) => customer.id))
    setSelectedCustomerIds((current) => current.filter((id) => validIds.has(id)))
  }, [customers])

  function toggleCustomerSelection(customerId: string) {
    setExportScope('selected')
    setSelectedCustomerIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId],
    )
  }

  function toggleVisibleSelection() {
    setExportScope('selected')
    setSelectedCustomerIds((current) => {
      const currentSet = new Set(current)
      const shouldSelect = !visibleCustomerIds.every((id) => currentSet.has(id))

      visibleCustomerIds.forEach((id) => {
        if (shouldSelect) currentSet.add(id)
        else currentSet.delete(id)
      })

      return Array.from(currentSet)
    })
  }

  function exportSelectedCustomers() {
    if (exportCustomers.length === 0) return

    const rows = exportCustomers.map((customer) => getCustomerExportRow(customer, customerStatusOptions))
    const stamp = new Date().toISOString().slice(0, 10)

    if (exportFormat === 'csv') {
      const csv = [
        exportColumns.map(escapeCsvCell).join(','),
        ...rows.map((row) => row.map(escapeCsvCell).join(',')),
      ].join('\r\n')
      downloadBlob(`\uFEFF${csv}`, `customers-${stamp}.csv`, 'text/csv;charset=utf-8')
      return
    }

    const tableRows = [
      `<tr>${exportColumns.map((column) => `<th>${escapeHtmlCell(column)}</th>`).join('')}</tr>`,
      ...rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtmlCell(cell)}</td>`).join('')}</tr>`),
    ].join('')
    const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`
    downloadBlob(workbook, `customers-${stamp}.xls`, 'application/vnd.ms-excel;charset=utf-8')
  }

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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-800">{selectedCustomers.length} selected</span>
            <span className="text-xs font-bold text-slate-500">{exportCustomers.length} to export</span>
            <button
              className="min-h-9 rounded-lg !border !border-slate-200 !bg-white px-3 text-xs font-black !text-slate-700 shadow-sm transition hover:!border-teal-300 hover:!text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={selectedCustomerIds.length === 0}
              onClick={() => setSelectedCustomerIds([])}
              type="button"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-lg !border !border-slate-200 !bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
              onChange={(event) => setExportScope(event.target.value as ExportScope)}
              value={exportScope}
            >
              <option value="selected">Selected only</option>
              <option value="page">Current page</option>
              <option value="all">All customers</option>
            </select>
            <select
              className="h-10 rounded-lg !border !border-slate-200 !bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
              onChange={(event) => setExportFormat(event.target.value as 'csv' | 'excel')}
              value={exportFormat}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel (.xls)</option>
            </select>
            <button
              className="min-h-10 rounded-lg !border-0 !bg-teal-700 px-4 text-sm font-black !text-white shadow-sm transition hover:!bg-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400 disabled:shadow-none"
              disabled={exportCustomers.length === 0}
              onClick={exportSelectedCustomers}
              type="button"
            >
              Download
            </button>
          </div>
        </div>

        {shouldShowPagination && (
          <Pagination
            className="pagination-top"
            currentPage={currentPage}
            onPageChange={setPage}
            pageCount={pageCount}
            pageSize={customerRowsPerPage}
            totalItems={filteredCustomers.length}
          />
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="w-12 border-b border-slate-200 px-4 py-3 text-left">
                    <input
                      aria-label="Select visible customers"
                      checked={allVisibleSelected}
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      onChange={toggleVisibleSelection}
                      ref={(input) => {
                        if (input) input.indeterminate = !allVisibleSelected && someVisibleSelected
                      }}
                      type="checkbox"
                    />
                  </th>
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
                    <td className="px-4 py-10 text-center text-sm font-bold text-slate-400" colSpan={10}>
                      Loading customers...
                    </td>
                  </tr>
                )}
                {!loading && filteredCustomers.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm font-bold text-slate-400" colSpan={10}>
                      No customers found.
                    </td>
                  </tr>
                )}
                {paginatedCustomers.map((customer) => {
                  const productText = customer.tags.map((tag) => tag.name).join(', ') || '-'

                  return (
                    <tr
                      className="group cursor-pointer transition hover:bg-teal-50/40"
                      key={customer.id}
                      onClick={() => onOpenCustomer(customer.id)}
                    >
                      <td className="border-b border-slate-100 px-4 py-3">
                        <input
                          aria-label={`Select ${customer.name}`}
                          checked={selectedCustomerIdSet.has(customer.id)}
                          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                          onChange={() => toggleCustomerSelection(customer.id)}
                          onClick={(event) => event.stopPropagation()}
                          type="checkbox"
                        />
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="grid gap-1">
                          <strong className="text-sm font-black text-slate-800 group-hover:text-teal-800">{customer.name}</strong>
                          <span className="font-mono text-xs font-semibold text-slate-400">{customer.customerCode || '-'}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{productText}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{getCustomerStatusLabel(customer.status, customerStatusOptions)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">{formatDate(customer.dueDate)}</td>
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
          {shouldShowPagination && (
            <Pagination
              className="pagination-table-bottom"
              currentPage={currentPage}
              onPageChange={setPage}
              pageCount={pageCount}
              pageSize={customerRowsPerPage}
              totalItems={filteredCustomers.length}
            />
          )}
        </div>
      </div>
    </section>
  )
}

export default CustomerListView
