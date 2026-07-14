import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { ManagedDepartment, ManagedFlow } from '../../../data/adminDashboard'

export type FlowWorkItemDraft = {
  id?: number
  label: string
}

export type FlowBranchDraft = {
  department?: Pick<ManagedDepartment, 'id' | 'name'>
  departmentId?: number
  departmentName?: string
  id?: number
  items?: FlowWorkItemDraft[]
}

export type FlowPhaseDraft = {
  id?: number
  branches?: FlowBranchDraft[]
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
  onAddBranchItem: (stageIndex: number, phaseIndex: number, branchIndex: number) => void
  onAddPhase: (stageIndex: number) => void
  onAddPhaseDepartment: (stageIndex: number, phaseIndex: number, departmentId: number) => void
  onAddStage: () => void
  onClose: () => void
  onRemoveBranchItem: (stageIndex: number, phaseIndex: number, branchIndex: number, itemIndex: number) => void
  onRemovePhase: (stageIndex: number, phaseIndex: number) => void
  onRemovePhaseDepartment: (stageIndex: number, phaseIndex: number, departmentId: number) => void
  onRemoveStage: (stageIndex: number) => void
  onSave: () => void
  onSaveBranchItems: (stageIndex: number, phaseIndex: number, branchIndex: number) => void
  onUpdateBranchItem: (stageIndex: number, phaseIndex: number, branchIndex: number, itemIndex: number, label: string) => void
  onUpdatePhase: (stageIndex: number, phaseIndex: number, patch: Partial<FlowPhaseDraft>) => void
  onUpdateStage: (stageIndex: number, patch: Partial<FlowStageDraft>) => void
}

function toggleCollapsed(setter: Dispatch<SetStateAction<Set<string>>>, key: string) {
  setter((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
}

function FlowStructureEditorModal({
  busyAction,
  departments,
  structure,
  onAddBranchItem,
  onAddPhase,
  onAddPhaseDepartment,
  onAddStage,
  onClose,
  onRemoveBranchItem,
  onRemovePhase,
  onRemovePhaseDepartment,
  onRemoveStage,
  onSave,
  onSaveBranchItems,
  onUpdateBranchItem,
  onUpdatePhase,
  onUpdateStage,
}: FlowStructureEditorModalProps) {
  const busy = Boolean(busyAction)
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(() => new Set())
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(() => new Set())

  return (
    <div
      className="admin-flow-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="admin-flow-modal grid max-h-[calc(100vh-64px)] w-full max-w-[900px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="admin-flow-head grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="m-0 text-[17px] font-bold text-slate-950">{structure.flow.name}</h3>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">Edit stages, phases, department ownership, and checklist items for this flow.</p>
          </div>
          <button className="admin-flow-btn admin-flow-btn-secondary min-h-8 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100" onClick={onAddStage} type="button">
            + Add Stage
          </button>
        </div>

        <div className="admin-flow-body overflow-auto py-3">
          {structure.stages.map((stage, stageIndex) => {
            const stageKey = `${structure.flow.id}-stage-${stage.id || stageIndex}`
            const stageCollapsed = collapsedStages.has(stageKey)

            return (
              <section className="admin-flow-stage border-b border-slate-200 last:border-b-0" key={stage.id || `stage-${stageIndex}`}>
                <div
                  className="admin-flow-collapse-row admin-flow-stage-head grid grid-cols-[22px_auto_minmax(0,1fr)_auto] items-center gap-0 bg-slate-50 px-4 py-2.5 transition hover:bg-slate-100"
                  onClick={() => toggleCollapsed(setCollapsedStages, stageKey)}
                >
                  <button
                    aria-expanded={!stageCollapsed}
                    aria-label={`${stageCollapsed ? 'Open' : 'Close'} ${stage.name}`}
                    className="config-toggle-btn"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleCollapsed(setCollapsedStages, stageKey)
                    }}
                    type="button"
                  >
                    {stageCollapsed ? '▶' : '▼'}
                  </button>
                  <span className="admin-flow-stage-pill mr-2 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-white">S{stageIndex + 1}</span>
                  <label className="min-w-0">
                    <span className="sr-only">Stage name</span>
                    <input
                      aria-label={`Stage ${stageIndex + 1} name`}
                      className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-[13.5px] font-semibold text-slate-950 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onUpdateStage(stageIndex, { name: event.target.value })}
                      value={stage.name}
                    />
                  </label>
                  <button
                    className="admin-flow-btn admin-flow-btn-danger ml-3 min-h-7 rounded border border-rose-200 bg-rose-50 px-2.5 text-[11.5px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={structure.stages.length <= 1}
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemoveStage(stageIndex)
                    }}
                    type="button"
                  >
                    Delete Stage
                  </button>
                </div>

                {!stageCollapsed && (
                  <div>
                    {stage.phases.map((phase, phaseIndex) => {
                      const phaseKey = `${stageKey}-phase-${phase.id || phaseIndex}`
                      const phaseCollapsed = collapsedPhases.has(phaseKey)

                      return (
                        <div className="admin-flow-phase border-t border-slate-100" key={phase.id || `phase-${phaseIndex}`}>
                          <div
                            className="admin-flow-collapse-row admin-flow-phase-head grid grid-cols-[58px_76px_minmax(240px,1fr)_minmax(180px,auto)_auto] items-center gap-2 px-4 py-2 pl-9 transition hover:bg-teal-50/40 max-[900px]:grid-cols-1 max-[900px]:pl-4"
                            onClick={() => toggleCollapsed(setCollapsedPhases, phaseKey)}
                          >
                            <button
                              aria-expanded={!phaseCollapsed}
                              aria-label={`${phaseCollapsed ? 'Open' : 'Close'} ${phase.name}`}
                              className="config-toggle-btn"
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleCollapsed(setCollapsedPhases, phaseKey)
                              }}
                              type="button"
                            >
                              {phaseCollapsed ? '▶' : '▼'}
                            </button>
                            <label>
                              <span className="sr-only">Phase label</span>
                              <input
                                aria-label={`Phase ${phaseIndex + 1} label`}
                                className="h-8 w-full rounded border border-transparent bg-teal-50 px-2 text-center text-[11px] font-bold text-[#00a99d] outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white"
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => onUpdatePhase(stageIndex, phaseIndex, { label: event.target.value })}
                                value={phase.label}
                              />
                            </label>
                            <label className="min-w-0">
                              <span className="sr-only">Phase name</span>
                              <input
                                aria-label={`Phase ${phaseIndex + 1} name`}
                                className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-[13px] font-medium text-slate-900 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white"
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => onUpdatePhase(stageIndex, phaseIndex, { name: event.target.value })}
                                value={phase.name}
                              />
                            </label>
                            <div className="flex min-h-8 flex-wrap items-center gap-1.5" aria-label={`Departments for ${phase.name}`} onClick={(event) => event.stopPropagation()}>
                              {(phase.departmentIds || []).map((departmentId) => {
                                const department = departments.find((item) => item.id === departmentId)
                                if (!department) return null

                                return (
                                  <span className="admin-flow-dept-chip inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-slate-50 pl-2 text-[11px] font-semibold text-slate-700" key={department.id}>
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
                            <button
                              className="admin-flow-btn admin-flow-btn-danger min-h-7 rounded border border-rose-200 bg-rose-50 px-2.5 text-[11.5px] font-semibold text-rose-700 transition hover:bg-rose-100"
                              onClick={(event) => {
                                event.stopPropagation()
                                onRemovePhase(stageIndex, phaseIndex)
                              }}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>

                          {!phaseCollapsed && (
                            <div className="admin-flow-checklist border-t border-slate-100 bg-slate-50/60 px-4 pb-3 pl-[52px] pt-1 max-[900px]:pl-4">
                              {(phase.branches || []).map((branch, branchIndex) => {
                                const branchDepartmentId = branch.departmentId || branch.department?.id
                                const branchDepartmentName = branch.departmentName || branch.department?.name || departments.find((department) => department.id === branchDepartmentId)?.name || 'Department'
                                const branchBusy = busyAction === `flow-branch-items-${branch.id}`

                                return (
                                  <div className="admin-flow-branch mt-3" key={branch.id || `${branchDepartmentName}-${branchIndex}`}>
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                      <span className="admin-flow-branch-chip rounded-full bg-teal-50 px-3 py-1 text-[11.5px] font-semibold text-[#00a99d]">{branchDepartmentName}</span>
                                    </div>
                                    <div>
                                      {(branch.items || []).map((item, itemIndex) => (
                                        <div className="admin-flow-check-item flex items-center gap-2 border-b border-slate-100 py-1 last:border-b-0" key={item.id || `${branchDepartmentName}-item-${itemIndex}`}>
                                          <span className="text-xs text-slate-400">□</span>
                                          <input
                                            aria-label={`Checklist ${itemIndex + 1} for ${branchDepartmentName}`}
                                            className="h-8 flex-1 rounded border border-transparent bg-transparent px-2 text-[12.5px] font-medium text-slate-800 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white"
                                            disabled={branchBusy}
                                            onChange={(event) => onUpdateBranchItem(stageIndex, phaseIndex, branchIndex, itemIndex, event.target.value)}
                                            value={item.label}
                                          />
                                          <button
                                            className="border-0 bg-transparent px-1 text-sm text-slate-300 transition hover:text-rose-600"
                                            disabled={branchBusy}
                                            onClick={() => onRemoveBranchItem(stageIndex, phaseIndex, branchIndex, itemIndex)}
                                            type="button"
                                          >
                                            x
                                          </button>
                                        </div>
                                      ))}
                                      {(branch.items || []).length === 0 && (
                                        <p className="m-0 py-2 text-[12px] font-semibold text-slate-400">No checklist yet.</p>
                                      )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button className="admin-flow-btn admin-flow-btn-secondary min-h-7 rounded border border-slate-200 bg-slate-50 px-2.5 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-100" disabled={branchBusy} onClick={() => onAddBranchItem(stageIndex, phaseIndex, branchIndex)} type="button">
                                        + Add checklist
                                      </button>
                                      <button className="admin-flow-btn admin-flow-btn-primary min-h-7 rounded border-0 bg-[#00a99d] px-2.5 text-[11.5px] font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40" disabled={!branch.id || branchBusy} onClick={() => onSaveBranchItems(stageIndex, phaseIndex, branchIndex)} type="button">
                                        {branchBusy ? 'Saving...' : 'Update checklist'}
                                      </button>
                                    </div>
                                    {!branch.id && <p className="m-0 mt-1 text-[11.5px] font-medium text-amber-600">Save structure to create this department checklist.</p>}
                                  </div>
                                )
                              })}
                              {(phase.branches || []).length === 0 && (
                                <p className="m-0 py-3 text-[12px] font-semibold text-slate-400">No checklist branch found for this phase.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div className="border-t border-slate-100 px-4 py-2 pl-9">
                      <button className="admin-flow-btn admin-flow-btn-secondary min-h-8 rounded border border-slate-200 bg-slate-50 px-3 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-100" onClick={() => onAddPhase(stageIndex)} type="button">
                        + Add Phase
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="admin-flow-foot flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button className="admin-flow-btn admin-flow-btn-secondary min-h-9 rounded-md border border-slate-200 bg-slate-50 px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={onClose} type="button">
            Close
          </button>
          <button className="admin-flow-btn admin-flow-btn-primary min-h-9 rounded-md border-0 bg-[#00a99d] px-4 text-[13px] font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={onSave} type="button">
            {busyAction.startsWith('flow-structure-save') ? 'Saving...' : 'Save structure'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default FlowStructureEditorModal
