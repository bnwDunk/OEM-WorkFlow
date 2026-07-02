import type { FormEvent } from 'react'
import { departments } from '../../data/oemWorkflow'
import type { IssueItem } from '../../data/oemWorkflow'

type IssuePanelProps = {
  currentDept: string
  currentUserName: string
  userDepartments: string[]
  issues: IssueItem[]
  onAddIssue: (payload: { openedBy: string; targetDept: string; text: string }) => void
  onCloseIssue: (issueIndex: number) => void
}

function IssuePanel({ currentDept, currentUserName, userDepartments, issues, onAddIssue, onCloseIssue }: IssuePanelProps) {
  const openIssueCount = issues.filter((issue) => !issue.closed).length

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const openedBy = currentUserName.trim()
    const targetDept = String(data.get('targetDept') || departments[0].name)
    const text = String(data.get('text') || '').trim()

    if (!openedBy || !text) return

    onAddIssue({ openedBy, targetDept, text })
    form.reset()
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-lg font-black text-slate-950">Issue tickets</h4>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Open cross-team blockers for this customer.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${openIssueCount ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-600'}`}>
          {openIssueCount} open
        </span>
      </div>

      <div className="grid gap-3">
        {issues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
            No issue tickets right now.
          </div>
        ) : (
          issues.map((issue, index) => {
            const canClose = !issue.closed && [issue.openedByDept, issue.targetDept].some((department) => userDepartments.includes(department))

            return (
              <article
                className={`rounded-xl border p-3.5 transition ${issue.closed ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-amber-200 bg-amber-50/80 shadow-sm'}`}
                key={`${issue.text}-${issue.time}-${index}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm ${issue.closed ? 'text-slate-600' : 'text-amber-900'}`}>
                      To {issue.targetDept}
                    </span>
                    {typeof issue.phase === 'number' && (
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-500 shadow-sm">Phase {issue.phase + 1}</span>
                    )}
                  </div>
                  {canClose && (
                    <button
                      className="min-h-9 rounded-xl !border-0 !bg-white px-3 text-xs font-black !text-slate-700 shadow-sm transition hover:!bg-slate-100"
                      onClick={() => onCloseIssue(index)}
                      type="button"
                    >
                      Close
                    </button>
                  )}
                </div>
                <small className="mt-3 block text-xs font-bold text-slate-500">
                  Opened by {issue.openedBy} ({issue.openedByDept}) - {issue.time}
                </small>
                <p className="m-0 mt-2 text-sm font-semibold text-slate-800">{issue.text}</p>
              </article>
            )
          })
        )}
      </div>

      <form className="mt-3 grid gap-2.5 lg:grid-cols-[minmax(120px,150px)_minmax(140px,180px)_minmax(0,1fr)_auto] lg:items-stretch" onSubmit={handleSubmit}>
        <div className="grid min-h-12 gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <strong className="mt-[5px] text-sm font-black text-slate-950">{currentUserName}</strong>
        </div>
        <select
          className="min-h-12 rounded-xl !border !border-slate-200 !bg-white px-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:!border-amber-500 focus:ring-4 focus:ring-amber-100 focus-visible:!outline-none"
          name="targetDept"
        >
          {departments.map((department) => (
            <option key={department.name} value={department.name}>{department.name}</option>
          ))}
        </select>
        <input
          className="min-h-12 rounded-xl !border !border-slate-200 !bg-white px-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:!border-amber-500 focus:ring-4 focus:ring-amber-100 focus-visible:!outline-none"
          name="text"
          placeholder="Issue details..."
        />
        <button
          className="min-h-12 rounded-xl !border-0 !bg-amber-500 px-4 text-sm font-black !text-white shadow-sm transition hover:!bg-amber-600 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
          type="submit"
        >
          Open
        </button>
      </form>
      <p className="m-0 mt-3 text-sm font-semibold text-slate-500">Opened as {currentDept}</p>
    </section>
  )
}

export default IssuePanel
