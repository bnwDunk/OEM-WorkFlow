import { flowStops, stages } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'
import StageRail from './StageRail'

type CustomerCardProps = {
  customer: Customer
  onOpen: (customerId: string) => void
  onOpenCompany: (customerId: string) => void
}

function CustomerCard({ customer, onOpen, onOpenCompany }: CustomerCardProps) {
  const currentStop = flowStops[customer.currentPhase]
  const openIssues = customer.issues.filter((issue) => !issue.closed).length

  return (
    <article className="customer-card">
      <div className="customer-head">
        <div>
          <button className="customer-name" onClick={() => onOpenCompany(customer.id)} type="button">
            {customer.name}
          </button>
          <div className="tag-row">
            {customer.tags.map((tag) => (
              <span className="tag-chip" key={tag}>{tag}</span>
            ))}
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
          Stage {currentStop.stageIndex + 1}/5 ({stages[currentStop.stageIndex].name}) · Phase {currentStop.label}: <strong>{currentStop.name}</strong>
        </p>
      </button>
    </article>
  )
}

export default CustomerCard
