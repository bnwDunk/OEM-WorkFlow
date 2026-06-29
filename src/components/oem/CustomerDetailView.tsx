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
        <h1>{customer.name}</h1>
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
            onCancel={() => onCancelBranch(branchIndex)}
            onSave={() => onDoneBranch(branchIndex)}
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
