import { IoCloudUpload } from 'react-icons/io5'
import { MdCancel } from 'react-icons/md'
import { defaultWorkflowTemplate } from '../../data/oemWorkflow'
import type { Customer, CustomerWorkflowTemplate, IssueItem } from '../../data/oemWorkflow'
import ActivityPanel from './ActivityPanel'
import BranchCard from './BranchCard'
import IssuePanel from './IssuePanel'
import PhaseRail from './PhaseRail'

type CustomerDetailViewProps = {
  canCloseAllIssues?: boolean
  currentDept: string
  currentUserName: string
  userDepartments: string[]
  customer: Customer
  workflowTemplate?: CustomerWorkflowTemplate
  viewedPhase: number
  onAddIssue: (payload: { openedBy: string; targetDept: string; text: string }) => void
  onBack: () => void
  onCancelBranch: (branchIndex: number) => void
  onCloseIssue: (issue: IssueItem) => Promise<void> | void
  onDoneBranch: (branchIndex: number) => void
  onOpenReset: () => void
  onToggleBranchItem: (branchIndex: number, itemIndex: number) => void
  onViewPhase: (phase: number) => void
  savingBranchAction?: string | null
}

function normalizeDepartmentName(value: string) {
  return value.trim().toLowerCase()
}

function hasDepartment(departments: string[], department: string) {
  const target = normalizeDepartmentName(department)
  return departments.some((item) => normalizeDepartmentName(item) === target)
}

function CustomerDetailView({
  canCloseAllIssues = false,
  currentDept,
  currentUserName,
  userDepartments,
  customer,
  workflowTemplate = defaultWorkflowTemplate,
  onAddIssue,
  onBack,
  onCancelBranch,
  onCloseIssue,
  onDoneBranch,
  onOpenReset,
  onToggleBranchItem,
  onViewPhase,
  savingBranchAction = null,
  viewedPhase,
}: CustomerDetailViewProps) {
  const stop = workflowTemplate.stops[viewedPhase] || workflowTemplate.stops[0] || defaultWorkflowTemplate.stops[0]
  const phaseBranches = stop.branches
  const branchStates = customer.branch[viewedPhase] || []
  const isPast = viewedPhase < customer.currentPhase && !customer.singleResets[viewedPhase]
  const isFuture = viewedPhase > customer.currentPhase
  const isActive = viewedPhase === customer.currentPhase || customer.singleResets[viewedPhase]
  const openIssuePhaseSet = new Set(
    customer.issues
      .filter((issue) => !issue.closed)
      .map((issue) => typeof issue.phase === 'number' ? issue.phase : customer.currentPhase),
  )
  const branchActions = phaseBranches
    .map((branch, branchIndex) => ({
      branchIndex,
      canManage: hasDepartment(userDepartments, branch.dept),
      dept: branch.dept,
      done: branchStates[branchIndex]?.done || false,
      hasCheckedItem: branchStates[branchIndex]?.live.some(Boolean) || false,
    }))
    .filter((action) => !action.done && isActive && action.canManage)

  return (
    <section className="min-h-[calc(100svh-52px)] bg-slate-50 px-4 py-4 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-4">
        <button
          className="inline-flex min-h-10 w-fit items-center justify-center rounded-xl !border-0 !bg-slate-950 px-4 text-sm font-black !text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:!bg-slate-800 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          onClick={onBack}
          type="button"
        >
          Back
        </button>

        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
            <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-800">
              Stage {stop.stageIndex + 1}/{workflowTemplate.stages.length} - Phase {stop.label}
            </span>
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="m-0 min-w-0 text-3xl font-black leading-tight text-slate-950">{customer.name}</h1>
                {branchActions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {branchActions.map((action) => (
                      <div
                        className="inline-flex items-center gap-1.5"
                        key={`${action.dept}-${action.branchIndex}`}
                      >
                        {branchActions.length > 1 && (
                          <span className="mr-1 text-xs font-extrabold text-slate-500">{action.dept}</span>
                        )}
                        <button
                          aria-label={`Save ${action.dept} checklist`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl !border-0 !bg-teal-700 !p-0 !text-white shadow-sm transition hover:-translate-y-0.5 hover:!bg-teal-800 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={Boolean(savingBranchAction) || !action.hasCheckedItem}
                          onClick={() => onDoneBranch(action.branchIndex)}
                          title={action.hasCheckedItem ? 'Save' : 'Tick at least one item before saving'}
                          type="button"
                        >
                          <IoCloudUpload aria-hidden="true" className="h-5 w-5" />
                        </button>
                        <button
                          aria-label={`Cancel ${action.dept} checklist changes`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl !border !border-rose-100 !bg-white !p-0 !text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:!bg-rose-50 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={Boolean(savingBranchAction)}
                          onClick={() => onCancelBranch(action.branchIndex)}
                          title="Cancel"
                          type="button"
                        >
                          <MdCancel aria-hidden="true" className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="m-0 mt-1.5 text-base font-black text-slate-700">{stop.name}</p>
                <p className="m-0 mt-1 text-sm font-bold text-slate-500">{stop.stageName}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 sm:px-5">
            {branchActions.length === 0 && (
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-500">No editable branch in this phase</span>
            )}
            {isPast && (
              <em className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black not-italic text-amber-700">Viewing completed phase</em>
            )}
            {isFuture && (
              <em className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black not-italic text-slate-500">Future phase</em>
            )}
          </div>
        </header>

        <PhaseRail customer={customer} issuePhaseSet={openIssuePhaseSet} onViewPhase={onViewPhase} viewedPhase={viewedPhase} workflowTemplate={workflowTemplate} />

        {isPast && (
          <button
            className="min-h-10 w-fit rounded-xl !border !border-amber-200 !bg-amber-50 px-4 text-sm font-black !text-amber-800 transition hover:!bg-amber-100 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
            onClick={onOpenReset}
            type="button"
          >
            Reset to Draft
          </button>
        )}

        <div className="grid gap-4 lg:grid-cols-[repeat(var(--branch-count),minmax(0,1fr))]" style={{ '--branch-count': phaseBranches.length } as React.CSSProperties}>
          {phaseBranches.map((branch, branchIndex) => (
            <BranchCard
              branch={branch}
              branchState={branchStates[branchIndex] || { done: false, live: branch.items.map(() => false), saved: branch.items.map(() => false) }}
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
            canCloseAll={canCloseAllIssues}
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
