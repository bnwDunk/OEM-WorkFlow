import type { BranchState, BranchTemplate } from '../../data/oemWorkflow'

type BranchCardProps = {
  branch: BranchTemplate
  branchState: BranchState
  canManage: boolean
  isActive: boolean
  onCancel: () => void
  onSave: () => void
  onToggle: (itemIndex: number) => void
}

function BranchCard({
  branch,
  branchState,
  canManage,
  isActive,
  onCancel,
  onSave,
  onToggle,
}: BranchCardProps) {
  const locked = branchState.done || !isActive || !canManage
  const dirty = JSON.stringify(branchState.live) !== JSON.stringify(branchState.saved)
  const itemCount = Math.max(branch.items.length, branchState.live.length, branchState.saved.length)
  const checklistItems = Array.from({ length: itemCount }, (_, itemIndex) => ({
    checked: Boolean(branchState.live[itemIndex]),
    label: branch.items[itemIndex] || `Checklist ${itemIndex + 1}`,
  }))
  const canDone = checklistItems.length > 0 && checklistItems.every((item) => item.checked)

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

      {!branchState.done && isActive && canManage && (
        <>
          <div className="btn-row">
            <button className="btn-mini save" disabled={!canDone} onClick={onSave} type="button">Save</button>
            <button className="btn-mini cancel" disabled={!dirty} onClick={onCancel} type="button">Cancel</button>
          </div>
          {!canDone && <p className="warn-text">ติ๊กให้ครบทุกข้อก่อนกด Save</p>}
        </>
      )}
    </article>
  )
}

export default BranchCard
