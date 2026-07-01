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

const phaseStyles = {
  current: 'border-teal-600 bg-teal-700 text-white shadow-[0_12px_24px_rgba(15,118,110,0.18)]',
  done: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  locked: 'border-slate-200 bg-slate-50 text-slate-400',
}

function PhaseRail({ customer, onViewPhase, viewedPhase }: PhaseRailProps) {
  const stageGroups = stages.map((stage, stageIndex) => ({
    stage,
    stops: flowStops
      .map((stop, phase) => ({ ...stop, phase }))
      .filter((stop) => stop.stageIndex === stageIndex),
  }))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]" aria-label="OEM workflow phases">
      <div className="grid gap-3 xl:grid-cols-5">
        {stageGroups.map(({ stage, stops }, stageIndex) => (
          <section className="rounded-xl border border-slate-100 bg-slate-50 p-3" key={stage.name}>
            <div className="mb-3 flex items-center gap-2">
              <strong className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-xs font-black text-white">S{stageIndex + 1}</strong>
              <span className="min-w-0 text-sm font-black text-slate-800">{stage.name}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {stops.map((stop) => {
                const status = getPhaseStatus(customer, stop.phase)
                const viewing = viewedPhase === stop.phase

                return (
                  <button
                    className={`relative grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-black transition hover:-translate-y-0.5 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${phaseStyles[status]} ${viewing ? 'ring-4 ring-teal-100' : ''}`}
                    onClick={() => onViewPhase(stop.phase)}
                    title={`${stop.label} ${stop.name}`}
                    type="button"
                    key={`${stop.stageName}-${stop.label}`}
                  >
                    {stop.label}
                    {stop.branches.length > 1 && (
                      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-slate-700 shadow-sm">
                        {stop.branches.length}
                      </span>
                    )}
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
