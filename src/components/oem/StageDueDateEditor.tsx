import type { CustomerWorkflowTemplate } from '../../data/oemWorkflow'

type StageDueDateEditorProps = {
  className?: string
  description?: string
  disabled?: boolean
  onChange: (stageId: number, dueDate: string) => void
  values: Record<number, string>
  workflowTemplate?: CustomerWorkflowTemplate
}

function getDaysLeft(dueDate: string) {
  if (!dueDate) return ''

  const due = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return String(Math.ceil((due.getTime() - today.getTime()) / 86_400_000))
}

function StageDueDateEditor({
  className = '',
  description = 'กำหนดวันครบกำหนดแยกสำหรับแต่ละ Stage',
  disabled = false,
  onChange,
  values,
  workflowTemplate,
}: StageDueDateEditorProps) {
  return (
    <section className={`rounded-2xl border border-teal-100 bg-teal-50/40 p-4 sm:p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="m-0 text-base font-black text-slate-900">Stage by Due Date</h3>
        <p className="m-0 mt-1 text-xs font-semibold text-slate-500">{description}</p>
      </div>

      {workflowTemplate ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflowTemplate.stages.map((stage, stageIndex) => (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={stage.id || `${stage.name}-${stageIndex}`}>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-teal-700">Stage {stageIndex + 1}</span>
                <p className="m-0 mt-1 truncate text-sm font-black text-slate-800" title={stage.name}>{stage.name}</p>
              </div>
              {stage.id ? (
                <div className="grid grid-cols-[minmax(0,1fr)_82px] gap-2">
                  <label className="grid gap-1 text-xs font-black text-slate-600">
                    <span>Due Date</span>
                    <input
                      className="h-11 min-w-0 rounded-lg !border !border-slate-200 !bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={disabled}
                      onChange={(event) => onChange(stage.id as number, event.target.value)}
                      type="date"
                      value={values[stage.id] || ''}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-slate-600">
                    <span>Days Left</span>
                    <input
                      className="h-11 min-w-0 rounded-lg !border !border-slate-200 !bg-slate-100 px-2 text-center text-sm font-bold text-slate-500 outline-none"
                      readOnly
                      value={getDaysLeft(values[stage.id] || '') || '-'}
                    />
                  </label>
                </div>
              ) : (
                <p className="m-0 text-xs font-bold text-amber-700">กำลังโหลดข้อมูล Stage...</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          กำลังโหลดโครงสร้าง Stage ของ Flow ที่เลือก...
        </p>
      )}
    </section>
  )
}

export default StageDueDateEditor
