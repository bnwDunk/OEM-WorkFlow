import { stageRanges, stages } from '../../data/oemWorkflow'

type StageRailProps = {
  currentPhase: number
}

function getStageStatus(currentPhase: number, start: number, end: number) {
  if (currentPhase > end) return 'done'
  if (currentPhase >= start && currentPhase <= end) return 'current'
  return 'locked'
}

function StageRail({ currentPhase }: StageRailProps) {
  return (
    <div className="stage-rail">
      {stages.map((stage, index) => {
        const range = stageRanges[index]
        const status = getStageStatus(currentPhase, range.start, range.end)
        const within = Math.min(Math.max(currentPhase - range.start + 1, 0), stage.stops.length)

        return (
          <div className={`stage-chip ${status}`} key={stage.name} title={stage.name}>
            S{index + 1}
            <span>{status === 'locked' ? '' : `${within}/${stage.stops.length}`}</span>
          </div>
        )
      })}
    </div>
  )
}

export default StageRail
