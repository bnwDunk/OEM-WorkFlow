import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { normalizeStagePhaseLabels } from '../../data/oemWorkflow'
import { apiRequest } from '../../lib/api'

type ConfigViewProps = {
  accessToken: string
  currentDept: string
  departments: string[]
  onWorkflowTemplateChange?: () => Promise<void> | void
}

type WorkflowOption = {
  code?: string
  id: number
  name: string
  phaseCount?: number
  stageCount?: number
  status?: string
}

type FlowStructureResponse = {
  flow: {
    id: number
    name: string
  }
  stages: {
    id?: number
    name: string
    phases: {
      branches?: {
        department?: { id: number; name: string }
        departmentId: number
        departmentName: string
        id: number
        items: {
          id: number
          label: string
          sortOrder?: number
        }[]
      }[]
      id: number
      label: string
      name: string
    }[]
  }[]
}

type ConfigWorkItem = {
  id?: number
  label: string
}

type ConfigBranch = {
  departmentId?: number
  dept: string
  id?: number
  items: ConfigWorkItem[]
}

type ConfigStop = {
  id?: number
  branches: ConfigBranch[]
  label: string
  name: string
}

type ConfigStage = {
  id?: number
  name: string
  stops: ConfigStop[]
}

function normalizeDept(value: string) {
  return value.trim().toLowerCase()
}

function mapStructureToTemplate(structure: FlowStructureResponse) {
  return structure.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    stops: normalizeStagePhaseLabels(stage.phases).map((phase) => ({
      id: phase.id,
      branches: (phase.branches || []).map((branch) => ({
        departmentId: branch.departmentId || branch.department?.id,
        dept: branch.departmentName || branch.department?.name || '',
        id: branch.id,
        items: branch.items.map((item) => ({
          id: item.id,
          label: item.label,
        })),
      })),
      label: phase.label,
      name: phase.name,
    })),
  }))
}

function ConfigView({ accessToken, currentDept, departments, onWorkflowTemplateChange }: ConfigViewProps) {
  const [workflowTemplates, setWorkflowTemplates] = useState<Record<string, ConfigStage[]>>({})
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOption[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [savingBranchId, setSavingBranchId] = useState<number | null>(null)
  const [dirtyBranchIds, setDirtyBranchIds] = useState<Set<number>>(() => new Set())
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(() => new Set())
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(() => new Set())
  const [workflowError, setWorkflowError] = useState('')
  const workflowStages = useMemo(
    () => selectedWorkflowId === null ? [] : workflowTemplates[String(selectedWorkflowId)] || [],
    [selectedWorkflowId, workflowTemplates],
  )
  const selectedWorkflow = workflowOptions.find((flow) => flow.id === selectedWorkflowId) || null

  const editableDept = useMemo(() => {
    const current = departments.find((department) => normalizeDept(department) === normalizeDept(currentDept))
    return current || departments[0] || currentDept
  }, [currentDept, departments])

  const templateSummary = useMemo(() => {
    const phaseCount = workflowStages.reduce((total, stage) => total + stage.stops.length, 0)
    const editableWorkCount = workflowStages.reduce(
      (total, stage) =>
        total + stage.stops.reduce(
          (stageTotal, stop) =>
            stageTotal + stop.branches.reduce(
              (branchTotal, branch) =>
                normalizeDept(branch.dept) === normalizeDept(editableDept)
                  ? branchTotal + branch.items.length
                  : branchTotal,
              0,
            ),
          0,
        ),
      0,
    )

    return { editableWorkCount, phaseCount }
  }, [editableDept, workflowStages])

  useEffect(() => {
    let active = true

    async function loadWorkflowOptions() {
      try {
        setLoadingWorkflows(true)
        setWorkflowError('')

        const response = await apiRequest<{ flows: WorkflowOption[] }>('/workflow/flows', { token: accessToken })

        if (!active) return

        setWorkflowOptions(response.flows)
        setSelectedWorkflowId((current) =>
          current !== null && response.flows.some((flow) => flow.id === current)
            ? current
            : response.flows[0]?.id ?? null,
        )
      } catch (error) {
        if (!active) return
        setWorkflowOptions([])
        setSelectedWorkflowId(null)
        setWorkflowError(error instanceof Error ? error.message : 'Unable to load workflows.')
      } finally {
        if (active) setLoadingWorkflows(false)
      }
    }

    void loadWorkflowOptions()

    return () => {
      active = false
    }
  }, [accessToken])

  useEffect(() => {
    if (selectedWorkflowId === null || workflowTemplates[String(selectedWorkflowId)]) return

    let active = true

    async function loadWorkflowStructure() {
      try {
        setLoadingWorkflows(true)
        setWorkflowError('')

        const response = await apiRequest<FlowStructureResponse>(`/workflow/flows/${selectedWorkflowId}/structure`, { token: accessToken })

        if (!active) return

        setWorkflowTemplates((current) => ({
          ...current,
          [String(selectedWorkflowId)]: mapStructureToTemplate(response),
        }))
      } catch (error) {
        if (!active) return
        setWorkflowTemplates((current) => ({
          ...current,
          [String(selectedWorkflowId)]: [],
        }))
        setWorkflowError(error instanceof Error ? error.message : 'Unable to load workflow structure.')
      } finally {
        if (active) setLoadingWorkflows(false)
      }
    }

    void loadWorkflowStructure()

    return () => {
      active = false
    }
  }, [accessToken, selectedWorkflowId, workflowTemplates])

  function setSelectedWorkflowStages(updater: (current: ConfigStage[]) => ConfigStage[]) {
    if (selectedWorkflowId === null) return

    setWorkflowTemplates((current) => ({
      ...current,
      [String(selectedWorkflowId)]: updater(current[String(selectedWorkflowId)] || []),
    }))
  }

  function markBranchDirty(branchId: number | undefined) {
    if (!branchId) return
    setDirtyBranchIds((current) => new Set(current).add(branchId))
  }

  function toggleCollapsed(setter: Dispatch<SetStateAction<Set<string>>>, key: string) {
    setter((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function saveBranch(stageIndex: number, stopIndex: number, branchIndex: number, nextItems?: ConfigWorkItem[]) {
    if (selectedWorkflowId === null) return

    const stop = workflowStages[stageIndex]?.stops[stopIndex]
    const branch = stop?.branches[branchIndex]
    if (!stop?.id || !branch?.id) return
    const branchId = branch.id

    const items = nextItems || branch.items

    try {
      setWorkflowError('')
      setSavingBranchId(branchId)
      const response = await apiRequest<{ items: ConfigWorkItem[] }>(
        `/workflow/flows/${selectedWorkflowId}/phases/${stop.id}/branches/${branch.id}/items`,
        {
          method: 'PUT',
          token: accessToken,
          body: JSON.stringify({ items }),
        },
      )

      setSelectedWorkflowStages((current) =>
        current.map((stage, currentStageIndex) =>
          currentStageIndex !== stageIndex
            ? stage
            : {
                ...stage,
                stops: stage.stops.map((currentStop, currentStopIndex) =>
                  currentStopIndex !== stopIndex
                    ? currentStop
                    : {
                        ...currentStop,
                        branches: currentStop.branches.map((currentBranch, currentBranchIndex) =>
                          currentBranchIndex === branchIndex
                            ? { ...currentBranch, items: response.items }
                            : currentBranch,
                        ),
                      },
                ),
          },
        ),
      )
      setDirtyBranchIds((current) => {
        const next = new Set(current)
        next.delete(branchId)
        return next
      })
      await onWorkflowTemplateChange?.()
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'Unable to save workflow work.')
    } finally {
      setSavingBranchId(null)
    }
  }

  function updateWork(stageIndex: number, stopIndex: number, branchIndex: number, itemIndex: number, value: string) {
    markBranchDirty(workflowStages[stageIndex]?.stops[stopIndex]?.branches[branchIndex]?.id)
    setSelectedWorkflowStages((current) =>
      current.map((stage, currentStageIndex) =>
        currentStageIndex !== stageIndex
          ? stage
          : {
              ...stage,
              stops: stage.stops.map((stop, currentStopIndex) =>
                currentStopIndex !== stopIndex
                  ? stop
                  : {
                      ...stop,
                      branches: stop.branches.map((branch, currentBranchIndex) =>
                        currentBranchIndex !== branchIndex
                          ? branch
                          : {
                              ...branch,
                              items: branch.items.map((item, currentItemIndex) =>
                                currentItemIndex === itemIndex ? { ...item, label: value } : item,
                              ),
                            },
                      ),
                    },
              ),
            },
      ),
    )
  }

  function addWork(stageIndex: number, stopIndex: number, branchIndex: number) {
    markBranchDirty(workflowStages[stageIndex]?.stops[stopIndex]?.branches[branchIndex]?.id)

    setSelectedWorkflowStages((current) =>
      current.map((stage, currentStageIndex) =>
        currentStageIndex !== stageIndex
          ? stage
          : {
              ...stage,
              stops: stage.stops.map((stop, currentStopIndex) =>
                currentStopIndex !== stopIndex
                  ? stop
                  : {
                      ...stop,
                      branches: stop.branches.map((branch, currentBranchIndex) =>
                        currentBranchIndex !== branchIndex
                          ? branch
                          : {
                              ...branch,
                              items: [...branch.items, { label: 'New work' }],
                            },
                      ),
                    },
              ),
            },
      ),
    )
  }

  function deleteWork(stageIndex: number, stopIndex: number, branchIndex: number, itemIndex: number) {
    markBranchDirty(workflowStages[stageIndex]?.stops[stopIndex]?.branches[branchIndex]?.id)

    setSelectedWorkflowStages((current) =>
      current.map((stage, currentStageIndex) =>
        currentStageIndex !== stageIndex
          ? stage
          : {
              ...stage,
              stops: stage.stops.map((stop, currentStopIndex) =>
                currentStopIndex !== stopIndex
                  ? stop
                  : {
                      ...stop,
                      branches: stop.branches.map((branch, currentBranchIndex) =>
                        currentBranchIndex !== branchIndex
                          ? branch
                          : {
                              ...branch,
                              items: branch.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex),
                            },
                      ),
                    },
              ),
            },
      ),
    )
  }

  return (
    <section className="config-page">
      <div className="config-page-inner">
        <p className="config-breadcrumb">OEM Config</p>
        <h1 className="config-page-title">Configuration</h1>

        {workflowError && (
          <p className="config-alert">
            {workflowError}
          </p>
        )}

        <section className="config-list-card">
          <div className="config-list-header">
            <div>
              <h2>Flow Management</h2>
              <p>
                Review workflow templates. You can edit checklist work only for {editableDept}.
              </p>
            </div>
            <span className="config-badge config-badge-teal">
              {workflowOptions.length} workflows
            </span>
          </div>

          <div className="config-table-wrap">
            <table className="config-table">
              <thead>
                <tr>
                  <th className="w-8 border-b border-slate-200 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <input aria-label="Select all workflows" type="checkbox" />
                  </th>
                  <th className="border-b border-slate-200 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Flow</th>
                  <th className="border-b border-slate-200 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Structure</th>
                  <th className="border-b border-slate-200 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Permission</th>
                  <th className="border-b border-slate-200 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="border-b border-slate-200 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingWorkflows && workflowOptions.length === 0 && (
                  <tr>
                    <td className="config-empty-row" colSpan={6}>Loading workflows...</td>
                  </tr>
                )}
                {!loadingWorkflows && workflowOptions.length === 0 && (
                  <tr>
                    <td className="config-empty-row" colSpan={6}>No workflow found from API.</td>
                  </tr>
                )}
                {workflowOptions.map((flow) => (
                  <tr className="group hover:bg-slate-50" key={flow.id}>
                    <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle">
                      <input aria-label={`Select ${flow.name}`} type="checkbox" />
                    </td>
                    <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle">
                      <div className="text-[13.5px] font-semibold text-slate-950">{flow.name}</div>
                      <div className="mt-0.5 font-mono text-[11.5px] font-medium text-slate-400">{flow.code || `FLOW_${flow.id}`}</div>
                    </td>
                    <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-[11.5px] font-semibold text-[#00a99d]">
                        {flow.stageCount || 0} stages / {flow.phaseCount || 0} phases
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle text-[13px] font-medium text-slate-500">
                      {editableDept}
                    </td>
                    <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle">
                      <span className="config-status-active">● {flow.status || 'active'}</span>
                      <span className="text-[11.5px] font-semibold text-emerald-600">● {flow.status || 'active'}</span>
                    </td>
                    <td className="border-b border-slate-100 px-3.5 py-2.5 align-middle">
                      <button
                        className="config-btn config-btn-secondary config-btn-sm"
                        onClick={() => {
                          setSelectedWorkflowId(flow.id)
                          setEditorOpen(true)
                        }}
                        type="button"
                      >
                        Edit checklist
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8"
          onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}
        >
          <section className="grid max-h-[calc(100vh-64px)] w-full max-w-[900px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="m-0 text-[17px] font-bold text-slate-950">{selectedWorkflow?.name || 'Workflow'}</h2>
                <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
                  Edit checklist items for {editableDept}. Other departments are read-only.
                  <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] font-semibold text-[#00a99d]">
                    {templateSummary.phaseCount} phases
                  </span>
                </p>
              </div>
              <button className="border-0 bg-transparent p-0 text-xl leading-none text-slate-500" onClick={() => setEditorOpen(false)} type="button">×</button>
            </div>

            <div className="overflow-auto py-3">
              {loadingWorkflows && workflowStages.length === 0 && (
                <p className="mx-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Loading workflow structure...</p>
              )}

              {workflowStages.map((stage, stageIndex) => {
                const stageKey = `${selectedWorkflowId || 'flow'}-stage-${stage.id || stageIndex}`
                const stageCollapsed = collapsedStages.has(stageKey)

                return (
                <section className="border-b border-slate-200 last:border-b-0" key={`${stage.name}-${stageIndex}`}>
                  <div
                    className="config-collapse-row grid grid-cols-[22px_auto_minmax(0,1fr)_auto] items-center gap-0 bg-slate-50 px-4 py-2.5"
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
                    <span className="text-[15px] font-bold leading-none text-slate-700">▾</span>
                    <span className="mr-2 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-white">S{stageIndex + 1}</span>
                    <strong className="min-w-0 text-[13.5px] font-semibold text-slate-950">{stage.name}</strong>
                    <span className="text-xs font-medium text-slate-500">{stage.stops.length} phases</span>
                  </div>

                  {!stageCollapsed && stage.stops.map((stop, stopIndex) => {
                    const phaseKey = `${stageKey}-phase-${stop.id || stopIndex}`
                    const phaseCollapsed = collapsedPhases.has(phaseKey)

                    return (
                    <div className="border-t border-slate-100" key={`${stage.name}-${stop.label}-${stopIndex}`}>
                      <div
                        className="config-collapse-row grid grid-cols-[58px_76px_minmax(240px,1fr)_minmax(180px,auto)] items-center gap-2 px-4 py-2 pl-9 max-[900px]:grid-cols-1 max-[900px]:pl-4"
                        onClick={() => toggleCollapsed(setCollapsedPhases, phaseKey)}
                      >
                        <button
                          aria-expanded={!phaseCollapsed}
                          aria-label={`${phaseCollapsed ? 'Open' : 'Close'} ${stop.name}`}
                          className="config-toggle-btn"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleCollapsed(setCollapsedPhases, phaseKey)
                          }}
                          type="button"
                        >
                          {phaseCollapsed ? '▶' : '▼'}
                        </button>
                        <span className="text-[15px] font-bold leading-none text-slate-500 max-[900px]:hidden">▾</span>
                        <span className="rounded bg-teal-50 px-2 py-1 text-center text-[11px] font-bold text-[#00a99d]">{stop.label}</span>
                        <strong className="min-w-0 text-[13px] font-medium text-slate-900">{stop.name}</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {stop.branches.map((branch) => (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700" key={`${stop.id}-${branch.id}-${branch.dept}`}>
                              {branch.dept}
                            </span>
                          ))}
                        </div>
                      </div>

                      {!phaseCollapsed && <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-3 pl-[52px] pt-1 max-[900px]:pl-4">
                        {stop.branches.map((branch, branchIndex) => {
                          const editable = normalizeDept(branch.dept) === normalizeDept(editableDept)
                          const branchIsDirty = branch.id ? dirtyBranchIds.has(branch.id) : false

                          return (
                            <div className="mt-3" key={`${branch.dept}-${branchIndex}`}>
                              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-teal-50 px-3 py-1 text-[11.5px] font-semibold text-[#00a99d]">{branch.dept}</span>
                                {!editable && <span className="text-[11.5px] font-medium text-slate-400">Locked to assigned department</span>}
                              </div>
                              <div>
                                {branch.items.map((item, itemIndex) => (
                                  <div className="flex items-center gap-2 border-b border-slate-100 py-1 last:border-b-0" key={`${branch.dept}-${itemIndex}`}>
                                    <span className="text-xs text-slate-400">☐</span>
                                    <input
                                      aria-label={`Checklist ${itemIndex + 1} for ${branch.dept}`}
                                      className="h-8 flex-1 rounded border border-transparent bg-transparent px-2 text-[12.5px] font-medium text-slate-800 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#00a99d] focus:bg-white disabled:text-slate-500"
                                      disabled={!editable || savingBranchId === branch.id}
                                      onChange={(event) => updateWork(stageIndex, stopIndex, branchIndex, itemIndex, event.target.value)}
                                      readOnly={!editable}
                                      value={item.label}
                                    />
                                    {editable && (
                                      <button
                                        className="border-0 bg-transparent px-1 text-sm text-slate-300 transition hover:text-rose-600"
                                        disabled={savingBranchId === branch.id}
                                        onClick={() => deleteWork(stageIndex, stopIndex, branchIndex, itemIndex)}
                                        type="button"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {editable && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button className="min-h-7 rounded border border-slate-200 bg-slate-50 px-2.5 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-100" disabled={savingBranchId === branch.id} onClick={() => addWork(stageIndex, stopIndex, branchIndex)} type="button">
                                    + Add checklist
                                  </button>
                                  <button className="min-h-7 rounded border-0 bg-[#00a99d] px-2.5 text-[11.5px] font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40" disabled={savingBranchId === branch.id || !branchIsDirty} onClick={() => saveBranch(stageIndex, stopIndex, branchIndex)} type="button">
                                    {savingBranchId === branch.id ? 'Saving...' : 'Update'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>}
                    </div>
                    )
                  })}
                </section>
                )
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100" onClick={() => setEditorOpen(false)} type="button">Close</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ConfigView
