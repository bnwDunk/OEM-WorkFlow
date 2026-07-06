import { FaTimes } from 'react-icons/fa'
import { customerStatusOptions as fallbackCustomerStatusOptions, flowStops, getCustomerStatusLabel, stages } from '../../data/oemWorkflow'
import type { Customer, CustomerStatusOption } from '../../data/oemWorkflow'
import { formatDate } from '../../lib/dateFormat'

type CustomerInfoModalProps = {
  canDelete?: boolean
  customer: Customer
  customerStatusOptions?: CustomerStatusOption[]
  deleting?: boolean
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
}

function getDaysLeft(dueDate: string) {
  if (!dueDate) return ''

  const due = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return String(Math.ceil((due.getTime() - today.getTime()) / 86_400_000))
}

function CustomerInfoModal({ canDelete = true, customer, customerStatusOptions = fallbackCustomerStatusOptions, deleting = false, onClose, onDelete, onEdit }: CustomerInfoModalProps) {
  const currentStop = flowStops[customer.currentPhase]
  const stage = stages[currentStop.stageIndex]
  const status = customer.status || 'brief_spec'
  const openIssues = customer.issues.filter((issue) => !issue.closed).length
  const latestNotification = customer.notifications[0]
  const daysLeft = getDaysLeft(customer.dueDate || '')

  const infoItems = [
    { label: 'Due Date', value: formatDate(customer.dueDate) },
    { label: 'Days Left', value: daysLeft || '-' },
    { label: 'Cost (Syrup)', value: customer.info.costSyrup },
    { label: 'Cost (Package)', value: customer.info.costPackage },
    { label: 'Price', value: customer.info.price },
    { label: 'Volume', value: customer.info.volume },
    { label: 'Salesperson', value: customer.salesperson || '-' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        aria-label={`${customer.name} information`}
        className="max-h-[calc(100svh-32px)] w-[min(760px,calc(100vw-32px))] overflow-auto rounded-2xl bg-white p-0 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h3 className="m-0 text-2xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere]">
              {customer.name}
            </h3>
            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-800">
              <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
              <span className="uppercase opacity-70">Status</span>
              <strong className="min-w-0 [overflow-wrap:anywhere]">{getCustomerStatusLabel(status, customerStatusOptions)}</strong>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="min-h-10 rounded-xl !border !border-slate-200 !bg-white px-4 text-sm font-black !text-slate-700 shadow-sm transition hover:!bg-slate-50 focus-visible:!outline-none"
              disabled={deleting}
              onClick={onEdit}
              type="button"
            >
              Edit
            </button>
            <button
              className="min-h-10 rounded-xl !border-0 !bg-rose-50 px-4 text-sm font-black !text-rose-700 transition hover:!bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:!outline-none"
              disabled={deleting || !canDelete}
              onClick={onDelete}
              type="button"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              aria-label="Close customer information"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !border !border-slate-200 !bg-white !p-0 !text-slate-500 transition hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-900 focus-visible:!outline-none"
              disabled={deleting}
              onClick={onClose}
              type="button"
            >
              <FaTimes aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="m-0 text-xs font-black uppercase text-slate-500">Current workflow</p>
            <p className="mt-2 mb-0 text-sm font-semibold text-slate-600">
              Stage {currentStop.stageIndex + 1}/5 ({stage.name}) - Phase {currentStop.label}
            </p>
            <p className="mt-1 mb-0 text-lg font-black text-slate-950">{currentStop.name}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {infoItems.map((item) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4" key={item.label}>
                <p className="m-0 text-xs font-black uppercase text-slate-500">{item.label}</p>
                <p className="mt-2 mb-0 text-base font-extrabold text-slate-950">
                  {item.value || '-'}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="m-0 text-xs font-black uppercase text-slate-500">Tags</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {customer.tags.length ? (
                  customer.tags.map((tag) => (
                    <span
                      className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-800"
                      key={`${tag.id || tag.name}-${tag.color || ''}`}
                      style={tag.color ? { background: tag.color, color: '#fff' } : undefined}
                    >
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-semibold text-slate-400">-</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="m-0 text-xs font-black uppercase text-slate-500">Open issues</p>
              <p className="mt-2 mb-0 text-3xl font-black text-slate-950">{openIssues}</p>
            </div>
          </div>

          {latestNotification && (
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
              <p className="m-0 text-xs font-black uppercase text-teal-700">Latest update</p>
              <p className="mt-2 mb-0 text-sm font-bold text-teal-950">{latestNotification.text}</p>
              <p className="mt-1 mb-0 text-xs font-semibold text-teal-700">{latestNotification.time}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default CustomerInfoModal
