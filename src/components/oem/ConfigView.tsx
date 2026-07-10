import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../lib/api'

type ConfigViewProps = {
  accessToken: string
  currentDept: string
  departments: string[]
  onWorkflowTemplateChange?: () => Promise<void> | void
}

type WorkflowOption = {
  id: number
  name: string
  phaseCount?: number
  stageCount?: number
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
    stops: stage.phases.map((phase) => ({
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
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [savingBranchId, setSavingBranchId] = useState<number | null>(null)
  const [dirtyBranchIds, setDirtyBranchIds] = useState<Set<number>>(() => new Set())
  const [workflowError, setWorkflowError] = useState('')
  const workflowStages = useMemo(
    () => selectedWorkflowId === null ? [] : workflowTemplates[String(selectedWorkflowId)] || [],
    [selectedWorkflowId, workflowTemplates],
  )

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
    <section className="page-pad">
      <div className="page-heading">
        <div>
          <h1>Configuration</h1>
          <p>Review every stage and phase, then edit only the work assigned to your department.</p>
        </div>
      </div>

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="min-w-0">
            <h3 className="m-0 text-xl font-black text-slate-950">Workflow Template</h3>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
              All workflow phases are visible. Editable work is limited to {editableDept}.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-[360px]">
            <label className="grid gap-2 text-sm font-black text-slate-700">
              <span>Workflow</span>
              <select
                className="min-h-12 rounded-xl !border !border-slate-200 !bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none transition focus:!border-teal-600 focus:!bg-white focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loadingWorkflows || workflowOptions.length === 0}
                onChange={(event) => setSelectedWorkflowId(event.target.value ? Number(event.target.value) : null)}
                value={selectedWorkflowId ?? ''}
              >
                {workflowOptions.length === 0 && <option value="">No workflow available</option>}
                {workflowOptions.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                    {typeof flow.stageCount === 'number' && typeof flow.phaseCount === 'number'
                      ? ` (${flow.stageCount} stages / ${flow.phaseCount} phases)`
                      : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                {templateSummary.phaseCount} phases
              </span>
              <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-black text-teal-800">
                {templateSummary.editableWorkCount} editable work
              </span>
            </div>
          </div>
        </div>
        {workflowError && (
          <p className="m-0 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            {workflowError}
          </p>
        )}
        {!workflowError && !loadingWorkflows && workflowOptions.length === 0 && (
          <p className="m-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
            No workflow found from API.
          </p>
        )}
        {loadingWorkflows && (
          <p className="m-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
            Loading workflow from database...
          </p>
        )}

        {workflowStages.map((stage, stageIndex) => (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70" key={`${stage.name}-${stageIndex}`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white shadow-sm">
                S{stageIndex + 1}
              </span>
              <div>
                <h4 className="m-0 text-base font-black text-slate-900">{stage.name}</h4>
                <p className="m-0 mt-0.5 text-xs font-bold text-slate-400">{stage.stops.length} phases</p>
              </div>
            </div>

            <div className="grid gap-3 p-4">
              {stage.stops.map((stop, stopIndex) => (
                <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={`${stage.name}-${stop.label}-${stopIndex}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-700">
                        Phase {stop.label}
                      </span>
                      <strong className="mt-2 block text-base font-black leading-snug text-slate-950">{stop.name}</strong>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                      {stop.branches.length} departments
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {stop.branches.map((branch, branchIndex) => {
                      const editable = normalizeDept(branch.dept) === normalizeDept(editableDept)

                      if (!editable) {
                        return branch.items.map((item, itemIndex) => (
                          <div
                            className="border-b border-slate-100 py-2 text-sm font-semibold leading-relaxed text-slate-600 last:border-b-0"
                            key={`${branch.dept}-${branchIndex}-${itemIndex}`}
                          >
                            Phase {stop.label} - {branch.dept}: {item.label}
                          </div>
                        ))
                      }

                      const branchIsDirty = branch.id ? dirtyBranchIds.has(branch.id) : false

                      return (
                        <div className="grid gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 shadow-[0_10px_26px_rgba(13,148,136,0.08)]" key={`${branch.dept}-${branchIndex}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="rounded-full bg-teal-700 px-3 py-1 text-xs font-black text-white">
                                {branch.dept}
                              </span>
                              <span className="text-xs font-black uppercase tracking-wide text-teal-700">Editable</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                className="min-h-9 rounded-lg !border !border-teal-100 !bg-white px-3 text-xs font-black !text-teal-800 shadow-sm transition hover:!bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={savingBranchId === branch.id}
                                onClick={() => addWork(stageIndex, stopIndex, branchIndex)}
                                type="button"
                              >
                                Add work
                              </button>
                              <button
                                className="min-h-9 rounded-lg !border-0 !bg-teal-700 px-3 text-xs font-black !text-white shadow-sm transition hover:!bg-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400"
                                disabled={savingBranchId === branch.id || !branchIsDirty}
                                onClick={() => saveBranch(stageIndex, stopIndex, branchIndex)}
                                type="button"
                              >
                                {savingBranchId === branch.id ? 'Updating...' : 'Update'}
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            {branch.items.map((item, itemIndex) => (
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" key={`${branch.dept}-${itemIndex}`}>
                                <input
                                  aria-label={`Work item ${itemIndex + 1} for phase ${stop.label}`}
                                  className="min-h-11 rounded-xl !border !border-teal-100 !bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                                  disabled={savingBranchId === branch.id}
                                  onChange={(event) => updateWork(stageIndex, stopIndex, branchIndex, itemIndex, event.target.value)}
                                  value={item.label}
                                />
                                <button
                                  className="min-h-11 rounded-xl !border-0 !bg-rose-50 px-4 text-sm font-black !text-rose-700 transition hover:!bg-rose-100"
                                  disabled={savingBranchId === branch.id}
                                  onClick={() => deleteWork(stageIndex, stopIndex, branchIndex, itemIndex)}
                                  type="button"
                                >
                                  {savingBranchId === branch.id ? 'Saving...' : 'Delete'}
                                </button>
                              </div>
                            ))}

                            {branch.items.length === 0 && (
                              <p className="m-0 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-400">
                                No work in this phase yet.
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </section>
    </section>
  )
}

export default ConfigView
