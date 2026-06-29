import { FaEdit } from 'react-icons/fa'
import type { KeyboardEvent, MouseEvent } from 'react'
import { flowStops, getCustomerStatusLabel, stages } from '../../data/oemWorkflow'
import type { Customer, CustomerTag } from '../../data/oemWorkflow'
import StageRail from './StageRail'

type CustomerCardProps = {
  customer: Customer
  onAddTag: (customerId: string) => void
  onEditTag: (customerId: string, tag: CustomerTag) => void
  onOpen: (customerId: string) => void
  onOpenCompany: (customerId: string) => void
}

function CustomerCard({ customer, onAddTag, onEditTag, onOpen, onOpenCompany }: CustomerCardProps) {
  const currentStop = flowStops[customer.currentPhase]
  const openIssues = customer.issues.filter((issue) => !issue.closed).length

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
        <div>
          <button
            aria-label={`View ${customer.name} detail`}
            className="customer-name"
            onClick={openCustomerDetail}
            title="View customer detail"
            type="button"
          >
            {customer.name}
          </button>
          <div className={`customer-status-badge ${customer.status || 'brief_spec'}`}>
            <span>Status</span>
            <strong>{getCustomerStatusLabel(customer.status)}</strong>
          </div>
          <div className="tag-row">
            {customer.tags.map((tag) => (
              <button
                className="tag-chip"
                key={`${tag.id || tag.name}-${tag.color || ''}`}
                onClick={() => onEditTag(customer.id, tag)}
                style={tag.color ? { background: tag.color, color: '#fff' } : undefined}
                title="Edit tag"
                type="button"
              >
                {tag.name}
              </button>
            ))}
            <button className="tag-add-btn" onClick={() => onAddTag(customer.id)} type="button">
              + Tag
            </button>
          </div>
        </div>
        <div className="badges">
          <button
            aria-label={`Edit ${customer.name}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-transparent text-[#0f6e66] transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#eef8f6] hover:shadow-[0_14px_26px_rgba(15,110,102,0.14)] hover:ring-1 hover:ring-[#9bc7c2] focus-visible:-translate-y-0.5 focus-visible:bg-[#eef8f6] focus-visible:shadow-[0_14px_26px_rgba(15,110,102,0.14)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9bc7c2]"
            onClick={() => onOpenCompany(customer.id)}
            title="Edit customer"
            type="button"
          >
            <FaEdit aria-hidden="true" className="h-[15px] w-[15px]" />
          </button>
          {openIssues > 0 && <span className="badge issue">Issue {openIssues}</span>}
        </div>
      </div>

      <div className="customer-body">
        <StageRail currentPhase={customer.currentPhase} />
        <p>
          Stage {currentStop.stageIndex + 1}/5 ({stages[currentStop.stageIndex].name}) - Phase {currentStop.label}:{' '}
          <strong>{currentStop.name}</strong>
        </p>
      </div>
    </article>
  )
}

export default CustomerCard
