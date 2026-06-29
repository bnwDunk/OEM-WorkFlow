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

  return (
    <article className="customer-card">
      <div className="customer-head">
        <div>
          <button className="customer-name" onClick={() => onOpenCompany(customer.id)} type="button">
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
          {customer.notifications.length > 0 && <span className="badge notif">Bell {customer.notifications.length}</span>}
          {openIssues > 0 && <span className="badge issue">Issue {openIssues}</span>}
        </div>
      </div>

      <button className="customer-body" onClick={() => onOpen(customer.id)} type="button">
        <StageRail currentPhase={customer.currentPhase} />
        <p>
          Stage {currentStop.stageIndex + 1}/5 ({stages[currentStop.stageIndex].name}) - Phase {currentStop.label}:{' '}
          <strong>{currentStop.name}</strong>
        </p>
      </button>
    </article>
  )
}

export default CustomerCard
