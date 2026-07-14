import { defaultWorkflowTemplate } from '../../data/oemWorkflow'
import type { CustomerWorkflowTemplate } from '../../data/oemWorkflow'

type StageRailProps = {
  currentPhase: number
  workflowTemplate?: CustomerWorkflowTemplate
}

type StageStatus = 'done' | 'current' | 'locked'

function getStageStatus(currentPhase: number, start: number, end: number): StageStatus {
  if (currentPhase > end) return 'done'
  if (currentPhase >= start && currentPhase <= end) return 'current'
  return 'locked'
}

const stageStatusStyles = {
  done: 'border-teal-200 bg-teal-50 text-teal-800 shadow-teal-100/80',
  current: 'border-amber-300 bg-amber-500 text-white shadow-amber-200/80',
  locked: 'border-dashed border-slate-200 bg-white text-slate-500 shadow-slate-100/70',
}

function StageRail({ currentPhase, workflowTemplate = defaultWorkflowTemplate }: StageRailProps) {
  const stageRanges = workflowTemplate.stages.reduce<{ start: number; end: number }[]>((ranges, stage) => {
    const start = ranges.length === 0 ? 0 : ranges[ranges.length - 1].end + 1
    ranges.push({ start, end: start + stage.stops.length - 1 })
    return ranges
  }, [])

  return (
    <div className="flex flex-wrap gap-2.5">
      {workflowTemplate.stages.map((stage, index) => {
        const range = stageRanges[index]
        const status = getStageStatus(currentPhase, range.start, range.end)
        const within = Math.min(Math.max(currentPhase - range.start + 1, 0), stage.stops.length)

        return (
          <div
            className={`grid min-h-[52px] w-[66px] shrink-0 place-items-center rounded-xl border text-center text-xs font-black leading-none shadow-sm transition duration-150 ${stageStatusStyles[status]}`}
            key={stage.name}
            title={stage.name}
          >
            <span>S{index + 1}</span>
            <span className={`text-[10px] font-extrabold ${status === 'locked' ? 'opacity-0' : 'opacity-90'}`}>
              {status === 'locked' ? '0/0' : `${within}/${stage.stops.length}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default StageRail
