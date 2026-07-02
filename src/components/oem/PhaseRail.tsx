import { flowStops, stages } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'

type PhaseRailProps = {
  customer: Customer
  issuePhaseSet?: Set<number>
  viewedPhase: number
  onViewPhase: (phase: number) => void
}

type PhaseStatus = 'current' | 'done' | 'issue' | 'locked'

function getPhaseStatus(customer: Customer, phase: number, issuePhaseSet: Set<number>): PhaseStatus {
  if (issuePhaseSet.has(phase)) return 'issue'

  const branchStates = customer.branch[phase] || []
  const allDone = branchStates.length > 0 && branchStates.every((branch) => branch.done)

  if (customer.singleResets[phase]) return 'current'
  if (allDone || phase < customer.currentPhase) return 'done'
  if (phase === customer.currentPhase) return 'current'
  return 'locked'
}

const phaseStyles = {
  current: 'border-teal-600 bg-teal-700 text-white shadow-[0_14px_28px_rgba(15,118,110,0.22)]',
  done: 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[0_10px_22px_rgba(5,150,105,0.10)]',
  issue: 'border-amber-300 bg-amber-50 text-amber-900 shadow-[0_10px_22px_rgba(217,119,6,0.13)]',
  locked: 'border-slate-200 bg-white text-slate-400',
}

const legendItems = [
  { className: 'bg-emerald-500', label: 'Done' },
  { className: 'bg-teal-700', label: 'Active' },
  { className: 'bg-amber-400', label: 'Issue' },
  { className: 'bg-white ring-1 ring-slate-300', label: 'Waiting' },
]

const statusLabels: Record<PhaseStatus, string> = {
  current: 'Active',
  done: 'Done',
  issue: 'Issue',
  locked: 'Waiting',
}

function PhaseRail({ customer, issuePhaseSet = new Set<number>(), onViewPhase, viewedPhase }: PhaseRailProps) {
  const stageGroups = stages.map((stage, stageIndex) => ({
    stage,
    stops: flowStops
      .map((stop, phase) => ({ ...stop, phase }))
      .filter((stop) => stop.stageIndex === stageIndex),
  }))

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)]" aria-label="OEM workflow phases">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-black uppercase text-slate-400">Workflow map</p>
          <h3 className="m-0 mt-1 text-xl font-black text-slate-950">Phase status</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {legendItems.map((item) => (
            <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500" key={item.label}>
              <i className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {stageGroups.map(({ stage, stops }, stageIndex) => (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" key={stage.name}>
            <div className="mb-3 flex items-center gap-2">
              <strong className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white shadow-sm">S{stageIndex + 1}</strong>
              <span className="min-w-0 text-sm font-black leading-tight text-slate-800">{stage.name}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {stops.map((stop) => {
                const status = getPhaseStatus(customer, stop.phase, issuePhaseSet)
                const viewing = viewedPhase === stop.phase

                return (
                  <button
                    className={`relative grid h-12 min-w-12 place-items-center rounded-2xl border px-3 text-base font-black transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${phaseStyles[status]} ${viewing ? 'ring-4 ring-teal-100 ring-offset-2 ring-offset-white' : ''}`}
                    onClick={() => onViewPhase(stop.phase)}
                    title={`${stop.label} ${stop.name} - ${statusLabels[status]}`}
                    type="button"
                    key={`${stop.stageName}-${stop.label}`}
                  >
                    {stop.label}
                    {stop.branches.length > 1 && (
                      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                        {stop.branches.length}
                      </span>
                    )}
                    {status === 'issue' && (
                      <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
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
