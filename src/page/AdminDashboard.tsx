import { useEffect, useMemo, useState } from 'react'
import {
  demoDepartments,
  demoFlows,
  demoUsers,
} from '../data/adminDashboard'
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

type FlowDraft = Pick<ManagedFlow, 'name' | 'status' | 'version'>

function AdminDashboard({ token }: AdminDashboardProps) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [departments, setDepartments] = useState<ManagedDepartment[]>([])
  const [flows, setFlows] = useState<ManagedFlow[]>([])
  const [flowDrafts, setFlowDrafts] = useState<Record<number, FlowDraft>>({})
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newFlowName, setNewFlowName] = useState('')
  const [sourceFlowId, setSourceFlowId] = useState(demoFlows[0]?.id || 0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
              version: flow.version,
            },
          ]),
        ),
      )
      setSourceFlowId(flowsResponse.flows[0]?.id || 0)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin data.')
      setUsers(demoUsers)
      setDepartments(demoDepartments)
      setFlows(demoFlows)
      setFlowDrafts(
        Object.fromEntries(
          demoFlows.map((flow) => [
            flow.id,
            {
              name: flow.name,
              status: flow.status,
              version: flow.version,
            },
          ]),
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [token])

  async function updateUser(userId: number, patch: Partial<ManagedUser>) {
    await apiRequest(`/admin/users/${userId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(patch),
    })

    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, ...patch } : user)),
    )
  }

  async function toggleDepartment(departmentId: number) {
    const department = departments.find((item) => item.id === departmentId)
    if (!department) return

    const status = department.status === 'active' ? 'inactive' : 'active'
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
  }

  async function addDepartment() {
    const name = newDepartmentName.trim()
    if (!name) return

    await apiRequest('/admin/departments', {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    })
    setNewDepartmentName('')
    await loadAdminData()
  }

  function getFlowName(flowId: number | null) {
    if (!flowId) return 'Original'
    return flows.find((flow) => flow.id === flowId)?.name || 'Unknown source'
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

  async function saveFlowDetails(flowId: number) {
    const draft = flowDrafts[flowId]
    if (!draft) return

    await apiRequest(`/admin/flows/${flowId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(draft),
    })

    setFlows((current) =>
      current.map((flow) => (flow.id === flowId ? { ...flow, ...draft, updatedAt: 'Just now' } : flow)),
    )
  }

  async function createFlowFromSource() {
    const source = flows.find((flow) => flow.id === sourceFlowId)
    const name = newFlowName.trim()
    if (!source || !name) return

    await apiRequest('/admin/flows', {
      method: 'POST',
      token,
      body: JSON.stringify({ name, sourceFlowId: source.id }),
    })
    setNewFlowName('')
    await loadAdminData()
  }

  async function deleteFlow(flowId: number) {
    if (flows.length <= 1) return

    await apiRequest(`/admin/flows/${flowId}`, {
      method: 'DELETE',
      token,
    })

    setFlows((current) => current.filter((flow) => flow.id !== flowId))
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
              value={sourceFlowId}
            >
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
            <button onClick={createFlowFromSource} type="button">Create flow</button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table flow-table">
            <thead>
              <tr>
                <th>Flow</th>
                <th>Based on</th>
                <th>Version</th>
                <th>Structure</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {flows.map((flow) => {
                const draft = flowDrafts[flow.id] || {
                  name: flow.name,
                  status: flow.status,
                  version: flow.version,
                }
                const hasChanges =
                  draft.name !== flow.name ||
                  draft.status !== flow.status ||
                  draft.version !== flow.version

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
                    <td>{getFlowName(flow.sourceFlowId)}</td>
                    <td>
                      <input
                        aria-label={`Version for ${flow.name}`}
                        min="1"
                        onChange={(event) => updateFlowDraft(flow.id, { version: Number(event.target.value) || 1 })}
                        type="number"
                        value={draft.version}
                      />
                    </td>
                    <td>{flow.stageCount} stages / {flow.phaseCount} phases</td>
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
                          disabled={!hasChanges}
                          onClick={() => saveFlowDetails(flow.id)}
                          type="button"
                        >
                          Update
                        </button>
                        <button className="danger-text-btn" onClick={() => deleteFlow(flow.id)} type="button">
                          Delete
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
            <button onClick={addDepartment} type="button">Add</button>
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
                onClick={() => toggleDepartment(department.id)}
                type="button"
              >
                {department.status}
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default AdminDashboard
