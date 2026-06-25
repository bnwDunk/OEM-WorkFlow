import { useEffect, useMemo, useState } from 'react'
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
type FlowPhaseDraft = {
  id?: number
  label: string
  name: string
  departments?: Pick<ManagedDepartment, 'id' | 'name'>[]
  departmentIds?: number[]
}
type FlowStageDraft = {
  id?: number
  name: string
  phases: FlowPhaseDraft[]
}
type FlowStructure = {
  flow: Pick<ManagedFlow, 'id' | 'name'>
  stages: FlowStageDraft[]
}

function AdminDashboard({ token }: AdminDashboardProps) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [departments, setDepartments] = useState<ManagedDepartment[]>([])
  const [flows, setFlows] = useState<ManagedFlow[]>([])
  const [flowDrafts, setFlowDrafts] = useState<Record<number, FlowDraft>>({})
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newFlowName, setNewFlowName] = useState('')
  const [sourceFlowId, setSourceFlowId] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyAction, setBusyAction] = useState('')
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
      await loadAdminData()
      setActionMessage('Created department.')
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Failed to create department.')
    } finally {
      setBusyAction('')
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

  function togglePhaseDepartment(stageIndex: number, phaseIndex: number, departmentId: number) {
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

                  const departmentIds = phase.departmentIds || []
                  const nextDepartmentIds = departmentIds.includes(departmentId)
                    ? departmentIds.filter((item) => item !== departmentId)
                    : [...departmentIds, departmentId]

                  return {
                    ...phase,
                    departmentIds: nextDepartmentIds,
                  }
                }),
              }
            : stage,
        ),
      }
    })
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
            <p>Set roles, department assignment, and active status.</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last login</th>
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
                    <select
                      aria-label={`Department for ${user.name}`}
                      onChange={(event) => {
                        const departmentId = Number(event.target.value)
                        const department = departments.find((item) => item.id === departmentId)
                        updateUser(user.id, { department: department?.name || user.department, departmentId })
                      }}
                      value={user.departmentId || ''}
                    >
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className={`status-toggle ${user.status}`}
                      onClick={() => updateUser(user.id, { status: user.status === 'active' ? 'inactive' : 'active' })}
                      disabled={Boolean(busyAction)}
                      type="button"
                    >
                      {user.status}
                    </button>
                  </td>
                  <td>{user.lastLogin}</td>
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
            <p>Create departments and enable or disable department access.</p>
          </div>
          <div className="admin-inline-form">
            <input
              aria-label="New department name"
              onChange={(event) => setNewDepartmentName(event.target.value)}
              placeholder="Department name"
              value={newDepartmentName}
            />
            <button disabled={Boolean(busyAction) || !newDepartmentName.trim()} onClick={addDepartment} type="button">Add</button>
          </div>
        </div>
        <div className="department-grid">
          {departments.map((department) => (
            <article className="department-tile" key={department.id}>
              <div>
                <strong>{department.name}</strong>
                <span>{department.code}</span>
              </div>
              <dl>
                <div>
                  <dt>Manager</dt>
                  <dd>{department.manager}</dd>
                </div>
                <div>
                  <dt>Members</dt>
                  <dd>{department.memberCount}</dd>
                </div>
              </dl>
              <button
                className={`status-toggle ${department.status}`}
                disabled={Boolean(busyAction)}
                onClick={() => toggleDepartment(department.id)}
                type="button"
              >
                {department.status}
              </button>
            </article>
          ))}
        </div>
      </section>

      {structureEditor && (
        <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setStructureEditor(null)}>
          <section className="modal-box flow-structure-modal">
            <div className="structure-modal-head">
              <div>
                <h3>{structureEditor.flow.name}</h3>
                <p>Edit stages and phases for this flow.</p>
              </div>
              <button className="update-text-btn" onClick={addStage} type="button">Add stage</button>
            </div>

            <div className="structure-stage-list">
              {structureEditor.stages.map((stage, stageIndex) => (
                <section className="structure-stage" key={stage.id || `stage-${stageIndex}`}>
                  <div className="structure-stage-head">
                    <label>
                      Stage {stageIndex + 1}
                      <input
                        aria-label={`Stage ${stageIndex + 1} name`}
                        onChange={(event) => updateStage(stageIndex, { name: event.target.value })}
                        value={stage.name}
                      />
                    </label>
                    <button
                      className="danger-text-btn"
                      disabled={structureEditor.stages.length <= 1}
                      onClick={() => removeStage(stageIndex)}
                      type="button"
                    >
                      Delete stage
                    </button>
                  </div>

                  <div className="structure-phase-list">
                    {stage.phases.map((phase, phaseIndex) => (
                      <div className="structure-phase-row" key={phase.id || `phase-${phaseIndex}`}>
                        <div className="phase-fields">
                          <label>
                            Phase
                            <input
                              aria-label={`Phase ${phaseIndex + 1} label`}
                              onChange={(event) => updatePhase(stageIndex, phaseIndex, { label: event.target.value })}
                              value={phase.label}
                            />
                          </label>
                          <label>
                            Name
                            <input
                              aria-label={`Phase ${phaseIndex + 1} name`}
                              onChange={(event) => updatePhase(stageIndex, phaseIndex, { name: event.target.value })}
                              value={phase.name}
                            />
                          </label>
                          <button className="danger-text-btn" onClick={() => removePhase(stageIndex, phaseIndex)} type="button">
                            Delete
                          </button>
                        </div>
                        <div className="department-picker" aria-label={`Departments for ${phase.name}`}>
                          {departments.map((department) => {
                            const checked = (phase.departmentIds || []).includes(department.id)

                            return (
                              <label className={checked ? 'department-chip selected' : 'department-chip'} key={department.id}>
                                <input
                                  checked={checked}
                                  onChange={() => togglePhaseDepartment(stageIndex, phaseIndex, department.id)}
                                  type="checkbox"
                                />
                                {department.name}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <button className="update-text-btn add-phase-btn" onClick={() => addPhase(stageIndex)} type="button">Add phase</button>
                  </div>
                </section>
              ))}
            </div>

            <div className="modal-actions">
              <button className="ghost" disabled={Boolean(busyAction)} onClick={() => setStructureEditor(null)} type="button">Cancel</button>
              <button className="primary" disabled={Boolean(busyAction)} onClick={saveStructure} type="button">
                {busyAction.startsWith('flow-structure-save') ? 'Saving...' : 'Save structure'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default AdminDashboard
