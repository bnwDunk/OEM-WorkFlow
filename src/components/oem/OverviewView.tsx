import { useEffect, useMemo, useState } from 'react'
import { customerStatusOptions as fallbackCustomerStatusOptions, getCustomerStatusLabel } from '../../data/oemWorkflow'
import type { Customer, CustomerStatus, CustomerStatusOption, CustomerTag } from '../../data/oemWorkflow'
import CustomerCard from './CustomerCard'

const overviewRowsPerPage = 10

type OverviewViewProps = {
  customers: Customer[]
  customerStatusOptions?: CustomerStatusOption[]
  error: string
  loading: boolean
  onAddTag: (customerId: string) => void
  onEditTag: (customerId: string, tag: CustomerTag) => void
  onCreateCustomer?: () => void
  onOpenCompany: (customerId: string) => void
  onOpenCustomer: (customerId: string) => void
  onOpenInfo: (customerId: string) => void
  onReload: () => void
}

function OverviewView({
  customers,
  customerStatusOptions = fallbackCustomerStatusOptions,
  error,
  loading,
  onAddTag,
  onEditTag,
  onCreateCustomer,
  onOpenCompany,
  onOpenCustomer,
  onOpenInfo,
}: OverviewViewProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const normalizedQuery = query.trim().toLowerCase()
  const statusCounts = useMemo(
    () =>
      customers.reduce<Record<string, number>>((counts, customer) => {
        const status = customer.status || 'brief_spec'
        counts[status] = (counts[status] || 0) + 1
        return counts
      }, {}),
    [customers],
  )
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
        const searchable = [
          customer.name,
          getCustomerStatusLabel(customer.status, customerStatusOptions),
          ...customer.tags.map((tag) => tag.name),
        ].join(' ').toLowerCase()

        return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery))
      }),
    [customerStatusOptions, customers, normalizedQuery, statusFilter],
  )
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / overviewRowsPerPage))
  const currentPage = Math.min(page, pageCount)
  const paginatedCustomers = useMemo(
    () => {
      const startIndex = (currentPage - 1) * overviewRowsPerPage

      return filteredCustomers.slice(startIndex, startIndex + overviewRowsPerPage)
    },
    [currentPage, filteredCustomers],
  )
  const rangeStart = filteredCustomers.length === 0 ? 0 : (currentPage - 1) * overviewRowsPerPage + 1
  const rangeEnd = Math.min(currentPage * overviewRowsPerPage, filteredCustomers.length)
  const successCount = statusCounts.success || 0
  const activeCount = customers.length - successCount

  useEffect(() => {
    setPage(1)
  }, [normalizedQuery, statusFilter])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  return (
    <section className="page-pad">
      <div className="page-heading">
        <div>
          <h1>ภาพรวมงาน</h1>
          <p>ดูสถานะลูกค้าทุกเจ้า, Phase ปัจจุบัน, การแจ้งเตือน และ Ticket ข้ามฝ่าย</p>
        </div>
        <div className="overview-actions">
          {onCreateCustomer && (
            <button className="primary-action-btn" onClick={onCreateCustomer} type="button">
              New
            </button>
          )}
        </div>
      </div>

      <div className="overview-dashboard">
        <div className="overview-metrics" aria-label="ภาพรวมลูกค้า">
          <div className="overview-metric">
            <span>ทั้งหมด</span>
            <strong>{customers.length}</strong>
          </div>
          <div className="overview-metric">
            <span>กำลังดำเนินงาน</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="overview-metric">
            <span>สำเร็จ</span>
            <strong>{successCount}</strong>
          </div>
        </div>

        <div className="overview-toolbar">
          <label className="overview-search">
            <span>Search</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อลูกค้า, tag, status"
              value={query}
            />
          </label>
          <div className="overview-status-filter" aria-label="Filter by status">
            <button
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
              type="button"
            >
              ทั้งหมด <span>{customers.length}</span>
            </button>
            {customerStatusOptions.map((option) => (
              <button
                className={statusFilter === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                type="button"
              >
                {option.label} <span>{statusCounts[option.value] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="customer-list">
        {error && <p className="overview-state error">{error}</p>}
        {!error && loading && customers.length === 0 && <p className="overview-state">กำลังโหลดข้อมูลงาน...</p>}
        {!error && !loading && customers.length === 0 && <p className="overview-state">ยังไม่มีข้อมูลลูกค้าในฐานข้อมูล</p>}
        {!error && !loading && customers.length > 0 && filteredCustomers.length === 0 && (
          <p className="overview-state">ไม่พบลูกค้าที่ตรงกับตัวกรอง</p>
        )}
        {paginatedCustomers.map((customer) => (
          <CustomerCard
            customer={customer}
            customerStatusOptions={customerStatusOptions}
            key={customer.id}
            onAddTag={onAddTag}
            onEditTag={onEditTag}
            onOpen={onOpenCustomer}
            onOpenCompany={onOpenCompany}
            onOpenInfo={onOpenInfo}
          />
        ))}
        {filteredCustomers.length > overviewRowsPerPage && (
          <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0 text-sm font-bold text-slate-500">
              Showing {rangeStart}-{rangeEnd} of {filteredCustomers.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="min-h-10 rounded-xl !border !border-slate-200 !bg-white px-4 text-sm font-black !text-slate-700 shadow-sm transition hover:!border-teal-200 hover:!bg-teal-50 hover:!text-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-100 disabled:!text-slate-400 disabled:shadow-none"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <span className="inline-flex min-h-10 items-center rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-600">
                Page {currentPage} / {pageCount}
              </span>
              <button
                className="min-h-10 rounded-xl !border-0 !bg-teal-700 px-4 text-sm font-black !text-white shadow-sm transition hover:!bg-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400 disabled:shadow-none"
                disabled={currentPage === pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default OverviewView
