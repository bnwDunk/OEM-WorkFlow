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
  currentUserName: string
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
  currentUserName,
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
    <section className="min-h-[calc(100svh-52px)] bg-white px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <button
          className="inline-flex min-h-10 w-fit items-center justify-center rounded-xl !border-0 !bg-slate-950 px-5 text-sm font-black !text-white shadow-sm transition hover:!bg-slate-800 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          onClick={onBack}
          type="button"
        >
          Back
        </button>

        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
          <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-800">
            Stage {stop.stageIndex + 1}/5: {stop.stageName} - Phase {stop.label}
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-3xl font-black text-slate-950">{customer.name}</h1>
            {branchActions.map((action) => (
              <div
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 p-1 shadow-sm ring-1 ring-slate-200"
                key={`${action.dept}-${action.branchIndex}`}
              >
                {branchActions.length > 1 && (
                  <span className="pl-2 text-xs font-extrabold text-slate-500">{action.dept}</span>
                )}
                <button
                  aria-label={`Save ${action.dept} checklist`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl !border-0 !bg-teal-700 !p-0 !text-white shadow-sm transition hover:!bg-teal-800 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400 disabled:shadow-none"
                  disabled={!action.dirty}
                  onClick={() => onDoneBranch(action.branchIndex)}
                  title="Save"
                  type="button"
                >
                  <IoCloudUpload aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  aria-label={`Cancel ${action.dept} checklist changes`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl !border-0 !bg-rose-50 !p-0 !text-rose-600 shadow-sm transition hover:!bg-rose-100 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:!bg-slate-100 disabled:!text-slate-300 disabled:shadow-none"
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
          <p className="m-0 mt-2 text-base font-semibold text-slate-600">{stop.name}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isPast && <em className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black not-italic text-amber-700">ดูประวัติ Phase ที่ทำไปแล้ว</em>}
            {isFuture && <em className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black not-italic text-slate-500">ยังไม่ถึง Phase นี้ ดูล่วงหน้าได้ แต่ยังแก้ไขไม่ได้</em>}
          </div>
        </header>

        <PhaseRail customer={customer} onViewPhase={onViewPhase} viewedPhase={viewedPhase} />

        {isPast && (
          <button
            className="min-h-11 w-fit rounded-xl !border !border-amber-200 !bg-amber-50 px-5 text-sm font-black !text-amber-800 transition hover:!bg-amber-100 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
            onClick={onOpenReset}
            type="button"
          >
            Reset to Draft
          </button>
        )}

      <div className="grid gap-4 lg:grid-cols-[repeat(var(--branch-count),minmax(0,1fr))]" style={{ '--branch-count': stop.branches.length } as React.CSSProperties}>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityPanel notifications={customer.notifications} />
        <IssuePanel
          currentDept={currentDept}
          currentUserName={currentUserName}
          userDepartments={userDepartments}
          issues={customer.issues}
          onAddIssue={onAddIssue}
          onCloseIssue={onCloseIssue}
        />
      </div>
      </div>
    </section>
  )
}

export default CustomerDetailView
