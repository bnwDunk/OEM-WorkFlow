import { FaEdit } from 'react-icons/fa'
import { IoWarning } from 'react-icons/io5'
import type { KeyboardEvent, MouseEvent } from 'react'
import { customerStatusOptions as fallbackCustomerStatusOptions, defaultWorkflowTemplate, getCustomerStatusLabel } from '../../data/oemWorkflow'
import type { Customer, CustomerStatusOption, CustomerTag, CustomerWorkflowTemplate } from '../../data/oemWorkflow'
import StageRail from './StageRail'

type CustomerCardProps = {
  customer: Customer
  customerStatusOptions?: CustomerStatusOption[]
  workflowTemplate?: CustomerWorkflowTemplate
  onAddTag: (customerId: string) => void
  onEditTag: (customerId: string, tag: CustomerTag) => void
  onOpen: (customerId: string) => void
  onOpenCompany: (customerId: string) => void
  onOpenInfo: (customerId: string) => void
}

const customerStatusStyles: Record<string, string> = {
  brief_spec: 'border-indigo-200 bg-indigo-50 text-indigo-800 shadow-indigo-100/70',
  sampling: 'border-sky-200 bg-sky-50 text-sky-800 shadow-sky-100/70',
  sample_revision: 'border-orange-200 bg-orange-50 text-orange-800 shadow-orange-100/70',
  follow_up_formula: 'border-yellow-200 bg-yellow-50 text-yellow-800 shadow-yellow-100/70',
  quote_negotiation: 'border-purple-200 bg-purple-50 text-purple-800 shadow-purple-100/70',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100/70',
  cancel: 'border-rose-200 bg-rose-50 text-rose-800 shadow-rose-100/70',
}

const defaultCustomerStatusStyle = 'border-slate-200 bg-slate-50 text-slate-800 shadow-slate-100/70'

function CustomerCard({ customer, customerStatusOptions = fallbackCustomerStatusOptions, workflowTemplate = defaultWorkflowTemplate, onAddTag, onEditTag, onOpen, onOpenCompany, onOpenInfo }: CustomerCardProps) {
  const currentStop = workflowTemplate.stops[customer.currentPhase] || workflowTemplate.stops[0] || defaultWorkflowTemplate.stops[0]
  const currentStage = workflowTemplate.stages[currentStop.stageIndex]
  const openIssues = customer.issues.filter((issue) => !issue.closed).length
  const status = customer.status || 'brief_spec'

  const openCustomerDetail = () => onOpen(customer.id)

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && Boolean(target.closest('button, a, input, select, textarea'))

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) return
    openCustomerDetail()
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    openCustomerDetail()
  }

  const openCustomerInfo = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onOpenInfo(customer.id)
  }

  const openCustomerEditor = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onOpenCompany(customer.id)
  }

  return (
    <article
      aria-label={`Open ${customer.name} detail`}
      className="customer-card hover:!-translate-y-0.5 hover:!border-[#9bc7c2] hover:!bg-[#fbfefd] hover:!shadow-[0_14px_26px_rgba(15,110,102,0.14)] focus-visible:!border-[#9bc7c2] focus-visible:!shadow-[0_14px_26px_rgba(15,110,102,0.14)]"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="customer-head">
        <div className="min-w-0">
          <button
            aria-label={`View ${customer.name} information`}
            className="customer-name"
            onClick={openCustomerInfo}
            title="View customer information"
            type="button"
          >
            {customer.name}
          </button>
          {customer.customerCode && (
            <div className="mt-1 font-mono text-xs font-bold text-slate-400">{customer.customerCode}</div>
          )}
          <div className="mt-3 flex max-w-full items-start">
            <div
              className={`inline-flex min-h-9 max-w-full items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-black leading-tight shadow-sm ring-1 ring-white/70 ${customerStatusStyles[status] || defaultCustomerStatusStyle}`}
            >
              <span className="relative flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-white/80">
                <span className="h-2 w-2 rounded-full bg-current" />
              </span>
              <span className="rounded-full bg-white/55 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-normal opacity-75">
                Status
              </span>
              <strong className="min-w-0 text-[12px] [overflow-wrap:anywhere]">{getCustomerStatusLabel(status, customerStatusOptions)}</strong>
            </div>
          </div>
          <div className="tag-row">
            {customer.tags.map((tag) => (
              <button
                className="tag-chip"
                key={`${tag.id || tag.name}-${tag.color || ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onEditTag(customer.id, tag)
                }}
                style={tag.color ? { background: tag.color, color: '#fff' } : undefined}
                title="Edit tag"
                type="button"
              >
                {tag.name}
              </button>
            ))}
            <button
              className="tag-add-btn"
              onClick={(event) => {
                event.stopPropagation()
                onAddTag(customer.id)
              }}
              type="button"
            >
              + Tag
            </button>
          </div>
        </div>
        <div className="badges customer-card-actions">
          <button
            aria-label={`Edit ${customer.name}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-transparent text-[#0f6e66] transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#eef8f6] hover:shadow-[0_14px_26px_rgba(15,110,102,0.14)] hover:ring-1 hover:ring-[#9bc7c2] focus-visible:-translate-y-0.5 focus-visible:bg-[#eef8f6] focus-visible:shadow-[0_14px_26px_rgba(15,110,102,0.14)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9bc7c2]"
            onClick={openCustomerEditor}
            title="Edit customer"
            type="button"
          >
            <FaEdit aria-hidden="true" className="h-[15px] w-[15px]" />
          </button>
          {openIssues > 0 && (
            <span className="badge issue" title={`${openIssues} open issue${openIssues > 1 ? 's' : ''}`}>
              <IoWarning aria-hidden="true" className="h-3.5 w-3.5" />
              {openIssues}
            </span>
          )}
        </div>
      </div>

      <div className="customer-body">
        <StageRail currentPhase={customer.currentPhase} workflowTemplate={workflowTemplate} />
        <p>
          Stage {currentStop.stageIndex + 1}/{workflowTemplate.stages.length} ({currentStage.name}) - Phase {currentStop.label}:{' '}
          <strong>{currentStop.name}</strong>
        </p>
      </div>
    </article>
  )
}

export default CustomerCard
