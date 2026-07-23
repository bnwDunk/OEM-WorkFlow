import { useEffect, useMemo, useRef, useState } from 'react'
import { TbEye, TbFileTypePdf, TbPaperclip, TbPhoto, TbX } from 'react-icons/tb'
import { customerStatusOptions as fallbackCustomerStatusOptions, getCustomerStatusLabel } from '../../data/oemWorkflow'
import type { Customer, CustomerFile, CustomerStatus, CustomerStatusOption, CustomerTag, CustomerWorkflowTemplate } from '../../data/oemWorkflow'
import CustomerCard from './CustomerCard'
import Pagination from './Pagination'

const overviewRowsPerPage = 10

type OverviewViewProps = {
  customers: Customer[]
  customerStatusOptions?: CustomerStatusOption[]
  error: string
  loading: boolean
  getWorkflowTemplate?: (customer: Customer) => CustomerWorkflowTemplate
  onAddTag: (customerId: string) => void
  onEditTag: (customerId: string, tag: CustomerTag) => void
  onCreateCustomer?: () => void
  onOpenCompany: (customerId: string) => void
  onOpenCustomer: (customerId: string) => void
  onOpenInfo: (customerId: string) => void
  onLoadFile: (customer: Customer, file: CustomerFile) => Promise<Blob>
  onReload: () => void
}

function OverviewView({
  customers,
  customerStatusOptions = fallbackCustomerStatusOptions,
  error,
  getWorkflowTemplate,
  loading,
  onAddTag,
  onEditTag,
  onCreateCustomer,
  onOpenCompany,
  onOpenCustomer,
  onLoadFile,
  onOpenInfo,
}: OverviewViewProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [fileCustomer, setFileCustomer] = useState<Customer | null>(null)
  const [previewFile, setPreviewFile] = useState<CustomerFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const previewUrlRef = useRef('')

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  function closeFiles() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = ''
    setPreviewUrl('')
    setPreviewFile(null)
    setPreviewError('')
    setFileCustomer(null)
  }

  async function openPreview(file: CustomerFile) {
    if (!fileCustomer) return
    setPreviewFile(file)
    setPreviewLoading(true)
    setPreviewError('')
    try {
      const blob = await onLoadFile(fileCustomer, file)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreviewUrl(url)
    } catch (loadError) {
      setPreviewError(loadError instanceof Error ? loadError.message : 'ไม่สามารถเปิดไฟล์ได้')
    } finally {
      setPreviewLoading(false)
    }
  }

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
          customer.customerCode || '',
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
  const successCount = statusCounts.success || 0
  const activeCount = customers.length - successCount
  const shouldShowPagination = filteredCustomers.length > overviewRowsPerPage

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

      {shouldShowPagination && (
        <Pagination
          className="pagination-top"
          currentPage={currentPage}
          onPageChange={setPage}
          pageCount={pageCount}
          pageSize={overviewRowsPerPage}
          totalItems={filteredCustomers.length}
        />
      )}

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
            workflowTemplate={getWorkflowTemplate?.(customer)}
            onAddTag={onAddTag}
            onEditTag={onEditTag}
            onOpen={onOpenCustomer}
            onOpenCompany={onOpenCompany}
            onOpenFiles={setFileCustomer}
            onOpenInfo={onOpenInfo}
          />
        ))}
        {shouldShowPagination && (
          <Pagination
            className="pagination-bottom"
            currentPage={currentPage}
            onPageChange={setPage}
            pageCount={pageCount}
            pageSize={overviewRowsPerPage}
            totalItems={filteredCustomers.length}
          />
        )}
      </div>

      {fileCustomer && (
        <div
          aria-label={`Files for ${fileCustomer.name}`}
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFiles()
          }}
          role="dialog"
        >
          <div className="flex h-[min(86vh,820px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <TbPaperclip className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-black text-slate-900">Customer files</p>
                <p className="m-0 mt-0.5 truncate text-xs font-semibold text-slate-500">{fileCustomer.name} · {fileCustomer.files?.length || 0} files</p>
              </div>
              <button
                aria-label="Close files"
                className="grid h-10 w-10 place-items-center rounded-xl !border !border-slate-200 !bg-white !text-slate-600 transition hover:!bg-slate-100"
                onClick={closeFiles}
                type="button"
              >
                <TbX className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
              <div className="overflow-y-auto border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
                {(fileCustomer.files || []).length === 0 ? (
                  <div className="grid min-h-44 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-5 text-center">
                    <div>
                      <TbPaperclip className="mx-auto h-7 w-7 text-slate-300" />
                      <p className="m-0 mt-2 text-sm font-black text-slate-600">ยังไม่มีไฟล์</p>
                      <button
                        className="mt-3 rounded-lg !border-0 !bg-teal-700 px-3 py-2 text-xs font-black !text-white hover:!bg-teal-800"
                        onClick={() => {
                          const customerId = fileCustomer.id
                          closeFiles()
                          onOpenCompany(customerId)
                        }}
                        type="button"
                      >
                        ไปหน้าอัปโหลด
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {(fileCustomer.files || []).map((file) => {
                      const isPdf = file.mimeType === 'application/pdf'
                      return (
                        <button
                          className={`flex min-w-0 items-center gap-3 rounded-xl !border p-3 text-left transition ${previewFile?.id === file.id ? '!border-teal-300 !bg-teal-50' : '!border-slate-200 !bg-white hover:!border-teal-200'}`}
                          key={file.id}
                          onClick={() => void openPreview(file)}
                          type="button"
                        >
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isPdf ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'}`}>
                            {isPdf ? <TbFileTypePdf className="h-5 w-5" /> : <TbPhoto className="h-5 w-5" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-700">{file.name}</span>
                          <TbEye className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="relative min-h-[320px] overflow-auto bg-slate-900 p-3 sm:p-5">
                {!previewFile && (
                  <div className="grid h-full min-h-[300px] place-items-center text-center text-sm font-bold text-slate-400">เลือกไฟล์เพื่อดูตัวอย่าง</div>
                )}
                {previewLoading && (
                  <div className="absolute inset-0 z-10 grid place-items-center bg-slate-900 text-sm font-black text-slate-300">กำลังเปิดไฟล์...</div>
                )}
                {previewError && (
                  <div className="grid h-full min-h-[300px] place-items-center text-center text-sm font-bold text-rose-300">{previewError}</div>
                )}
                {!previewLoading && !previewError && previewUrl && previewFile?.mimeType === 'application/pdf' && (
                  <iframe className="h-full min-h-[60vh] w-full rounded-xl border-0 bg-white" src={previewUrl} title={previewFile.name} />
                )}
                {!previewLoading && !previewError && previewUrl && previewFile?.mimeType !== 'application/pdf' && (
                  <div className="grid min-h-full place-items-center">
                    <img alt={previewFile?.name || 'Customer file'} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" src={previewUrl} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default OverviewView
