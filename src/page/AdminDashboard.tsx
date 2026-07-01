import { useEffect, useMemo, useState } from 'react'
import AddDepartmentModal from '../components/oem/admin/AddDepartmentModal'
import DepartmentDetailModal from '../components/oem/admin/DepartmentDetailModal'
import type { DepartmentWorkItem } from '../components/oem/admin/DepartmentDetailModal'
import AddUserModal from '../components/oem/admin/AddUserModal'
import type { NewUserDraft } from '../components/oem/admin/AddUserModal'
import FlowStructureEditorModal from '../components/oem/admin/FlowStructureEditorModal'
import UserDetailModal from '../components/oem/admin/UserDetailModal'
import type {
  FlowPhaseDraft,
  FlowStageDraft,
  FlowStructure,
} from '../components/oem/admin/FlowStructureEditorModal'
import { apiRequest } from '../lib/api'
import { getCustomerStatusLabel } from '../data/oemWorkflow'
import { getRoleDisplayName } from '../data/adminDashboard'
import type {
  AppRole,
  ManagedDepartment,
  ManagedCustomerProject,
  ManagedFlow,
  ManagedTag,
  ManagedUser,
} from '../data/adminDashboard'

const roleOptions: AppRole[] = ['admin', 'manager', 'user']

const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]'
const cardHeadClass = 'flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5'
const tableWrapClass = 'overflow-x-auto px-6 pb-6'
const tableClass = 'w-full border-separate border-spacing-0 text-left'
const thClass = 'border-b border-slate-200 px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500 first:pl-0 last:pr-0'
const tdClass = 'border-b border-slate-100 px-5 py-4 align-middle text-sm font-semibold text-slate-700 first:pl-0 last:pr-0'
const inputClass = 'h-12 w-full rounded-xl !border !border-slate-200 !bg-white px-4 text-base font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none disabled:cursor-not-allowed disabled:opacity-60'
const selectClass = 'h-12 rounded-xl !border !border-slate-200 !bg-white px-4 text-base font-semibold text-slate-900 shadow-sm outline-none transition focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none disabled:cursor-not-allowed disabled:opacity-60'
const primaryButtonClass = 'min-h-10 rounded-xl !border-0 !bg-teal-700 px-4 text-sm font-black !text-white shadow-sm transition hover:!bg-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400 disabled:shadow-none'
const dangerButtonClass = 'min-h-10 rounded-xl !border-0 !bg-rose-50 px-4 text-sm font-black !text-rose-700 transition hover:!bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50'
const softButtonClass = 'min-h-10 rounded-xl !border !border-teal-100 !bg-teal-50 px-4 text-sm font-black !text-teal-800 transition hover:!bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50'

function getStatusBadgeClass(status: string) {
  if (status === 'active' || status === 'brief_spec') return 'inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-800'
  if (status === 'inactive') return 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500'
  if (status === 'draft') return 'inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700'
  return 'inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700'
}

function formatAdminDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '-'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

type AdminDashboardProps = {
  token: string
}

type FlowDraft = Pick<ManagedFlow, 'name' | 'status'>
type TagDraft = Pick<ManagedTag, 'color' | 'name'>

type DepartmentDetailState = {
  department: ManagedDepartment
  loading: boolean
  members: ManagedUser[]
  workItems: DepartmentWorkItem[]
}

function AdminDashboard({ token }: AdminDashboardProps) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [customers, setCustomers] = useState<ManagedCustomerProject[]>([])
  const [departments, setDepartments] = useState<ManagedDepartment[]>([])
  const [flows, setFlows] = useState<ManagedFlow[]>([])
  const [tags, setTags] = useState<ManagedTag[]>([])
  const [flowDrafts, setFlowDrafts] = useState<Record<number, FlowDraft>>({})
  const [tagDrafts, setTagDrafts] = useState<Record<number, TagDraft>>({})
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newFlowName, setNewFlowName] = useState('')
  const [newUser, setNewUser] = useState<NewUserDraft>({
    departmentIds: [],
    email: '',
    name: '',
    password: 'password123',
    role: 'user',
  })
  const [sourceFlowId, setSourceFlowId] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [createDepartmentOpen, setCreateDepartmentOpen] = useState(false)
  const [departmentDetail, setDepartmentDetail] = useState<DepartmentDetailState | null>(null)
  const [userDetail, setUserDetail] = useState<ManagedUser | null>(null)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [structureEditor, setStructureEditor] = useState<FlowStructure | null>(null)

  const stats = useMemo(
    () => ({
      activeUsers: users.filter((user) => user.status === 'active').length,
      admins: users.filter((user) => user.role === 'admin').length,
      activeDepartments: departments.filter((department) => department.status === 'active').length,
      customerCount: customers.length,
      activeFlows: flows.filter((flow) => flow.status === 'active').length,
      activeTags: tags.filter((tag) => tag.status === 'active').length,
      inactiveUsers: users.filter((user) => user.status === 'inactive').length,
    }),
    [customers, departments, flows, tags, users],
  )

  async function loadAdminData() {
    try {
      setError('')
      setLoading(true)
      const [usersResponse, departmentsResponse, flowsResponse, tagsResponse, customersResponse] = await Promise.all([
        apiRequest<{ users: ManagedUser[] }>('/admin/users', { token }),
        apiRequest<{ departments: ManagedDepartment[] }>('/admin/departments', { token }),
        apiRequest<{ flows: ManagedFlow[] }>('/admin/flows', { token }),
        apiRequest<{ tags: ManagedTag[] }>('/admin/tags', { token }),
        apiRequest<{ customers: ManagedCustomerProject[] }>('/admin/customers', { token }),
      ])

      setUsers(usersResponse.users)
      setCustomers(customersResponse.customers)
      setDepartments(departmentsResponse.departments)
      setFlows(flowsResponse.flows)
      setTags(tagsResponse.tags)
      setFlowDrafts(
        Object.fromEntries(
          flowsResponse.flows.map((flow) => [
            flow.id,
            {
              name: flow.name,
              status: flow.status,
            },
          ]),
        ),
      )
      setTagDrafts(
        Object.fromEntries(
          tagsResponse.tags.map((tag) => [
            tag.id,
            {
              color: tag.color || '#0f766e',
              name: tag.name,
            },
          ]),
        ),
      )
      setSourceFlowId(flowsResponse.flows[0]?.id || 0)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin data.')
      setUsers([])
      setCustomers([])
      setDepartments([])
      setFlows([])
      setTags([])
      setFlowDrafts({})
      setTagDrafts({})
      setSourceFlowId(0)
    } finally {
      setLoading(false)
    }
  }

  function resetNewUserForm() {
    setNewUser({ departmentIds: [], email: '', name: '', password: 'password123', role: 'user' })
  }

  function closeCreateUserModal() {
    if (busyAction === 'user-create') return
    resetNewUserForm()
    setCreateUserOpen(false)
  }

  function closeCreateDepartmentModal() {
    if (busyAction === 'department-create') return
    setNewDepartmentName('')
    setCreateDepartmentOpen(false)
  }

  function getDepartmentMembers(department: ManagedDepartment) {
    return users.filter((user) => {
      const departmentIds = user.departmentIds || []

      return departmentIds.includes(department.id) || user.departmentId === department.id || user.department === department.name
    })
  }

  useEffect(() => {
    loadAdminData()
  }, [token])

  async function updateUser(userId: number, patch: Partial<ManagedUser>) {
    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`user-${userId}`)
      await apiRequest(`/admin/users/${userId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(patch),
      })

      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, ...patch } : user)),
      )
      setActionMessage('Updated user.')
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'Failed to update user.')
    } finally {
      setBusyAction('')
    }
  }

  async function createUser() {
    const name = newUser.name.trim()
    const email = newUser.email.trim().toLowerCase()
    if (!name || !email) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction('user-create')
      await apiRequest('/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          departmentIds: newUser.departmentIds,
          email,
          name,
          password: newUser.password || 'password123',
          role: newUser.role,
        }),
      })
      resetNewUserForm()
      setCreateUserOpen(false)
      await loadAdminData()
      setActionMessage('Created user.')
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Failed to create user.')
    } finally {
      setBusyAction('')
    }
  }

  async function deleteUser(userId: number) {
    const user = users.find((item) => item.id === userId)
    if (!window.confirm(`Delete ${user?.name || 'this user'}?`)) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`user-delete-${userId}`)
      await apiRequest(`/admin/users/${userId}`, {
        method: 'DELETE',
        token,
      })
      setUsers((current) => current.filter((user) => user.id !== userId))
      setActionMessage('Deleted user.')
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user.')
    } finally {
      setBusyAction('')
    }
  }

  function addUserDepartment(user: ManagedUser, departmentId: number) {
    if (!departmentId) return
    const departmentIds = user.departmentIds || []
    if (departmentIds.includes(departmentId)) return

    updateUser(user.id, { departmentIds: [...departmentIds, departmentId] })
  }

  function removeUserDepartment(user: ManagedUser, departmentId: number) {
    const nextDepartmentIds = (user.departmentIds || []).filter((item) => item !== departmentId)
    updateUser(user.id, { departmentIds: nextDepartmentIds })
  }

  function addNewUserDepartment(departmentId: number) {
    if (!departmentId) return
    setNewUser((current) => ({
      ...current,
      departmentIds: current.departmentIds.includes(departmentId)
        ? current.departmentIds
        : [...current.departmentIds, departmentId],
    }))
  }

  function removeNewUserDepartment(departmentId: number) {
    setNewUser((current) => ({
      ...current,
      departmentIds: current.departmentIds.filter((item) => item !== departmentId),
    }))
  }

  async function toggleDepartment(departmentId: number) {
    const department = departments.find((item) => item.id === departmentId)
    if (!department) return

    const status = department.status === 'active' ? 'inactive' : 'active'
    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`department-${departmentId}`)
      await apiRequest(`/admin/departments/${departmentId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      })

      setDepartments((current) =>
        current.map((department) =>
          department.id === departmentId
            ? { ...department, status }
            : department,
        ),
      )
      setDepartmentDetail((current) =>
        current?.department.id === departmentId
          ? { ...current, department: { ...current.department, status } }
          : current,
      )
      setActionMessage('Updated department.')
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'Failed to update department.')
    } finally {
      setBusyAction('')
    }
  }

  async function addDepartment() {
    const name = newDepartmentName.trim()
    if (!name) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction('department-create')
      await apiRequest('/admin/departments', {
        method: 'POST',
        token,
        body: JSON.stringify({ name }),
      })
      setNewDepartmentName('')
      setCreateDepartmentOpen(false)
      await loadAdminData()
      setActionMessage('Created department.')
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Failed to create department.')
    } finally {
      setBusyAction('')
    }
  }

  async function openDepartmentDetail(department: ManagedDepartment) {
    setDepartmentDetail({
      department,
      loading: true,
      members: getDepartmentMembers(department),
      workItems: [],
    })

    try {
      setActionError('')
      const structures = await Promise.all(
        flows.map((flow) =>
          apiRequest<FlowStructure>(`/admin/flows/${flow.id}/structure`, { token })
            .catch(() => null),
        ),
      )
      const workItems = structures.flatMap((structure) => {
        if (!structure) return []

        return structure.stages.flatMap((stage) =>
          stage.phases
            .filter((phase) => {
              const departmentIds = phase.departmentIds || phase.departments?.map((item) => item.id) || []
              return departmentIds.includes(department.id)
            })
            .map((phase) => ({
              flowId: structure.flow.id,
              flowName: structure.flow.name,
              phaseLabel: phase.label,
              phaseName: phase.name,
              stageName: stage.name,
            })),
        )
      })

      setDepartmentDetail((current) =>
        current?.department.id === department.id
          ? {
              ...current,
              loading: false,
              members: getDepartmentMembers(department),
              workItems,
            }
          : current,
      )
    } catch (loadError) {
      setActionError(loadError instanceof Error ? loadError.message : 'Failed to load department detail.')
      setDepartmentDetail((current) =>
        current?.department.id === department.id ? { ...current, loading: false } : current,
      )
    }
  }

  function getFlowName(flowId: number | null) {
    if (!flowId) return 'Original'
    return flows.find((flow) => flow.id === flowId)?.name || 'Unknown source'
  }

  function getSourceFlowLabel(flow: ManagedFlow) {
    return flow.sourceFlowName || getFlowName(flow.sourceFlowId)
  }

  function updateFlowDraft(flowId: number, patch: Partial<FlowDraft>) {
    setFlowDrafts((current) => ({
      ...current,
      [flowId]: {
        ...current[flowId],
        ...patch,
      },
    }))
  }

  function updateTagDraft(tagId: number, patch: Partial<TagDraft>) {
    setTagDrafts((current) => ({
      ...current,
      [tagId]: {
        ...current[tagId],
        ...patch,
      },
    }))
  }

  async function openStructureEditor(flow: ManagedFlow) {
    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`flow-structure-${flow.id}`)
      const response = await apiRequest<FlowStructure>(`/admin/flows/${flow.id}/structure`, { token })
      setStructureEditor({
        ...response,
        stages: response.stages.map((stage) => ({
          ...stage,
          phases: stage.phases.map((phase) => ({
            ...phase,
            departmentIds: phase.departments?.map((department) => department.id) || [],
          })),
        })),
      })
    } catch (loadError) {
      setActionError(loadError instanceof Error ? loadError.message : 'Failed to load flow structure.')
    } finally {
      setBusyAction('')
    }
  }

  function updateStage(stageIndex: number, patch: Partial<FlowStageDraft>) {
    setStructureEditor((current) => {
      if (!current) return current

      return {
        ...current,
        stages: current.stages.map((stage, index) =>
          index === stageIndex ? { ...stage, ...patch } : stage,
        ),
      }
    })
  }

  function updatePhase(stageIndex: number, phaseIndex: number, patch: Partial<FlowPhaseDraft>) {
    setStructureEditor((current) => {
      if (!current) return current

      return {
        ...current,
        stages: current.stages.map((stage, index) =>
          index === stageIndex
            ? {
                ...stage,
                phases: stage.phases.map((phase, itemIndex) =>
                  itemIndex === phaseIndex ? { ...phase, ...patch } : phase,
                ),
              }
            : stage,
        ),
      }
    })
  }

  function addStage() {
    setStructureEditor((current) => {
      if (!current) return current

      return {
        ...current,
        stages: [
          ...current.stages,
          {
            name: `Stage ${current.stages.length + 1}`,
            phases: [{ label: '1', name: 'New phase', departmentIds: departments[0] ? [departments[0].id] : [] }],
          },
        ],
      }
    })
  }

  function removeStage(stageIndex: number) {
    setStructureEditor((current) => {
      if (!current || current.stages.length <= 1) return current

      return {
        ...current,
        stages: current.stages.filter((_, index) => index !== stageIndex),
      }
    })
  }

  function addPhase(stageIndex: number) {
    setStructureEditor((current) => {
      if (!current) return current

      return {
        ...current,
        stages: current.stages.map((stage, index) =>
          index === stageIndex
            ? {
                ...stage,
                phases: [
                  ...stage.phases,
                  { label: String(stage.phases.length + 1), name: 'New phase', departmentIds: departments[0] ? [departments[0].id] : [] },
                ],
              }
            : stage,
        ),
      }
    })
  }

  function removePhase(stageIndex: number, phaseIndex: number) {
    setStructureEditor((current) => {
      if (!current) return current

      return {
        ...current,
        stages: current.stages.map((stage, index) =>
          index === stageIndex
            ? { ...stage, phases: stage.phases.filter((_, itemIndex) => itemIndex !== phaseIndex) }
            : stage,
        ),
      }
    })
  }

  function updatePhaseDepartments(stageIndex: number, phaseIndex: number, updater: (departmentIds: number[]) => number[]) {
    setStructureEditor((current) => {
      if (!current) return current

      return {
        ...current,
        stages: current.stages.map((stage, index) =>
          index === stageIndex
            ? {
                ...stage,
                phases: stage.phases.map((phase, itemIndex) => {
                  if (itemIndex !== phaseIndex) return phase

                  return {
                    ...phase,
                    departmentIds: updater(phase.departmentIds || []),
                  }
                }),
              }
            : stage,
        ),
      }
    })
  }

  function addPhaseDepartment(stageIndex: number, phaseIndex: number, departmentId: number) {
    if (!departmentId) return

    updatePhaseDepartments(stageIndex, phaseIndex, (departmentIds) =>
      departmentIds.includes(departmentId) ? departmentIds : [...departmentIds, departmentId],
    )
  }

  function removePhaseDepartment(stageIndex: number, phaseIndex: number, departmentId: number) {
    updatePhaseDepartments(stageIndex, phaseIndex, (departmentIds) =>
      departmentIds.filter((item) => item !== departmentId),
    )
  }

  async function saveStructure() {
    if (!structureEditor) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`flow-structure-save-${structureEditor.flow.id}`)
      const stages = structureEditor.stages.map((stage) => ({
        ...stage,
        phases: stage.phases.map((phase) => ({
          id: phase.id,
          label: phase.label,
          name: phase.name,
          departmentIds: phase.departmentIds || [],
        })),
      }))

      await apiRequest(`/admin/flows/${structureEditor.flow.id}/structure`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ stages }),
      })
      setStructureEditor(null)
      await loadAdminData()
      setActionMessage('Updated flow structure.')
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Failed to update flow structure.')
    } finally {
      setBusyAction('')
    }
  }

  async function saveFlowDetails(flowId: number) {
    const draft = flowDrafts[flowId]
    if (!draft) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`flow-update-${flowId}`)
      await apiRequest(`/admin/flows/${flowId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(draft),
      })

      setFlows((current) =>
        current.map((flow) => (flow.id === flowId ? { ...flow, ...draft, updatedAt: 'Just now' } : flow)),
      )
      setActionMessage('Updated flow.')
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'Failed to update flow.')
    } finally {
      setBusyAction('')
    }
  }

  async function createFlowFromSource() {
    const source = flows.find((flow) => flow.id === sourceFlowId)
    const name = newFlowName.trim()
    if (!name) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction('flow-create')
      await apiRequest('/admin/flows', {
        method: 'POST',
        token,
        body: JSON.stringify(source ? { name, sourceFlowId: source.id } : { name }),
      })
      setNewFlowName('')
      await loadAdminData()
      setActionMessage('Created flow.')
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Failed to create flow.')
    } finally {
      setBusyAction('')
    }
  }

  async function deleteFlow(flowId: number) {
    if (flows.length <= 1) {
      setActionError('Cannot delete the last flow template.')
      return
    }

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`flow-delete-${flowId}`)
      await apiRequest(`/admin/flows/${flowId}`, {
        method: 'DELETE',
        token,
      })

      setFlows((current) => current.filter((flow) => flow.id !== flowId))
      setActionMessage('Deleted flow.')
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete flow.')
    } finally {
      setBusyAction('')
    }
  }

  async function saveTag(tagId: number) {
    const draft = tagDrafts[tagId]
    if (!draft?.name.trim()) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`tag-update-${tagId}`)
      await apiRequest(`/admin/tags/${tagId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          color: draft.color || '#0f766e',
          name: draft.name.trim(),
        }),
      })
      await loadAdminData()
      setActionMessage('Updated tag.')
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'Failed to update tag.')
    } finally {
      setBusyAction('')
    }
  }

  async function deleteTag(tagId: number) {
    const tag = tags.find((item) => item.id === tagId)
    if (!window.confirm(`Delete tag ${tag?.name || ''}? It will be removed from every customer.`)) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`tag-delete-${tagId}`)
      await apiRequest(`/admin/tags/${tagId}`, {
        method: 'DELETE',
        token,
      })
      setTags((current) => current.filter((item) => item.id !== tagId))
      setTagDrafts((current) => {
        const next = { ...current }
        delete next[tagId]
        return next
      })
      setActionMessage('Deleted tag.')
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete tag.')
    } finally {
      setBusyAction('')
    }
  }

  async function deleteCustomer(customerId: number) {
    const customer = customers.find((item) => item.id === customerId)
    if (!window.confirm(`Delete customer ${customer?.name || ''}? This will remove its workflow data and tags.`)) return

    try {
      setActionError('')
      setActionMessage('')
      setBusyAction(`customer-delete-${customerId}`)
      await apiRequest(`/admin/customers/${customerId}`, {
        method: 'DELETE',
        token,
      })
      setCustomers((current) => current.filter((item) => item.id !== customerId))
      setActionMessage('Deleted customer.')
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete customer.')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <section className="min-h-[calc(100svh-52px)] bg-white px-5 py-6 sm:px-8">
      <div className="mx-auto mb-6 flex max-w-7xl flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-teal-700">OEM Admin</p>
          <h1 className="m-0 text-3xl font-black text-slate-950">Admin Dashboard</h1>
          <p className="m-0 mt-2 text-sm font-semibold text-slate-500">
            Manage user access, department ownership, and account status for the OEM workflow.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6">
      {error && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      {actionError && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{actionError}</p>}
      {actionMessage && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{actionMessage}</p>}
      {loading && <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Loading admin data...</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" aria-label="Admin summary">
        {[
          ['Active users', stats.activeUsers],
          ['Admins', stats.admins],
          ['Departments', stats.activeDepartments],
          ['Customers', stats.customerCount],
          ['Active flows', stats.activeFlows],
          ['Tags', stats.activeTags],
          ['Inactive users', stats.inactiveUsers],
        ].map(([label, value]) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={label}>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
            <strong className="mt-2 block text-3xl font-black text-slate-950">{value}</strong>
          </div>
        ))}
      </div>

      <section className={cardClass}>
        <div className={cardHeadClass}>
          <div>
            <h2 className="m-0 text-xl font-black text-slate-950">Flow Management</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
              Create a new workflow from an existing flow, then edit, disable, or delete templates.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(180px,240px)_minmax(180px,240px)_auto]">
            <select
              aria-label="Source flow"
              className={selectClass}
              onChange={(event) => setSourceFlowId(Number(event.target.value))}
              disabled={flows.length === 0}
              value={sourceFlowId}
            >
              {flows.length === 0 && <option value={0}>Standard OEM template</option>}
              {flows.map((flow) => (
                <option key={flow.id} value={flow.id}>{flow.name}</option>
              ))}
            </select>
            <input
              aria-label="New flow name"
              className={inputClass}
              onChange={(event) => setNewFlowName(event.target.value)}
              placeholder="New flow name"
              value={newFlowName}
            />
            <button className={primaryButtonClass} disabled={Boolean(busyAction) || !newFlowName.trim()} onClick={createFlowFromSource} type="button">
              {busyAction === 'flow-create' ? 'Creating...' : 'Create flow'}
            </button>
          </div>
        </div>

        <div className={tableWrapClass}>
          <table className={`${tableClass} min-w-[980px]`}>
            <thead>
              <tr>
                <th className={thClass}>Flow</th>
                <th className={thClass}>Based on</th>
                <th className={thClass}>Structure</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Updated</th>
                <th className={thClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && flows.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-sm font-bold text-slate-400" colSpan={6}>No flows found in database.</td>
                </tr>
              )}
              {flows.map((flow) => {
                const draft = flowDrafts[flow.id] || {
                  name: flow.name,
                  status: flow.status,
                }
                const hasChanges =
                  draft.name !== flow.name ||
                  draft.status !== flow.status

                return (
                  <tr className="group" key={flow.id}>
                    <td className={tdClass}>
                      <input
                        aria-label={`Name for ${flow.name}`}
                        className={inputClass}
                        onChange={(event) => updateFlowDraft(flow.id, { name: event.target.value })}
                        value={draft.name}
                      />
                      <span className="mt-1 block text-xs font-black uppercase tracking-wide text-slate-400">{flow.code}</span>
                    </td>
                    <td className={tdClass}>{getSourceFlowLabel(flow)}</td>
                    <td className={tdClass}>
                      <button
                        className={softButtonClass}
                        disabled={Boolean(busyAction)}
                        onClick={() => openStructureEditor(flow)}
                        type="button"
                      >
                        {flow.stageCount} stages / {flow.phaseCount} phases
                      </button>
                    </td>
                    <td className={tdClass}>
                      <select
                        aria-label={`Status for ${flow.name}`}
                        className={selectClass}
                        onChange={(event) => updateFlowDraft(flow.id, { status: event.target.value as ManagedFlow['status'] })}
                        value={draft.status}
                      >
                        <option value="active">active</option>
                        <option value="draft">draft</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td className={`${tdClass} text-slate-500`}>{formatAdminDate(flow.updatedAt)}</td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={primaryButtonClass}
                          disabled={Boolean(busyAction) || !hasChanges}
                          onClick={() => saveFlowDetails(flow.id)}
                          type="button"
                        >
                          {busyAction === `flow-update-${flow.id}` ? 'Updating...' : 'Update'}
                        </button>
                        <button className={dangerButtonClass} disabled={Boolean(busyAction)} onClick={() => deleteFlow(flow.id)} type="button">
                          {busyAction === `flow-delete-${flow.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cardClass}>
        <div className={cardHeadClass}>
          <div>
            <h2 className="m-0 text-xl font-black text-slate-950">Customers</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
              Review customer projects and delete records that should no longer appear in the workflow.
            </p>
          </div>
        </div>

        <div className={tableWrapClass}>
          <table className={`${tableClass} min-w-[900px]`}>
            <thead>
              <tr>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Flow</th>
                <th className={thClass}>Current phase</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Updated</th>
                <th className={thClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && customers.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-sm font-bold text-slate-400" colSpan={6}>No customers found in database.</td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr className="group" key={customer.id}>
                  <td className={tdClass}>
                    <strong className="block text-base font-black text-slate-950">{customer.name}</strong>
                    <span className="text-xs font-bold text-slate-400">{customer.slug}</span>
                  </td>
                  <td className={tdClass}>{customer.flowName || '-'}</td>
                  <td className={tdClass}>{customer.currentPhaseName || '-'}</td>
                  <td className={tdClass}>
                    <span className={getStatusBadgeClass(customer.status)}>{getCustomerStatusLabel(customer.status)}</span>
                  </td>
                  <td className={`${tdClass} text-slate-500`}>{formatAdminDate(customer.updatedAt)}</td>
                  <td className={tdClass}>
                    <button
                      className={dangerButtonClass}
                      disabled={Boolean(busyAction)}
                      onClick={() => deleteCustomer(customer.id)}
                      type="button"
                    >
                      {busyAction === `customer-delete-${customer.id}` ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="m-0 text-xl font-black text-slate-950">Tags</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
              Edit tag labels and colors, or remove tags from every customer.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-700">
            {tags.length} tags
          </span>
        </div>

        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="border-b border-slate-200 py-4 pr-5 text-xs font-black uppercase tracking-wide text-slate-500">Preview</th>
                <th className="border-b border-slate-200 px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Name</th>
                <th className="border-b border-slate-200 px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Color</th>
                <th className="border-b border-slate-200 px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Used by</th>
                <th className="border-b border-slate-200 px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Updated</th>
                <th className="border-b border-slate-200 py-4 pl-5 text-xs font-black uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && tags.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-sm font-bold text-slate-400" colSpan={6}>
                    No tags found.
                  </td>
                </tr>
              )}
              {tags.map((tag) => {
                const draft = tagDrafts[tag.id] || {
                  color: tag.color || '#0f766e',
                  name: tag.name,
                }
                const color = draft.color || '#0f766e'
                const hasChanges =
                  draft.name !== tag.name ||
                  color !== (tag.color || '#0f766e')

                return (
                  <tr className="group" key={tag.id}>
                    <td className="border-b border-slate-100 py-4 pr-5 align-middle">
                      <span
                        className="inline-flex max-w-[220px] items-center rounded-full px-4 py-2 text-sm font-black text-white shadow-sm transition group-hover:shadow-md"
                        style={{ background: color }}
                      >
                        <span className="truncate">
                        {draft.name || tag.name}
                        </span>
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4 align-middle">
                      <input
                        aria-label={`Name for ${tag.name}`}
                        className="h-12 w-full rounded-xl !border !border-slate-200 !bg-white px-4 text-base font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:!border-teal-600 focus:ring-4 focus:ring-teal-100 focus-visible:!outline-none"
                        onChange={(event) => updateTagDraft(tag.id, { name: event.target.value })}
                        value={draft.name}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4 align-middle">
                      <label className="inline-flex h-12 items-center gap-3 rounded-xl !border !border-slate-200 bg-white px-3 shadow-sm transition focus-within:!border-teal-600 focus-within:ring-4 focus-within:ring-teal-100">
                        <span className="h-7 w-7 rounded-lg shadow-inner ring-1 ring-black/10" style={{ background: color }} />
                        <span className="font-mono text-xs font-bold uppercase text-slate-500">{color}</span>
                        <input
                          aria-label={`Color for ${tag.name}`}
                          className="h-7 w-7 cursor-pointer opacity-0"
                          onChange={(event) => updateTagDraft(tag.id, { color: event.target.value })}
                          type="color"
                          value={color}
                        />
                      </label>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4 align-middle">
                      <span className="inline-flex min-w-10 justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                        {tag.customerCount}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-4 align-middle text-sm font-semibold text-slate-500">
                      {formatAdminDate(tag.updatedAt)}
                    </td>
                    <td className="border-b border-slate-100 py-4 pl-5 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="min-h-10 rounded-xl !border-0 !bg-teal-700 px-4 text-sm font-black !text-white shadow-sm transition hover:!bg-teal-800 disabled:cursor-not-allowed disabled:!bg-slate-200 disabled:!text-slate-400 disabled:shadow-none"
                          disabled={Boolean(busyAction) || !hasChanges || !draft.name.trim()}
                          onClick={() => saveTag(tag.id)}
                          type="button"
                        >
                          {busyAction === `tag-update-${tag.id}` ? 'Updating...' : 'Update'}
                        </button>
                        <button
                          className="min-h-10 rounded-xl !border-0 !bg-rose-50 px-4 text-sm font-black !text-rose-700 transition hover:!bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={Boolean(busyAction)}
                          onClick={() => deleteTag(tag.id)}
                          type="button"
                        >
                          {busyAction === `tag-delete-${tag.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cardClass}>
        <div className={cardHeadClass}>
          <div>
            <h2 className="m-0 text-xl font-black text-slate-950">Users</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Create users, edit roles, and assign one or more departments.</p>
          </div>
          <button className={primaryButtonClass} onClick={() => setCreateUserOpen(true)} type="button">
            Add user
          </button>
        </div>
        {createUserOpen && (
          <AddUserModal
            busy={busyAction === 'user-create'}
            departments={departments}
            draft={newUser}
            onAddDepartment={addNewUserDepartment}
            onChange={(patch) => setNewUser((current) => ({ ...current, ...patch }))}
            onClose={closeCreateUserModal}
            onRemoveDepartment={removeNewUserDepartment}
            onSubmit={() => void createUser()}
            roleOptions={roleOptions}
          />
        )}
        <div className={tableWrapClass}>
          <table className={`${tableClass} min-w-[980px]`}>
            <thead>
              <tr>
                <th className={thClass}>User</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Departments</th>
                <th className={thClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="group" key={user.id}>
                  <td className={tdClass}>
                    <button
                      className="block !border-0 !bg-transparent p-0 text-left text-base font-black !text-slate-950 shadow-none transition hover:!text-teal-700 focus-visible:!outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                      onClick={() => setUserDetail(user)}
                      type="button"
                    >
                      {user.name}
                    </button>
                    <span className="text-xs font-bold text-slate-500">{user.email}</span>
                  </td>
                  <td className={tdClass}>
                    <select
                      aria-label={`Role for ${user.name}`}
                      className={selectClass}
                      onChange={(event) => updateUser(user.id, { role: event.target.value as AppRole })}
                      value={user.role}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                      ))}
                    </select>
                  </td>
                  <td className={tdClass}>
                    <div className="grid min-w-[360px] gap-2">
                      <select
                        aria-label={`Departments for ${user.name}`}
                        className={selectClass}
                        onChange={(event) => {
                          addUserDepartment(user, Number(event.target.value))
                          event.currentTarget.value = ''
                        }}
                        value=""
                      >
                        <option value="">Add department...</option>
                        {departments
                          .filter((department) => !(user.departmentIds || []).includes(department.id))
                          .map((department) => (
                            <option key={department.id} value={department.id}>{department.name}</option>
                          ))}
                      </select>
                      <div className="flex min-h-11 flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        {(user.departmentIds || []).map((departmentId) => {
                          const department = departments.find((item) => item.id === departmentId)
                          if (!department) return null

                          return (
                            <span className="inline-flex items-center overflow-hidden rounded-full border border-teal-100 bg-teal-50 text-xs font-black text-teal-800" key={department.id}>
                              <span className="px-3 py-1.5">
                              {department.name}
                              </span>
                              <button
                                className="mr-1 grid h-5 w-5 place-items-center rounded-full !border-0 !bg-transparent text-sm font-black leading-none !text-teal-700 opacity-70 transition hover:!bg-teal-100 hover:opacity-100"
                                onClick={() => removeUserDepartment(user, department.id)}
                                type="button"
                              >
                                x
                              </button>
                            </span>
                          )
                        })}
                        {(user.departmentIds || []).length === 0 && <span className="self-center text-xs font-extrabold text-slate-500">No department</span>}
                      </div>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <button
                      className={dangerButtonClass}
                      onClick={() => deleteUser(user.id)}
                      disabled={Boolean(busyAction)}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cardClass}>
        <div className={cardHeadClass}>
          <div>
            <h2 className="m-0 text-xl font-black text-slate-950">Departments</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Create departments, review members, and inspect responsible workflow phases.</p>
          </div>
          <button
            className={primaryButtonClass}
            disabled={Boolean(busyAction)}
            onClick={() => setCreateDepartmentOpen(true)}
            type="button"
          >
            Add department
          </button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <article
              className="grid cursor-pointer gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
              key={department.id}
              onClick={() => openDepartmentDetail(department)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openDepartmentDetail(department)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div>
                <strong className="block text-lg font-black text-slate-950">{department.name}</strong>
                <span className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">{department.code}</span>
              </div>
              <dl className="m-0 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">Members</dt>
                  <dd className="m-0 mt-1 text-2xl font-black text-slate-950">{department.memberCount}</dd>
                </div>
              </dl>
              <button
                className={department.status === 'active' ? primaryButtonClass : 'min-h-10 rounded-xl !border-0 !bg-slate-200 px-4 text-sm font-black !text-slate-600 transition hover:!bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50'}
                disabled={Boolean(busyAction)}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleDepartment(department.id)
                }}
                type="button"
              >
                {department.status}
              </button>
            </article>
          ))}
        </div>
      </section>

      {createDepartmentOpen && (
        <AddDepartmentModal
          busy={busyAction === 'department-create'}
          name={newDepartmentName}
          onChangeName={setNewDepartmentName}
          onClose={closeCreateDepartmentModal}
          onSubmit={addDepartment}
        />
      )}

      {departmentDetail && (
        <DepartmentDetailModal
          busy={Boolean(busyAction)}
          department={departmentDetail.department}
          loading={departmentDetail.loading}
          members={departmentDetail.members}
          onClose={() => setDepartmentDetail(null)}
          onToggleStatus={toggleDepartment}
          workItems={departmentDetail.workItems}
        />
      )}

      {userDetail && (
        <UserDetailModal
          onClose={() => setUserDetail(null)}
          user={userDetail}
        />
      )}

      {structureEditor && (
        <FlowStructureEditorModal
          busyAction={busyAction}
          departments={departments}
          onAddPhase={addPhase}
          onAddPhaseDepartment={addPhaseDepartment}
          onAddStage={addStage}
          onClose={() => setStructureEditor(null)}
          onRemovePhase={removePhase}
          onRemovePhaseDepartment={removePhaseDepartment}
          onRemoveStage={removeStage}
          onSave={saveStructure}
          onUpdatePhase={updatePhase}
          onUpdateStage={updateStage}
          structure={structureEditor}
        />
      )}
      </div>
    </section>
  )
}

export default AdminDashboard
