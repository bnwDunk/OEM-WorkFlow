import { useEffect, useMemo, useState } from 'react'
import AddDepartmentModal from '../components/oem/admin/AddDepartmentModal'
import DepartmentDetailModal from '../components/oem/admin/DepartmentDetailModal'
import type { DepartmentWorkItem } from '../components/oem/admin/DepartmentDetailModal'
import AddUserModal from '../components/oem/admin/AddUserModal'
import type { NewUserDraft } from '../components/oem/admin/AddUserModal'
import FlowStructureEditorModal from '../components/oem/admin/FlowStructureEditorModal'
import type {
  FlowPhaseDraft,
  FlowStageDraft,
  FlowStructure,
} from '../components/oem/admin/FlowStructureEditorModal'
import { apiRequest } from '../lib/api'
import type {
  AppRole,
  ManagedDepartment,
  ManagedFlow,
  ManagedUser,
} from '../data/adminDashboard'

const roleOptions: AppRole[] = ['admin', 'manager', 'user']

type AdminDashboardProps = {
  token: string
}

type FlowDraft = Pick<ManagedFlow, 'name' | 'status'>

type DepartmentDetailState = {
  department: ManagedDepartment
  loading: boolean
  members: ManagedUser[]
  workItems: DepartmentWorkItem[]
}

function AdminDashboard({ token }: AdminDashboardProps) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [departments, setDepartments] = useState<ManagedDepartment[]>([])
  const [flows, setFlows] = useState<ManagedFlow[]>([])
  const [flowDrafts, setFlowDrafts] = useState<Record<number, FlowDraft>>({})
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
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [structureEditor, setStructureEditor] = useState<FlowStructure | null>(null)

  const stats = useMemo(
    () => ({
      activeUsers: users.filter((user) => user.status === 'active').length,
      admins: users.filter((user) => user.role === 'admin').length,
      activeDepartments: departments.filter((department) => department.status === 'active').length,
      activeFlows: flows.filter((flow) => flow.status === 'active').length,
      inactiveUsers: users.filter((user) => user.status === 'inactive').length,
    }),
    [departments, flows, users],
  )

  async function loadAdminData() {
    try {
      setError('')
      setLoading(true)
      const [usersResponse, departmentsResponse, flowsResponse] = await Promise.all([
        apiRequest<{ users: ManagedUser[] }>('/admin/users', { token }),
        apiRequest<{ departments: ManagedDepartment[] }>('/admin/departments', { token }),
        apiRequest<{ flows: ManagedFlow[] }>('/admin/flows', { token }),
      ])

      setUsers(usersResponse.users)
      setDepartments(departmentsResponse.departments)
      setFlows(flowsResponse.flows)
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
      setSourceFlowId(flowsResponse.flows[0]?.id || 0)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin data.')
      setUsers([])
      setDepartments([])
      setFlows([])
      setFlowDrafts({})
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

  return (
    <section className="page-pad admin-page">
      <div className="page-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage user access, department ownership, and account status for the OEM workflow.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {actionError && <p className="form-error">{actionError}</p>}
      {actionMessage && <p className="admin-success">{actionMessage}</p>}
      {loading && <p className="empty-note">Loading admin data...</p>}

      <div className="admin-stat-grid" aria-label="Admin summary">
        <div className="admin-stat">
          <span>Active users</span>
          <strong>{stats.activeUsers}</strong>
        </div>
        <div className="admin-stat">
          <span>Admins</span>
          <strong>{stats.admins}</strong>
        </div>
        <div className="admin-stat">
          <span>Departments</span>
          <strong>{stats.activeDepartments}</strong>
        </div>
        <div className="admin-stat">
          <span>Active flows</span>
          <strong>{stats.activeFlows}</strong>
        </div>
        <div className="admin-stat">
          <span>Inactive users</span>
          <strong>{stats.inactiveUsers}</strong>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <h2>Flow Management</h2>
            <p>Create a new workflow from an existing flow, then edit, disable, or delete templates.</p>
          </div>
          <div className="admin-inline-form flow-create-form">
            <select
              aria-label="Source flow"
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
              onChange={(event) => setNewFlowName(event.target.value)}
              placeholder="New flow name"
              value={newFlowName}
            />
            <button disabled={Boolean(busyAction) || !newFlowName.trim()} onClick={createFlowFromSource} type="button">
              {busyAction === 'flow-create' ? 'Creating...' : 'Create flow'}
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table flow-table">
            <thead>
              <tr>
                <th>Flow</th>
                <th>Based on</th>
                <th>Structure</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && flows.length === 0 && (
                <tr>
                  <td colSpan={6}>No flows found in database.</td>
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
                  <tr key={flow.id}>
                    <td>
                      <input
                        aria-label={`Name for ${flow.name}`}
                        onChange={(event) => updateFlowDraft(flow.id, { name: event.target.value })}
                        value={draft.name}
                      />
                      <span>{flow.code}</span>
                    </td>
                    <td>{getSourceFlowLabel(flow)}</td>
                    <td>
                      <button
                        className="update-text-btn"
                        disabled={Boolean(busyAction)}
                        onClick={() => openStructureEditor(flow)}
                        type="button"
                      >
                        {flow.stageCount} stages / {flow.phaseCount} phases
                      </button>
                    </td>
                    <td>
                      <select
                        aria-label={`Status for ${flow.name}`}
                        onChange={(event) => updateFlowDraft(flow.id, { status: event.target.value as ManagedFlow['status'] })}
                        value={draft.status}
                      >
                        <option value="active">active</option>
                        <option value="draft">draft</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td>{flow.updatedAt}</td>
                    <td>
                      <div className="flow-action-row">
                        <button
                          className="update-text-btn"
                          disabled={Boolean(busyAction) || !hasChanges}
                          onClick={() => saveFlowDetails(flow.id)}
                          type="button"
                        >
                          {busyAction === `flow-update-${flow.id}` ? 'Updating...' : 'Update'}
                        </button>
                        <button className="danger-text-btn" disabled={Boolean(busyAction)} onClick={() => deleteFlow(flow.id)} type="button">
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

      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <h2>Users</h2>
            <p>Create users, edit roles, and assign one or more departments.</p>
          </div>
          <button className="update-text-btn" onClick={() => setCreateUserOpen(true)} type="button">
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
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Departments</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </td>
                  <td>
                    <select
                      aria-label={`Role for ${user.name}`}
                      onChange={(event) => updateUser(user.id, { role: event.target.value as AppRole })}
                      value={user.role}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="grid min-w-[360px] gap-2">
                      <select
                        aria-label={`Departments for ${user.name}`}
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
                      <div className="flex min-h-10 flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        {(user.departmentIds || []).map((departmentId) => {
                          const department = departments.find((item) => item.id === departmentId)
                          if (!department) return null

                          return (
                            <span className="admin-user-chip" key={department.id}>
                              {department.name}
                              <button onClick={() => removeUserDepartment(user, department.id)} type="button">x</button>
                            </span>
                          )
                        })}
                        {(user.departmentIds || []).length === 0 && <span className="self-center text-xs font-extrabold text-slate-500">No department</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      className="danger-text-btn"
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

      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <h2>Departments</h2>
            <p>Create departments, review members, and inspect responsible workflow phases.</p>
          </div>
          <button
            className="admin-create-btn"
            disabled={Boolean(busyAction)}
            onClick={() => setCreateDepartmentOpen(true)}
            type="button"
          >
            Add department
          </button>
        </div>
        <div className="department-grid">
          {departments.map((department) => (
            <article
              className="department-tile department-tile-clickable"
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
                <strong>{department.name}</strong>
                <span>{department.code}</span>
              </div>
              <dl>
                <div>
                  <dt>Members</dt>
                  <dd>{department.memberCount}</dd>
                </div>
              </dl>
              <button
                className={`status-toggle ${department.status}`}
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
    </section>
  )
}

export default AdminDashboard
