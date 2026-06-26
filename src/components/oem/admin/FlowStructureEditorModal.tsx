import type { ManagedDepartment, ManagedFlow } from '../../../data/adminDashboard'

export type FlowPhaseDraft = {
  id?: number
  label: string
  name: string
  departments?: Pick<ManagedDepartment, 'id' | 'name'>[]
  departmentIds?: number[]
}

export type FlowStageDraft = {
  id?: number
  name: string
  phases: FlowPhaseDraft[]
}

export type FlowStructure = {
  flow: Pick<ManagedFlow, 'id' | 'name'>
  stages: FlowStageDraft[]
}

type FlowStructureEditorModalProps = {
  busyAction: string
  departments: ManagedDepartment[]
  structure: FlowStructure
  onAddPhase: (stageIndex: number) => void
  onAddPhaseDepartment: (stageIndex: number, phaseIndex: number, departmentId: number) => void
  onAddStage: () => void
  onClose: () => void
  onRemovePhase: (stageIndex: number, phaseIndex: number) => void
  onRemovePhaseDepartment: (stageIndex: number, phaseIndex: number, departmentId: number) => void
  onRemoveStage: (stageIndex: number) => void
  onSave: () => void
  onUpdatePhase: (stageIndex: number, phaseIndex: number, patch: Partial<FlowPhaseDraft>) => void
  onUpdateStage: (stageIndex: number, patch: Partial<FlowStageDraft>) => void
}

function FlowStructureEditorModal({
  busyAction,
  departments,
  structure,
  onAddPhase,
  onAddPhaseDepartment,
  onAddStage,
  onClose,
  onRemovePhase,
  onRemovePhaseDepartment,
  onRemoveStage,
  onSave,
  onUpdatePhase,
  onUpdateStage,
}: FlowStructureEditorModalProps) {
  const busy = Boolean(busyAction)

  return (
    <div
      className="flow-structure-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="flow-structure-modal grid max-h-[calc(100vh-24px)] w-[min(1480px,calc(100vw-32px))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flow-structure-head sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h3 className="m-0 text-xl font-extrabold text-slate-950">{structure.flow.name}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Edit stages, phases, and department ownership for this flow.</p>
          </div>
          <button className="min-h-11 rounded-lg border-0 bg-teal-700 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800" onClick={onAddStage} type="button">Add stage</button>
        </div>

        <div className="flow-structure-body grid gap-4 overflow-auto bg-slate-100/70 p-5">
          {structure.stages.map((stage, stageIndex) => (
            <section className="flow-stage-card grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={stage.id || `stage-${stageIndex}`}>
              <div className="flow-stage-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-white">Stage {stageIndex + 1}</span>
                <label className="grid gap-1">
                  <span className="sr-only">Stage name</span>
                  <input
                    aria-label={`Stage ${stageIndex + 1} name`}
                    className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-extrabold text-slate-950 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => onUpdateStage(stageIndex, { name: event.target.value })}
                    value={stage.name}
                  />
                </label>
                <button
                  className="min-h-11 rounded-lg border border-red-100 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={structure.stages.length <= 1}
                  onClick={() => onRemoveStage(stageIndex)}
                  type="button"
                >
                  Delete stage
                </button>
              </div>

              <div className="grid gap-3">
                {stage.phases.map((phase, phaseIndex) => (
                  <div className="flow-phase-card grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]" key={phase.id || `phase-${phaseIndex}`}>
                    <div className="flow-phase-main grid grid-cols-[104px_minmax(360px,1fr)_116px] items-end gap-3">
                      <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Phase
                        <input
                          aria-label={`Phase ${phaseIndex + 1} label`}
                          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-extrabold text-slate-950 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
                          onChange={(event) => onUpdatePhase(stageIndex, phaseIndex, { label: event.target.value })}
                          value={phase.label}
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Name
                        <input
                          aria-label={`Phase ${phaseIndex + 1} name`}
                          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-extrabold text-slate-950 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
                          onChange={(event) => onUpdatePhase(stageIndex, phaseIndex, { name: event.target.value })}
                          value={phase.name}
                        />
                      </label>
                      <button className="min-h-11 rounded-lg border border-red-100 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100" onClick={() => onRemovePhase(stageIndex, phaseIndex)} type="button">
                        Delete
                      </button>
                    </div>
                    <div className="flow-phase-depts grid grid-cols-[minmax(220px,320px)_minmax(0,1fr)] items-start gap-3" aria-label={`Departments for ${phase.name}`}>
                      <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Departments
                        <select
                          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-extrabold text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
                          onChange={(event) => {
                            onAddPhaseDepartment(stageIndex, phaseIndex, Number(event.target.value))
                            event.currentTarget.value = ''
                          }}
                          value=""
                        >
                          <option value="">Add department...</option>
                          {departments
                            .filter((department) => !(phase.departmentIds || []).includes(department.id))
                            .map((department) => (
                              <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                      </label>
                      <div className="flex min-h-11 flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        {(phase.departmentIds || []).map((departmentId) => {
                          const department = departments.find((item) => item.id === departmentId)
                          if (!department) return null

                          return (
                            <span className="inline-flex min-h-8 items-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 pl-3 text-xs font-extrabold text-emerald-700" key={department.id}>
                              {department.name}
                              <button
                                aria-label={`Remove ${department.name}`}
                                className="ml-2 min-h-8 w-8 border-0 border-l border-emerald-200 bg-emerald-100 p-0 text-sm leading-none text-emerald-800 transition hover:bg-emerald-200"
                                onClick={() => onRemovePhaseDepartment(stageIndex, phaseIndex, department.id)}
                                type="button"
                              >
                                x
                              </button>
                            </span>
                          )
                        })}
                        {(phase.departmentIds || []).length === 0 && (
                          <span className="self-center px-2 text-xs font-extrabold text-slate-500">Choose at least one department</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button className="min-h-10 justify-self-start rounded-lg border border-teal-200 bg-teal-50 px-4 text-sm font-extrabold text-teal-800 transition hover:bg-teal-100" onClick={() => onAddPhase(stageIndex)} type="button">Add phase</button>
              </div>
            </section>
          ))}
        </div>

        <div className="flow-structure-actions sticky bottom-0 z-10 flex justify-end gap-2 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <button className="min-h-11 rounded-lg border border-slate-200 bg-white px-5 font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={onClose} type="button">Cancel</button>
          <button className="min-h-11 rounded-lg border-0 bg-teal-700 px-5 font-extrabold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={onSave} type="button">
            {busyAction.startsWith('flow-structure-save') ? 'Saving...' : 'Save structure'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default FlowStructureEditorModal
