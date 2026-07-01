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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-xl font-black text-slate-950">Ticket ข้ามฝ่าย</h4>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">เปิดประเด็นให้แผนกอื่นช่วยตรวจสอบหรือดำเนินการต่อ</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{issues.length} tickets</span>
      </div>

      <div className="grid gap-3">
        {issues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
            ไม่มี Ticket ข้ามฝ่ายตอนนี้
          </div>
        ) : (
          issues.map((issue, index) => {
            const canClose = !issue.closed && [issue.openedByDept, issue.targetDept].some((department) => userDepartments.includes(department))

            return (
              <article
                className={`rounded-xl border p-4 transition ${issue.closed ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-teal-100 bg-teal-50/50'}`}
                key={`${issue.text}-${issue.time}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-800 shadow-sm">ถึง {issue.targetDept}</span>
                  {canClose && (
                    <button
                      className="min-h-9 rounded-lg !border-0 !bg-white px-3 text-xs font-black !text-slate-700 shadow-sm transition hover:!bg-slate-100"
                      onClick={() => onCloseIssue(index)}
                      type="button"
                    >
                      ปิดเรื่อง
                    </button>
                  )}
                </div>
                <small className="mt-3 block text-xs font-bold text-slate-500">
                  เปิดโดย {issue.openedBy} ({issue.openedByDept})
                </small>
                <p className="m-0 mt-2 text-sm font-semibold text-slate-800">{issue.text}</p>
              </article>
            )
          })
        )}
      </div>

      <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(120px,150px)_minmax(140px,180px)_minmax(0,1fr)_auto] lg:items-stretch" onSubmit={handleSubmit}>
        <div className="grid min-h-14 gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Opened by</span>
          <strong className="text-sm font-black text-slate-950">{currentUserName}</strong>
        </div>
        <select
          className="min-h-14 rounded-xl !border !border-slate-200 !bg-white px-4 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
          name="targetDept"
        >
          {departments.map((department) => (
            <option key={department.name} value={department.name}>{department.name}</option>
          ))}
        </select>
        <input
          className="min-h-14 rounded-xl !border !border-slate-200 !bg-white px-4 text-base font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
          name="text"
          placeholder="รายละเอียด..."
        />
        <button
          className="min-h-14 rounded-xl !border-0 !bg-teal-700 px-5 text-sm font-black !text-white shadow-sm transition hover:!bg-teal-800 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
          type="submit"
        >
          ส่ง
        </button>
      </form>
      <p className="m-0 mt-3 text-sm font-semibold text-slate-500">เปิดในนามแผนก {currentDept}</p>
    </section>
  )
}

export default IssuePanel
