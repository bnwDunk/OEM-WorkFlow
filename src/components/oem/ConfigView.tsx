import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, DragEvent, FormEvent, SetStateAction } from 'react'
import toast from 'react-hot-toast'
import { normalizeStagePhaseLabels } from '../../data/oemWorkflow'
import { apiRequest } from '../../lib/api'
import { confirmToast } from '../../lib/confirmToast'

type ConfigViewProps = {
  accessToken: string
  canDeleteFlow?: boolean
  canReorder?: boolean
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
    dueDays?: number | null
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
  dueDays?: number | null
  id?: number
  name: string
  stops: ConfigStop[]
}

function normalizeDept(value: string) {
  return value.trim().toLowerCase()
}

function mapStructureToTemplate(structure: FlowStructureResponse) {
  return structure.stages.map((stage) => ({
    dueDays: stage.dueDays ?? null,
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

function ConfigView({ accessToken, canDeleteFlow = false, canReorder = false, currentDept, departments, onWorkflowTemplateChange }: ConfigViewProps) {
  const [workflowTemplates, setWorkflowTemplates] = useState<Record<string, ConfigStage[]>>({})
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOption[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [newFlowOpen, setNewFlowOpen] = useState(false)
  const [newFlowName, setNewFlowName] = useState('')
  const [newFlowSourceId, setNewFlowSourceId] = useState<number | null>(null)
  const [creatingFlow, setCreatingFlow] = useState(false)
  const [addPhaseOpen, setAddPhaseOpen] = useState(false)
  const [newPhaseLabel, setNewPhaseLabel] = useState('')
  const [newPhaseName, setNewPhaseName] = useState('')
  const [newPhaseStageId, setNewPhaseStageId] = useState<number | null>(null)
  const [savingPhase, setSavingPhase] = useState(false)
  const [deletingFlowId, setDeletingFlowId] = useState<number | null>(null)
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [savingBranchId, setSavingBranchId] = useState<number | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderDirty, setOrderDirty] = useState(false)
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null)
  const [draggedPhase, setDraggedPhase] = useState<{ stageIndex: number; stopIndex: number } | null>(null)
  const [stageDropIndex, setStageDropIndex] = useState<number | null>(null)
  const [phaseDropIndex, setPhaseDropIndex] = useState<{ stageIndex: number; stopIndex: number } | null>(null)
  const [recentMove, setRecentMove] = useState<{ direction: 'down' | 'up'; key: string } | null>(null)
  const moveFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draggedStageIndexRef = useRef<number | null>(null)
  const draggedStageKeyRef = useRef<string | null>(null)
  const draggedPhaseRef = useRef<{ stageIndex: number; stopIndex: number } | null>(null)
  const draggedPhaseKeyRef = useRef<string | null>(null)
  const [dirtyBranchIds, setDirtyBranchIds] = useState<Set<number>>(() => new Set())
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(() => new Set())
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(() => new Set())
  const [collapsePendingWorkflowId, setCollapsePendingWorkflowId] = useState<number | null>(null)
  const [workflowError, setWorkflowError] = useState('')
  const workflowStages = useMemo(
    () => selectedWorkflowId === null ? [] : workflowTemplates[String(selectedWorkflowId)] || [],
    [selectedWorkflowId, workflowTemplates],
  )
  const selectedWorkflow = workflowOptions.find((flow) => flow.id === selectedWorkflowId) || null
  const workflowListPath = canDeleteFlow ? '/admin/flows' : '/workflow/flows'
  const workflowStructureBasePath = canDeleteFlow ? '/admin/flows' : '/workflow/flows'

  const editableDept = useMemo(() => {
    const current = departments.find((department) => normalizeDept(department) === normalizeDept(currentDept))
    return current || currentDept || ''
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

        const response = await apiRequest<{ flows: WorkflowOption[] }>(workflowListPath, { token: accessToken })

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
  }, [accessToken, workflowListPath])

  useEffect(() => {
    if (selectedWorkflowId === null || workflowTemplates[String(selectedWorkflowId)]) return

    let active = true

    async function loadWorkflowStructure() {
      try {
        setLoadingWorkflows(true)
        setWorkflowError('')

        const response = await apiRequest<FlowStructureResponse>(`${workflowStructureBasePath}/${selectedWorkflowId}/structure`, { token: accessToken })

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
  }, [accessToken, selectedWorkflowId, workflowStructureBasePath, workflowTemplates])

  useEffect(() => {
    setOrderDirty(false)
    draggedStageIndexRef.current = null
    draggedStageKeyRef.current = null
    draggedPhaseRef.current = null
    draggedPhaseKeyRef.current = null
    setDraggedStageIndex(null)
    setDraggedPhase(null)
    setStageDropIndex(null)
    setPhaseDropIndex(null)
  }, [selectedWorkflowId])

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

  useEffect(() => () => {
    if (moveFeedbackTimer.current) clearTimeout(moveFeedbackTimer.current)
  }, [])

  function showMoveFeedback(key: string, direction: 'down' | 'up') {
    if (moveFeedbackTimer.current) clearTimeout(moveFeedbackTimer.current)
    setRecentMove(null)
    window.requestAnimationFrame(() => setRecentMove({ direction, key }))
    moveFeedbackTimer.current = setTimeout(() => setRecentMove(null), 900)
  }

  function reorderStage(fromIndex: number, toIndex: number, movedKey?: string) {
    if (!canReorder) return
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= workflowStages.length) return
    const movedStage = workflowStages[fromIndex]
    showMoveFeedback(movedKey || `stage-${movedStage.id || movedStage.name}`, toIndex < fromIndex ? 'up' : 'down')
    setSelectedWorkflowStages((current) => {
      const stages = [...current]
      const [movedStage] = stages.splice(fromIndex, 1)
      stages.splice(toIndex, 0, movedStage)
      return stages
    })
    setOrderDirty(true)
  }

  function reorderPhase(stageIndex: number, fromIndex: number, toIndex: number, movedKey?: string) {
    if (!canReorder) return
    const stage = workflowStages[stageIndex]
    if (!stage || fromIndex === toIndex || toIndex < 0 || toIndex >= stage.stops.length) return
    const movedStop = stage.stops[fromIndex]
    showMoveFeedback(movedKey || `phase-${movedStop.id || `${movedStop.label}-${movedStop.name}`}`, toIndex < fromIndex ? 'up' : 'down')
    setSelectedWorkflowStages((current) => current.map((item, index) => {
      if (index !== stageIndex) return item
      const stops = [...item.stops]
      const [movedStop] = stops.splice(fromIndex, 1)
      stops.splice(toIndex, 0, movedStop)
      return { ...item, stops }
    }))
    setOrderDirty(true)
  }

  function finishOrderDrag() {
    draggedStageIndexRef.current = null
    draggedStageKeyRef.current = null
    draggedPhaseRef.current = null
    draggedPhaseKeyRef.current = null
    setDraggedStageIndex(null)
    setDraggedPhase(null)
    setStageDropIndex(null)
    setPhaseDropIndex(null)
  }

  function startStageDrag(event: DragEvent<HTMLButtonElement>, stageIndex: number) {
    if (!canReorder) return
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `stage:${stageIndex}`)
    draggedStageIndexRef.current = stageIndex
    draggedStageKeyRef.current = `stage-${workflowStages[stageIndex].id || workflowStages[stageIndex].name}`
    setDraggedStageIndex(stageIndex)
  }

  function previewStageMove(toIndex: number) {
    const fromIndex = draggedStageIndexRef.current
    if (fromIndex === null || fromIndex === toIndex) return
    reorderStage(fromIndex, toIndex, draggedStageKeyRef.current || undefined)
    draggedStageIndexRef.current = toIndex
    setDraggedStageIndex(toIndex)
  }

  function previewPhaseMove(stageIndex: number, toIndex: number) {
    const dragged = draggedPhaseRef.current
    if (!dragged || dragged.stageIndex !== stageIndex || dragged.stopIndex === toIndex) return
    reorderPhase(stageIndex, dragged.stopIndex, toIndex, draggedPhaseKeyRef.current || undefined)
    draggedPhaseRef.current = { stageIndex, stopIndex: toIndex }
    setDraggedPhase({ stageIndex, stopIndex: toIndex })
  }

  async function saveWorkflowOrder() {
    if (!canReorder || selectedWorkflowId === null || !orderDirty) return

    try {
      setSavingOrder(true)
      setWorkflowError('')
      await apiRequest(`/workflow/flows/${selectedWorkflowId}/order`, {
        method: 'PUT',
        token: accessToken,
        body: JSON.stringify({
          stages: workflowStages.map((stage) => ({
            id: stage.id,
            phaseIds: stage.stops.map((stop) => stop.id),
          })),
        }),
      })
      const structure = await apiRequest<FlowStructureResponse>(`${workflowStructureBasePath}/${selectedWorkflowId}/structure`, { token: accessToken })
      setWorkflowTemplates((current) => ({
        ...current,
        [String(selectedWorkflowId)]: mapStructureToTemplate(structure),
      }))
      setOrderDirty(false)
      await onWorkflowTemplateChange?.()
      toast.success('บันทึกลำดับ Stage และ Phase แล้ว')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save workflow order.'
      setWorkflowError(message)
      toast.error(message)
    } finally {
      setSavingOrder(false)
    }
  }

  useEffect(() => {
    if (!editorOpen || selectedWorkflowId === null || collapsePendingWorkflowId !== selectedWorkflowId) return
    if (!Object.prototype.hasOwnProperty.call(workflowTemplates, String(selectedWorkflowId))) return

    const stageKeys = new Set<string>()
    const phaseKeys = new Set<string>()

    workflowStages.forEach((stage, stageIndex) => {
      const stageKey = `${selectedWorkflowId}-stage-${stage.id || stageIndex}`
      stageKeys.add(stageKey)
      stage.stops.forEach((stop, stopIndex) => {
        phaseKeys.add(`${stageKey}-phase-${stop.id || stopIndex}`)
      })
    })

    setCollapsedStages(stageKeys)
    setCollapsedPhases(phaseKeys)
    setCollapsePendingWorkflowId(null)
  }, [collapsePendingWorkflowId, editorOpen, selectedWorkflowId, workflowStages, workflowTemplates])

  async function addDepartmentPhase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedWorkflowId === null || newPhaseStageId === null) return

    try {
      setSavingPhase(true)
      setWorkflowError('')
      const response = await apiRequest<{ affectedActiveCustomers: number }>(
        `/workflow/flows/${selectedWorkflowId}/stages/${newPhaseStageId}/phases`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({
            departmentName: editableDept,
            label: newPhaseLabel,
            name: newPhaseName,
          }),
        },
      )
      const structure = await apiRequest<FlowStructureResponse>(
        `${workflowStructureBasePath}/${selectedWorkflowId}/structure`,
        { token: accessToken },
      )
      setWorkflowTemplates((current) => ({
        ...current,
        [String(selectedWorkflowId)]: mapStructureToTemplate(structure),
      }))
      setWorkflowOptions((current) => current.map((flow) =>
        flow.id === selectedWorkflowId
          ? { ...flow, phaseCount: Number(flow.phaseCount || 0) + 1 }
          : flow,
      ))
      setNewPhaseLabel('')
      setNewPhaseName('')
      setAddPhaseOpen(false)
      await onWorkflowTemplateChange?.()
      if (response.affectedActiveCustomers > 0) {
        setWorkflowError(`เพิ่ม Phase สำเร็จและอัปเดตลูกค้าเดิม ${response.affectedActiveCustomers} รายแล้ว`)
      }
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'Unable to add phase.')
    } finally {
      setSavingPhase(false)
    }
  }

  async function deleteFlow(flow: WorkflowOption) {
    const confirmed = await confirmToast({
      confirmLabel: 'Delete',
      dangerNote: 'A flow already used by customers cannot be deleted.',
      message: `Delete flow ${flow.name}?`,
      title: 'Delete flow',
    })
    if (!confirmed) return

    try {
      setWorkflowError('')
      setDeletingFlowId(flow.id)
      await apiRequest(`/admin/flows/${flow.id}`, {
        method: 'DELETE',
        token: accessToken,
      })
      setWorkflowOptions((current) => current.filter((item) => item.id !== flow.id))
      setWorkflowTemplates((current) => {
        const next = { ...current }
        delete next[String(flow.id)]
        return next
      })
      if (selectedWorkflowId === flow.id) {
        setEditorOpen(false)
        setSelectedWorkflowId(null)
      }
      await onWorkflowTemplateChange?.()
      toast.success(`Deleted flow ${flow.name}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete flow.'
      setWorkflowError(message)
      toast.error(message)
    } finally {
      setDeletingFlowId(null)
    }
  }

  async function createFlow() {
    const name = newFlowName.trim()
    if (!canDeleteFlow || !name) return

    try {
      setCreatingFlow(true)
      setWorkflowError('')
      const created = await apiRequest<{ id: number }>('/admin/flows', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          name,
          sourceFlowId: newFlowSourceId || undefined,
        }),
      })
      const response = await apiRequest<{ flows: WorkflowOption[] }>(workflowListPath, { token: accessToken })
      setWorkflowOptions(response.flows)
      setSelectedWorkflowId(created.id)
      setWorkflowTemplates((current) => {
        const next = { ...current }
        delete next[String(created.id)]
        return next
      })
      setNewFlowName('')
      setNewFlowOpen(false)
      await onWorkflowTemplateChange?.()
      toast.success(`Created flow ${name}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create flow.'
      setWorkflowError(message)
      toast.error(message)
    } finally {
      setCreatingFlow(false)
    }
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
      toast.success(`Updated ${branch.dept} checklist successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save workflow work.'
      setWorkflowError(message)
      toast.error(message)
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
            <div className="flex items-center gap-2">
              <span className="config-badge config-badge-teal">
                {workflowOptions.length} workflows
              </span>
              {canDeleteFlow && (
                <button
                  className="config-btn min-h-9 rounded-lg border-0 bg-[#00a99d] px-4 text-[13px] font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md"
                  onClick={() => {
                    setNewFlowSourceId((current) => current || selectedWorkflowId || workflowOptions[0]?.id || null)
                    setNewFlowOpen(true)
                  }}
                  type="button"
                >
                  + New Flow
                </button>
              )}
            </div>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="config-btn config-btn-secondary config-btn-sm"
                          disabled={deletingFlowId === flow.id}
                          onClick={() => {
                            setSelectedWorkflowId(flow.id)
                            setCollapsePendingWorkflowId(flow.id)
                            setEditorOpen(true)
                          }}
                          type="button"
                        >
                          Edit checklist
                        </button>
                        {canDeleteFlow === true && (
                          <button
                            className="config-btn config-btn-sm border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={deletingFlowId !== null}
                            onClick={() => void deleteFlow(flow)}
                            type="button"
                          >
                            {deletingFlowId === flow.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {canDeleteFlow && newFlowOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4 py-8 backdrop-blur-[2px]"
          onMouseDown={(event) => event.target === event.currentTarget && !creatingFlow && setNewFlowOpen(false)}
        >
          <section className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="mb-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-700">WebAdmin only</span>
                  <h2 className="m-0 text-xl font-black text-slate-950">Create New Flow</h2>
                  <p className="m-0 mt-1 text-sm font-medium text-slate-500">Copy an existing workflow structure and customize it later.</p>
                </div>
                <button aria-label="Close new flow dialog" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-0 bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-900" disabled={creatingFlow} onClick={() => setNewFlowOpen(false)} type="button">×</button>
              </div>
            </div>
            <form className="space-y-4 px-6 py-5" onSubmit={(event) => { event.preventDefault(); void createFlow() }}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Flow name</span>
                <input autoFocus className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-50" maxLength={190} onChange={(event) => setNewFlowName(event.target.value)} placeholder="e.g. OEM Express" required value={newFlowName} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Start from</span>
                <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50" disabled={workflowOptions.length === 0} onChange={(event) => setNewFlowSourceId(Number(event.target.value) || null)} value={newFlowSourceId || ''}>
                  {workflowOptions.length === 0 && <option value="">Standard OEM template</option>}
                  {workflowOptions.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50" disabled={creatingFlow} onClick={() => setNewFlowOpen(false)} type="button">Cancel</button>
                <button className="min-h-10 rounded-lg border-0 bg-[#00a99d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={creatingFlow || !newFlowName.trim()} type="submit">{creatingFlow ? 'Creating...' : 'Create Flow'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

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
                  {editableDept
                    ? `Edit checklist items for ${editableDept}. Other departments are read-only.`
                    : 'No department is assigned to this account. Please contact an administrator.'}
                  <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] font-semibold text-[#00a99d]">
                    {templateSummary.phaseCount} phases
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="min-h-9 rounded-lg border-0 bg-[#00a99d] px-4 text-xs font-black text-white shadow-sm transition hover:bg-teal-700"
                  disabled={!editableDept}
                  onClick={() => {
                    setNewPhaseStageId((current) => current || workflowStages[0]?.id || null)
                    setAddPhaseOpen((open) => !open)
                  }}
                  type="button"
                >
                  + Add Phase
                </button>
                <button
                  aria-label="Close flow editor"
                  className="config-editor-close border-0 bg-transparent p-0 text-xl leading-none text-slate-500"
                  onClick={() => setEditorOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-auto py-3">
              {addPhaseOpen && (
                <form className="mx-4 mb-4 rounded-xl border border-teal-200 bg-teal-50/70 p-4" onSubmit={addDepartmentPhase}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="m-0 text-sm font-black text-slate-950">เพิ่ม Phase สำหรับ {editableDept}</h3>
                      <p className="m-0 mt-1 text-xs font-semibold text-slate-500">Phase นี้จะผูกกับแผนกของคุณและเพิ่มให้ลูกค้าเดิมทุกคนใน Flow</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700 shadow-sm">{editableDept}</span>
                  </div>
                  <div className="grid gap-2.5 md:grid-cols-[minmax(140px,180px)_minmax(100px,130px)_minmax(0,1fr)_auto]">
                    <select
                      aria-label="Stage"
                      className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-teal-500"
                      onChange={(event) => setNewPhaseStageId(Number(event.target.value) || null)}
                      required
                      value={newPhaseStageId || ''}
                    >
                      <option value="">เลือก Stage</option>
                      {workflowStages.map((stage, index) => (
                        <option key={stage.id || index} value={stage.id}>Stage {index + 1}: {stage.name}</option>
                      ))}
                    </select>
                    <input
                      className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500"
                      maxLength={20}
                      onChange={(event) => setNewPhaseLabel(event.target.value)}
                      placeholder="Phase เช่น 5.1"
                      required
                      value={newPhaseLabel}
                    />
                    <input
                      className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500"
                      maxLength={190}
                      onChange={(event) => setNewPhaseName(event.target.value)}
                      placeholder="ชื่อ Phase"
                      required
                      value={newPhaseName}
                    />
                    <button
                      className="min-h-10 rounded-lg border-0 bg-teal-600 px-4 text-sm font-black text-white transition hover:bg-teal-700 disabled:opacity-50"
                      disabled={savingPhase}
                      type="submit"
                    >
                      {savingPhase ? 'กำลังเพิ่ม...' : 'เพิ่ม Phase'}
                    </button>
                  </div>
                </form>
              )}

              {loadingWorkflows && workflowStages.length === 0 && (
                <p className="mx-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Loading workflow structure...</p>
              )}

              {workflowStages.map((stage, stageIndex) => {
                const stageKey = `${selectedWorkflowId || 'flow'}-stage-${stage.id || stageIndex}`
                const stageMoveKey = `stage-${stage.id || stage.name}`
                const stageCollapsed = collapsedStages.has(stageKey)

                return (
                <section
                  className={`config-order-stage border-b border-slate-200 last:border-b-0 ${draggedStageIndex === stageIndex ? 'is-dragging' : ''} ${stageDropIndex === stageIndex && draggedStageIndex !== stageIndex ? 'is-drop-target' : ''} ${recentMove?.key === stageMoveKey ? `is-reordered moved-${recentMove.direction}` : ''}`}
                  key={stage.id || stage.name}
                  onDragOver={(event) => {
                    if (draggedStageIndex === null) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setStageDropIndex(stageIndex)
                    previewStageMove(stageIndex)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    finishOrderDrag()
                  }}
                >
                  <div
                    className="config-collapse-row flex min-h-[52px] items-center gap-2 bg-slate-50 px-5 py-2.5"
                    onClick={() => toggleCollapsed(setCollapsedStages, stageKey)}
                  >
                    {canReorder && (
                      <button aria-label={`ลาก Stage ${stageIndex + 1} เพื่อจัดลำดับ`} className="admin-flow-drag-handle" draggable onClick={(event) => event.stopPropagation()} onDragEnd={finishOrderDrag} onDragStart={(event) => startStageDrag(event, stageIndex)} title="ลากเพื่อจัดลำดับ Stage" type="button">
                        <span aria-hidden="true">⠿</span>
                      </button>
                    )}
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
                    <span className="mr-1 shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">S{stageIndex + 1}</span>
                    <strong className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-slate-950">{stage.name}</strong>
                    {canReorder && (
                      <div className="admin-flow-order-actions ml-auto shrink-0" onClick={(event) => event.stopPropagation()}>
                        <button aria-label={`เลื่อน Stage ${stageIndex + 1} ขึ้น`} disabled={stageIndex === 0} onClick={() => reorderStage(stageIndex, stageIndex - 1)} title="เลื่อนขึ้น" type="button">↑</button>
                        <button aria-label={`เลื่อน Stage ${stageIndex + 1} ลง`} disabled={stageIndex === workflowStages.length - 1} onClick={() => reorderStage(stageIndex, stageIndex + 1)} title="เลื่อนลง" type="button">↓</button>
                      </div>
                    )}
                    <span className="ml-2 w-[68px] shrink-0 text-right text-xs font-semibold text-slate-500">{stage.stops.length} phases</span>
                  </div>

                  {!stageCollapsed && stage.stops.map((stop, stopIndex) => {
                    const phaseKey = `${stageKey}-phase-${stop.id || stopIndex}`
                    const phaseMoveKey = `phase-${stop.id || `${stop.label}-${stop.name}`}`
                    const phaseCollapsed = collapsedPhases.has(phaseKey)

                    return (
                    <div
                      className={`config-order-phase border-t border-slate-100 ${draggedPhase?.stageIndex === stageIndex && draggedPhase.stopIndex === stopIndex ? 'is-dragging' : ''} ${phaseDropIndex?.stageIndex === stageIndex && phaseDropIndex.stopIndex === stopIndex && draggedPhase?.stopIndex !== stopIndex ? 'is-drop-target' : ''} ${recentMove?.key === phaseMoveKey ? `is-reordered moved-${recentMove.direction}` : ''}`}
                      key={stop.id || `${stage.id || stage.name}-${stop.label}-${stop.name}`}
                      onDragOver={(event) => {
                        if (!draggedPhase || draggedPhase.stageIndex !== stageIndex) return
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = 'move'
                        setPhaseDropIndex({ stageIndex, stopIndex })
                        previewPhaseMove(stageIndex, stopIndex)
                      }}
                      onDrop={(event) => {
                        if (!draggedPhase || draggedPhase.stageIndex !== stageIndex) return
                        event.preventDefault()
                        event.stopPropagation()
                        finishOrderDrag()
                      }}
                    >
                      <div
                        className="config-collapse-row flex min-h-[54px] items-center gap-2 px-5 py-2 pl-12 max-[900px]:flex-wrap max-[900px]:pl-5"
                        onClick={() => toggleCollapsed(setCollapsedPhases, phaseKey)}
                      >
                        {canReorder && (
                          <button
                            aria-label={`ลาก Phase ${stop.label} เพื่อจัดลำดับ`}
                            className="admin-flow-drag-handle"
                            draggable
                            onClick={(event) => event.stopPropagation()}
                            onDragEnd={finishOrderDrag}
                            onDragStart={(event) => {
                              event.stopPropagation()
                              event.dataTransfer.effectAllowed = 'move'
                              event.dataTransfer.setData('text/plain', `phase:${stageIndex}:${stopIndex}`)
                              draggedPhaseRef.current = { stageIndex, stopIndex }
                              draggedPhaseKeyRef.current = `phase-${stop.id || `${stop.label}-${stop.name}`}`
                              setDraggedPhase({ stageIndex, stopIndex })
                            }}
                            title="ลากเพื่อจัดลำดับ Phase"
                            type="button"
                          >
                            <span aria-hidden="true">⠿</span>
                          </button>
                        )}
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
                        <span className="w-[70px] shrink-0 rounded-md bg-teal-50 px-2 py-1.5 text-center text-[11px] font-bold text-[#00a99d]">{stop.label}</span>
                        <strong className="min-w-[180px] flex-1 text-[13px] font-medium text-slate-900">{stop.name}</strong>
                        <div className="flex max-w-[280px] flex-wrap justify-end gap-1.5 max-[900px]:ml-[70px] max-[900px]:max-w-none max-[900px]:flex-1">
                          {stop.branches.map((branch) => (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700" key={`${stop.id}-${branch.id}-${branch.dept}`}>
                              {branch.dept}
                            </span>
                          ))}
                        </div>
                        {canReorder && (
                          <div className="admin-flow-order-actions ml-2 shrink-0" onClick={(event) => event.stopPropagation()}>
                            <button aria-label={`เลื่อน Phase ${stop.label} ขึ้น`} disabled={stopIndex === 0} onClick={() => reorderPhase(stageIndex, stopIndex, stopIndex - 1)} title="เลื่อนขึ้น" type="button">↑</button>
                            <button aria-label={`เลื่อน Phase ${stop.label} ลง`} disabled={stopIndex === stage.stops.length - 1} onClick={() => reorderPhase(stageIndex, stopIndex, stopIndex + 1)} title="เลื่อนลง" type="button">↓</button>
                          </div>
                        )}
                      </div>

                      {!phaseCollapsed && <div className="config-checklist-panel">
                        {stop.branches.map((branch, branchIndex) => {
                          const editable = normalizeDept(branch.dept) === normalizeDept(editableDept)
                          const branchIsDirty = branch.id ? dirtyBranchIds.has(branch.id) : false

                          return (
                            <div className={`config-department-card ${editable ? 'is-editable' : 'is-locked'}`} key={`${branch.dept}-${branchIndex}`}>
                              <div className="config-department-head">
                                <div className="config-department-title">
                                  <span className="config-department-icon" aria-hidden="true">{branch.dept.slice(0, 1).toUpperCase()}</span>
                                  <div>
                                    <strong>{branch.dept}</strong>
                                    <p>{branch.items.length} checklist {branch.items.length === 1 ? 'item' : 'items'}</p>
                                  </div>
                                </div>
                                <span className={`config-edit-status ${editable ? 'is-editable' : 'is-locked'}`}>
                                  {editable ? 'Editable by your department' : 'View only'}
                                </span>
                              </div>
                              <div className="config-checklist-list">
                                {branch.items.map((item, itemIndex) => (
                                  <div className="config-checklist-item" key={`${branch.dept}-${itemIndex}`}>
                                    <span className="config-checklist-number" aria-hidden="true">{itemIndex + 1}</span>
                                    <input
                                      aria-label={`Checklist ${itemIndex + 1} for ${branch.dept}`}
                                      className="config-checklist-input"
                                      disabled={!editable || savingBranchId === branch.id}
                                      onChange={(event) => updateWork(stageIndex, stopIndex, branchIndex, itemIndex, event.target.value)}
                                      readOnly={!editable}
                                      value={item.label}
                                    />
                                    {editable && (
                                      <button
                                        aria-label={`Delete checklist ${itemIndex + 1}`}
                                        className="config-checklist-delete"
                                        disabled={savingBranchId === branch.id}
                                        onClick={() => deleteWork(stageIndex, stopIndex, branchIndex, itemIndex)}
                                        type="button"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {branch.items.length === 0 && (
                                  <div className="config-checklist-empty">No checklist items yet.</div>
                                )}
                              </div>
                              {editable && (
                                <div className="config-checklist-actions">
                                  <button className="config-checklist-add" disabled={savingBranchId === branch.id} onClick={() => addWork(stageIndex, stopIndex, branchIndex)} type="button">
                                    + Add checklist
                                  </button>
                                  <button className="config-checklist-save" disabled={savingBranchId === branch.id || !branchIsDirty} onClick={() => saveBranch(stageIndex, stopIndex, branchIndex)} type="button">
                                    {savingBranchId === branch.id ? 'Saving...' : 'Update checklist'}
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

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
              <span className="text-xs font-bold text-amber-600">
                {canReorder && orderDirty ? 'มีการเปลี่ยนลำดับที่ยังไม่ได้บันทึก' : ''}
              </span>
              <div className="flex justify-end gap-2">
                {canReorder && orderDirty && (
                  <button className="min-h-9 rounded-md border-0 bg-[#00a99d] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!orderDirty || savingOrder} onClick={saveWorkflowOrder} type="button">
                    {savingOrder ? 'กำลังบันทึก...' : 'Save order'}
                  </button>
                )}
              <button className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100" onClick={() => setEditorOpen(false)} type="button">Close</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ConfigView
