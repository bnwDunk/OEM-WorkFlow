import type { FormEvent } from 'react'
import { departments } from '../../data/oemWorkflow'
import type { IssueItem } from '../../data/oemWorkflow'

type IssuePanelProps = {
  currentDept: string
  issues: IssueItem[]
  onAddIssue: (payload: { openedBy: string; targetDept: string; text: string }) => void
  onCloseIssue: (issueIndex: number) => void
}

function IssuePanel({ currentDept, issues, onAddIssue, onCloseIssue }: IssuePanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const openedBy = String(data.get('openedBy') || '').trim()
    const targetDept = String(data.get('targetDept') || departments[0].name)
    const text = String(data.get('text') || '').trim()

    if (!openedBy || !text) return

    onAddIssue({ openedBy, targetDept, text })
    form.reset()
  }

  return (
    <section className="panel">
      <h4>Ticket ข้ามฝ่าย</h4>
      {issues.length === 0 ? (
        <p className="empty-note">ไม่มี Ticket ข้ามฝ่ายตอนนี้</p>
      ) : (
        issues.map((issue, index) => {
          const canClose = !issue.closed && [issue.openedByDept, issue.targetDept].includes(currentDept)

          return (
            <article className={`issue-item ${issue.closed ? 'closed' : ''}`} key={`${issue.text}-${issue.time}`}>
              <div className="issue-top">
                <span>ถึง {issue.targetDept}</span>
                {canClose && (
                  <button onClick={() => onCloseIssue(index)} type="button">
                    ปิดเรื่อง
                  </button>
                )}
              </div>
              <small>เปิดโดย {issue.openedBy} ({issue.openedByDept})</small>
              <p>{issue.text}</p>
            </article>
          )
        })
      )}

      <form className="issue-form" onSubmit={handleSubmit}>
        <input name="openedBy" placeholder="ชื่อผู้เปิด" />
        <select name="targetDept">
          {departments.map((department) => (
            <option key={department.name} value={department.name}>{department.name}</option>
          ))}
        </select>
        <input name="text" placeholder="รายละเอียด..." />
        <button type="submit">ส่ง</button>
      </form>
    </section>
  )
}

export default IssuePanel
