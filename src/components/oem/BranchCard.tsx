import type { BranchState, BranchTemplate } from '../../data/oemWorkflow'

type BranchCardProps = {
  branch: BranchTemplate
  branchState: BranchState
  canManage: boolean
  isActive: boolean
  onCancel: () => void
  onDone: () => void
  onSave: () => void
  onToggle: (itemIndex: number) => void
}

function BranchCard({
  branch,
  branchState,
  canManage,
  isActive,
  onCancel,
  onDone,
  onSave,
  onToggle,
}: BranchCardProps) {
  const locked = branchState.done || !isActive || !canManage
  const dirty = JSON.stringify(branchState.live) !== JSON.stringify(branchState.saved)
  const canDone = branchState.live.every(Boolean)

  return (
    <article className={`branch-card ${canManage ? '' : 'branch-card-readonly'}`}>
      <div className="branch-head">
        <h4>{branch.dept}</h4>
        <span className={`status-pill ${branchState.done ? 'done' : 'wait'}`}>
          {branchState.done ? 'เสร็จแล้ว' : isActive ? 'กำลังทำ' : 'ยังไม่ถึงตา'}
        </span>
      </div>

      <div className="checklist">
        {branch.items.map((item, itemIndex) => (
          <label className={branchState.live[itemIndex] ? 'checked' : ''} key={item}>
            <input
              checked={branchState.live[itemIndex]}
              disabled={locked}
              onChange={() => onToggle(itemIndex)}
              type="checkbox"
            />
            <span>{item}</span>
          </label>
        ))}
      </div>

      {!branchState.done && isActive && canManage && (
        <>
          <div className="btn-row">
            <button className="btn-mini save" onClick={onSave} type="button">Save</button>
            <button className="btn-mini cancel" disabled={!dirty} onClick={onCancel} type="button">Cancel</button>
            <button className="btn-mini done" disabled={!canDone} onClick={onDone} type="button">Done</button>
          </div>
          {!canDone && <p className="warn-text">ติ๊กให้ครบทุกข้อก่อนกด Done</p>}
        </>
      )}
    </article>
  )
}

export default BranchCard
