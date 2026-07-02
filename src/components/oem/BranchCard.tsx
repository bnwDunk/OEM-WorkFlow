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
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      label: 'Saved',
    }
  }

  if (isActive) {
    return {
      className: 'border-teal-200 bg-teal-50 text-teal-800',
      label: 'Working',
    }
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-500',
    label: 'Queued',
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
    <article className={`overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] ${canManage ? 'border-slate-200' : 'border-slate-100 opacity-80'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-5">
        <div>
          <h4 className="m-0 text-2xl font-black text-slate-950">{branch.dept}</h4>
          {!canManage && <p className="m-0 mt-1 text-xs font-bold text-slate-400">Read only</p>}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
      </div>

      <div className="grid gap-3 p-5">
        {checklistItems.map((item, itemIndex) => (
          <label
            className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${item.checked ? 'border-teal-200 bg-teal-50 text-teal-950 shadow-sm' : 'border-slate-200 bg-white text-slate-700'} ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md'}`}
            key={`${item.label}-${itemIndex}`}
          >
            <input
              checked={item.checked}
              className="h-5 w-5 accent-teal-700"
              disabled={locked}
              onChange={() => onToggle(itemIndex)}
              type="checkbox"
            />
            <span className="leading-snug">{item.label}</span>
          </label>
        ))}
      </div>
    </article>
  )
}

export default BranchCard
