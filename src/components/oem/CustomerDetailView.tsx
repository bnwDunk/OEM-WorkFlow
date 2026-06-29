import { IoCloudUpload } from 'react-icons/io5'
import { MdCancel } from 'react-icons/md'
import { flowStops } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'
import ActivityPanel from './ActivityPanel'
import BranchCard from './BranchCard'
import IssuePanel from './IssuePanel'
import PhaseRail from './PhaseRail'

type CustomerDetailViewProps = {
  currentDept: string
  userDepartments: string[]
  customer: Customer
  viewedPhase: number
  onAddIssue: (payload: { openedBy: string; targetDept: string; text: string }) => void
  onBack: () => void
  onCancelBranch: (branchIndex: number) => void
  onCloseIssue: (issueIndex: number) => void
  onDoneBranch: (branchIndex: number) => void
  onOpenReset: () => void
  onToggleBranchItem: (branchIndex: number, itemIndex: number) => void
  onViewPhase: (phase: number) => void
}

function normalizeDepartmentName(value: string) {
  return value.trim().toLowerCase()
}

function hasDepartment(departments: string[], department: string) {
  const target = normalizeDepartmentName(department)
  return departments.some((item) => normalizeDepartmentName(item) === target)
}

function CustomerDetailView({
  currentDept,
  userDepartments,
  customer,
  onAddIssue,
  onBack,
  onCancelBranch,
  onCloseIssue,
  onDoneBranch,
  onOpenReset,
  onToggleBranchItem,
  onViewPhase,
  viewedPhase,
}: CustomerDetailViewProps) {
  const stop = flowStops[viewedPhase]
  const isPast = viewedPhase < customer.currentPhase && !customer.singleResets[viewedPhase]
  const isFuture = viewedPhase > customer.currentPhase
  const isActive = viewedPhase === customer.currentPhase || customer.singleResets[viewedPhase]
  const branchActions = stop.branches
    .map((branch, branchIndex) => {
      const branchState = customer.branch[viewedPhase][branchIndex]
      return {
        branchIndex,
        canManage: hasDepartment(userDepartments, branch.dept),
        dept: branch.dept,
        dirty: JSON.stringify(branchState.live) !== JSON.stringify(branchState.saved),
        done: branchState.done,
      }
    })
    .filter((action) => !action.done && isActive && action.canManage)

  return (
    <section className="page-pad detail-page">
      <button
        className="mb-7 inline-flex min-h-10 items-center justify-center rounded-xl !bg-black px-5 text-sm font-bold !text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition duration-150 ease-out hover:-translate-y-0.5 hover:!bg-slate-800 hover:shadow-[0_14px_30px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        onClick={onBack}
        type="button"
      >
        Back
      </button>

      <header className="detail-head">
        <span>Stage {stop.stageIndex + 1}/5: {stop.stageName} - Phase {stop.label}</span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="!m-0">{customer.name}</h1>
          {branchActions.map((action) => (
            <div
              className="inline-flex items-center gap-2 rounded-2xl bg-white/80 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80"
              key={`${action.dept}-${action.branchIndex}`}
            >
              {branchActions.length > 1 && (
                <span className="pl-2 text-xs font-extrabold text-slate-500">{action.dept}</span>
              )}
              <button
                aria-label={`Save ${action.dept} checklist`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl !border-0 !bg-[#0f6e66] !p-0 !text-white shadow-[0_10px_22px_rgba(15,110,102,0.16)] transition duration-150 ease-out hover:-translate-y-0.5 hover:!bg-[#0b5d57] hover:shadow-[0_14px_28px_rgba(15,110,102,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bc7c2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
                disabled={!action.dirty}
                onClick={() => onDoneBranch(action.branchIndex)}
                title="Save"
                type="button"
              >
                <IoCloudUpload aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                aria-label={`Cancel ${action.dept} checklist changes`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl !border-0 !bg-rose-50 !p-0 !text-rose-600 shadow-[0_10px_22px_rgba(225,29,72,0.12)] transition duration-150 ease-out hover:-translate-y-0.5 hover:!bg-rose-100 hover:shadow-[0_14px_28px_rgba(225,29,72,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:!bg-slate-100 disabled:!text-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
                disabled={!action.dirty}
                onClick={() => onCancelBranch(action.branchIndex)}
                title="Cancel"
                type="button"
              >
                <MdCancel aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
        <p>{stop.name}</p>
        {isPast && <em className="view-note past">ดูประวัติ Phase ที่ทำไปแล้ว</em>}
        {isFuture && <em className="view-note future">ยังไม่ถึง Phase นี้ ดูล่วงหน้าได้ แต่ยังแก้ไขไม่ได้</em>}
      </header>

      <PhaseRail customer={customer} onViewPhase={onViewPhase} viewedPhase={viewedPhase} />

      {isPast && (
        <button className="stage-reset-btn" onClick={onOpenReset} type="button">
          Reset to Draft
        </button>
      )}

      <div className="branch-grid" style={{ gridTemplateColumns: `repeat(${stop.branches.length}, minmax(0, 1fr))` }}>
        {stop.branches.map((branch, branchIndex) => (
          <BranchCard
            branch={branch}
            branchState={customer.branch[viewedPhase][branchIndex]}
            canManage={hasDepartment(userDepartments, branch.dept)}
            isActive={Boolean(isActive)}
            key={`${branch.dept}-${branchIndex}`}
            onToggle={(itemIndex) => onToggleBranchItem(branchIndex, itemIndex)}
          />
        ))}
      </div>

      <div className="panels">
        <ActivityPanel notifications={customer.notifications} />
        <IssuePanel
          currentDept={currentDept}
          userDepartments={userDepartments}
          issues={customer.issues}
          onAddIssue={onAddIssue}
          onCloseIssue={onCloseIssue}
        />
      </div>
    </section>
  )
}

export default CustomerDetailView
