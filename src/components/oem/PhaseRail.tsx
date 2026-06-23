import { flowStops, stages } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'

type PhaseRailProps = {
  customer: Customer
  viewedPhase: number
  onViewPhase: (phase: number) => void
}

function getPhaseStatus(customer: Customer, phase: number) {
  if (customer.singleResets[phase]) return 'current'
  if (phase < customer.currentPhase) return 'done'
  if (phase === customer.currentPhase) return 'current'
  return 'locked'
}

function PhaseRail({ customer, onViewPhase, viewedPhase }: PhaseRailProps) {
  const stageGroups = stages.map((stage, stageIndex) => ({
    stage,
    stops: flowStops
      .map((stop, phase) => ({ ...stop, phase }))
      .filter((stop) => stop.stageIndex === stageIndex),
  }))

  return (
    <div className="phase-rail-card" aria-label="OEM workflow phases">
      <div className="phase-rail">
        {stageGroups.map(({ stage, stops }, stageIndex) => (
          <section className="phase-stage-group" key={stage.name}>
            <div className="phase-stage-title">
              <strong>S{stageIndex + 1}</strong>
              <span>{stage.name}</span>
            </div>

            <div className="phase-stage-steps">
              {stops.map((stop) => {
                const status = getPhaseStatus(customer, stop.phase)

                return (
                  <button
                    className={`phase-chip ${status} ${viewedPhase === stop.phase ? 'viewing' : ''}`}
                    onClick={() => onViewPhase(stop.phase)}
                    title={`${stop.label} ${stop.name}`}
                    type="button"
                    key={`${stop.stageName}-${stop.label}`}
                  >
                    {stop.label}
                    {stop.branches.length > 1 && <span>{stop.branches.length}</span>}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default PhaseRail
