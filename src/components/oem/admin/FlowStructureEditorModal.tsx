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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="grid max-h-[calc(100vh-64px)] w-full max-w-[900px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="m-0 text-[17px] font-bold text-slate-950">{structure.flow.name}</h3>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">Edit stages, phases, and department ownership for this flow.</p>
          </div>
          <button className="min-h-8 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100" onClick={onAddStage} type="button">+ Add Stage</button>
        </div>

        <div className="overflow-auto py-3">
          {structure.stages.map((stage, stageIndex) => (
            <section className="border-b border-slate-200 last:border-b-0" key={stage.id || `stage-${stageIndex}`}>
              <div className="grid grid-cols-[22px_auto_minmax(0,1fr)_auto] items-center gap-0 bg-slate-50 px-4 py-2.5 transition hover:bg-slate-100">
                <span className="text-[15px] font-bold leading-none text-slate-700">▾</span>
                <span className="mr-2 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-white">S{stageIndex + 1}</span>
                <label className="min-w-0">
                  <span className="sr-only">Stage name</span>
                  <input
                    aria-label={`Stage ${stageIndex + 1} name`}
                    className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-[13.5px] font-semibold text-slate-950 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white"
                    onChange={(event) => onUpdateStage(stageIndex, { name: event.target.value })}
                    value={stage.name}
                  />
                </label>
                <button
                  className="ml-3 min-h-7 rounded border border-rose-200 bg-rose-50 px-2.5 text-[11.5px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={structure.stages.length <= 1}
                  onClick={() => onRemoveStage(stageIndex)}
                  type="button"
                >
                  Delete Stage
                </button>
              </div>

              <div>
                {stage.phases.map((phase, phaseIndex) => (
                  <div className="border-t border-slate-100" key={phase.id || `phase-${phaseIndex}`}>
                    <div className="grid grid-cols-[58px_76px_minmax(240px,1fr)_minmax(180px,auto)_auto] items-center gap-2 px-4 py-2 pl-9 transition hover:bg-teal-50/40 max-[900px]:grid-cols-1 max-[900px]:pl-4">
                      <span className="text-[15px] font-bold leading-none text-slate-500 max-[900px]:hidden">▸</span>
                      <label>
                        <span className="sr-only">Phase label</span>
                        <input
                          aria-label={`Phase ${phaseIndex + 1} label`}
                          className="h-8 w-full rounded border border-transparent bg-teal-50 px-2 text-center text-[11px] font-bold text-[#00a99d] outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white"
                          onChange={(event) => onUpdatePhase(stageIndex, phaseIndex, { label: event.target.value })}
                          value={phase.label}
                        />
                      </label>
                      <label className="min-w-0">
                        <span className="sr-only">Phase name</span>
                        <input
                          aria-label={`Phase ${phaseIndex + 1} name`}
                          className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-[13px] font-medium text-slate-900 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white"
                          onChange={(event) => onUpdatePhase(stageIndex, phaseIndex, { name: event.target.value })}
                          value={phase.name}
                        />
                      </label>
                      <div className="flex min-h-8 flex-wrap items-center gap-1.5" aria-label={`Departments for ${phase.name}`}>
                        {(phase.departmentIds || []).map((departmentId) => {
                          const department = departments.find((item) => item.id === departmentId)
                          if (!department) return null

                          return (
                            <span className="inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-slate-50 pl-2 text-[11px] font-semibold text-slate-700" key={department.id}>
                              {department.name}
                              <button
                                aria-label={`Remove ${department.name}`}
                                className="ml-1 min-h-5 w-5 border-0 bg-transparent p-0 text-[10px] leading-none text-slate-400 transition hover:text-rose-600"
                                onClick={() => onRemovePhaseDepartment(stageIndex, phaseIndex, department.id)}
                                type="button"
                              >
                                x
                              </button>
                            </span>
                          )
                        })}
                        <select
                          className="h-7 rounded border border-dashed border-slate-300 bg-transparent px-2 text-[11.5px] font-medium text-slate-500 outline-none transition focus:border-[#00a99d] focus:border-solid focus:bg-white"
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
                        {(phase.departmentIds || []).length === 0 && (
                          <span className="text-[11.5px] font-medium text-slate-400">No department</span>
                        )}
                      </div>
                      <button className="min-h-7 rounded border border-rose-200 bg-rose-50 px-2.5 text-[11.5px] font-semibold text-rose-700 transition hover:bg-rose-100" onClick={() => onRemovePhase(stageIndex, phaseIndex)} type="button">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-slate-100 px-4 py-2 pl-9">
                  <button className="min-h-8 rounded border border-slate-200 bg-slate-50 px-3 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-100" onClick={() => onAddPhase(stageIndex)} type="button">+ Add Phase</button>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={onClose} type="button">Close</button>
          <button className="min-h-9 rounded-md border-0 bg-[#00a99d] px-4 text-[13px] font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={onSave} type="button">
            {busyAction.startsWith('flow-structure-save') ? 'Saving...' : 'Save structure'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default FlowStructureEditorModal
