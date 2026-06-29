import type { BranchState, BranchTemplate } from '../../data/oemWorkflow'

type BranchCardProps = {
  branch: BranchTemplate
  branchState: BranchState
  canManage: boolean
  isActive: boolean
  onToggle: (itemIndex: number) => void
}

function BranchCard({
  branch,
  branchState,
  canManage,
  isActive,
  onToggle,
}: BranchCardProps) {
  const locked = branchState.done || !isActive || !canManage
  const itemCount = Math.max(branch.items.length, branchState.live.length, branchState.saved.length)
  const checklistItems = Array.from({ length: itemCount }, (_, itemIndex) => ({
    checked: Boolean(branchState.live[itemIndex]),
    label: branch.items[itemIndex] || `Checklist ${itemIndex + 1}`,
  }))

  return (
    <article className={`branch-card ${canManage ? '' : 'branch-card-readonly'}`}>
      <div className="branch-head">
        <h4>{branch.dept}</h4>
        <span className={`status-pill ${branchState.done ? 'done' : 'wait'}`}>
          {branchState.done ? 'เสร็จแล้ว' : isActive ? 'กำลังทำ' : 'ยังไม่ถึงตา'}
        </span>
      </div>

      <div className="checklist">
        {checklistItems.map((item, itemIndex) => (
          <label className={item.checked ? 'checked' : ''} key={`${item.label}-${itemIndex}`}>
            <input
              checked={item.checked}
              disabled={locked}
              onChange={() => onToggle(itemIndex)}
              type="checkbox"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </article>
  )
}

export default BranchCard
