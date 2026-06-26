import { flowStops } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'
import ActivityPanel from './ActivityPanel'
import BranchCard from './BranchCard'
import IssuePanel from './IssuePanel'
import PhaseRail from './PhaseRail'

type CustomerDetailViewProps = {
  currentDept: string
  customer: Customer
  viewedPhase: number
  onAddIssue: (payload: { openedBy: string; targetDept: string; text: string }) => void
  onBack: () => void
  onCancelBranch: (branchIndex: number) => void
  onCloseIssue: (issueIndex: number) => void
  onDoneBranch: (branchIndex: number) => void
  onOpenReset: () => void
  onSaveBranch: (branchIndex: number) => void
  onToggleBranchItem: (branchIndex: number, itemIndex: number) => void
  onViewPhase: (phase: number) => void
}

function CustomerDetailView({
  currentDept,
  customer,
  onAddIssue,
  onBack,
  onCancelBranch,
  onCloseIssue,
  onDoneBranch,
  onOpenReset,
  onSaveBranch,
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
      <button className="back-link" onClick={onBack} type="button">เธเธฅเธฑเธ Overview</button>

      <header className="detail-head">
        <span>Stage {stop.stageIndex + 1}/5: {stop.stageName} - Phase {stop.label}</span>
        <h1>{customer.name}</h1>
        <p>{stop.name}</p>
        {isPast && <em className="view-note past">เธ”เธนเธเธฃเธฐเธงเธฑเธ•เธด Phase เธ—เธตเนเธ—เธณเนเธเนเธฅเนเธง</em>}
        {isFuture && <em className="view-note future">เธขเธฑเธเนเธกเนเธ–เธถเธ Phase เธเธตเน เธ”เธนเธฅเนเธงเธเธซเธเนเธฒเนเธ”เน เนเธ•เนเนเธเนเนเธกเนเนเธ”เน</em>}
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
            canManage={branch.dept === currentDept}
            isActive={Boolean(isActive)}
            key={`${branch.dept}-${branchIndex}`}
            onCancel={() => onCancelBranch(branchIndex)}
            onDone={() => onDoneBranch(branchIndex)}
            onSave={() => onSaveBranch(branchIndex)}
            onToggle={(itemIndex) => onToggleBranchItem(branchIndex, itemIndex)}
          />
        ))}
      </div>

      <div className="panels">
        <ActivityPanel notifications={customer.notifications} />
        <IssuePanel
          currentDept={currentDept}
          issues={customer.issues}
          onAddIssue={onAddIssue}
          onCloseIssue={onCloseIssue}
        />
      </div>
    </section>
  )
}

export default CustomerDetailView

