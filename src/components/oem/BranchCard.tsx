import type { BranchState, BranchTemplate } from '../../data/oemWorkflow'

type BranchCardProps = {
  branch: BranchTemplate
  branchState: BranchState
  canManage: boolean
  isActive: boolean
  onToggle: (itemIndex: number) => void
}

function getBranchStatus(branchState: BranchState, isActive: boolean) {
  if (branchState.done) {
    return {
      className: 'bg-emerald-50 text-emerald-700',
      label: 'เสร็จแล้ว',
    }
  }

  if (isActive) {
    return {
      className: 'bg-teal-50 text-teal-800',
      label: 'กำลังทำ',
    }
  }

  return {
    className: 'bg-slate-100 text-slate-500',
    label: 'ยังไม่ถึงคิว',
  }
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
  const status = getBranchStatus(branchState, isActive)
  const checklistItems = Array.from({ length: itemCount }, (_, itemIndex) => ({
    checked: Boolean(branchState.live[itemIndex]),
    label: branch.items[itemIndex] || `Checklist ${itemIndex + 1}`,
  }))

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ${canManage ? 'border-slate-200' : 'border-slate-100 opacity-80'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="m-0 text-xl font-black text-slate-950">{branch.dept}</h4>
          {!canManage && <p className="m-0 mt-1 text-xs font-bold text-slate-400">Read only</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
      </div>

      <div className="grid gap-2">
        {checklistItems.map((item, itemIndex) => (
          <label
            className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold transition ${item.checked ? 'border-teal-100 bg-teal-50 text-teal-900' : 'border-slate-200 bg-slate-50 text-slate-700'} ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-teal-200 hover:bg-white'}`}
            key={`${item.label}-${itemIndex}`}
          >
            <input
              checked={item.checked}
              className="h-4 w-4 accent-teal-700"
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
