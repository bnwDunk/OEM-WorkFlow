import { useMemo, useState } from 'react'
import {
  demoDepartments,
  demoFlows,
  demoUsers,
} from '../data/adminDashboard'
import type {
  AppRole,
  ManagedDepartment,
  ManagedFlow,
  ManagedUser,
} from '../data/adminDashboard'

const roleOptions: AppRole[] = ['admin', 'manager', 'user']

function AdminDashboard() {
  const [users, setUsers] = useState<ManagedUser[]>(demoUsers)
  const [departments, setDepartments] = useState<ManagedDepartment[]>(demoDepartments)
  const [flows, setFlows] = useState<ManagedFlow[]>(demoFlows)
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newFlowName, setNewFlowName] = useState('')
  const [sourceFlowId, setSourceFlowId] = useState(demoFlows[0]?.id || 0)

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

  function updateUser(userId: number, patch: Partial<ManagedUser>) {
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, ...patch } : user)),
    )
  }

  function toggleDepartment(departmentId: number) {
    setDepartments((current) =>
      current.map((department) =>
        department.id === departmentId
          ? { ...department, status: department.status === 'active' ? 'inactive' : 'active' }
          : department,
      ),
    )
  }

  function addDepartment() {
    const name = newDepartmentName.trim()
    if (!name) return

    setDepartments((current) => [
      ...current,
      {
        id: Math.max(...current.map((department) => department.id)) + 1,
        code: name.toUpperCase().replace(/\s+/g, '_'),
        name,
        manager: 'Not assigned',
        memberCount: 0,
        status: 'active',
      },
    ])
    setNewDepartmentName('')
  }

  function getFlowName(flowId: number | null) {
    if (!flowId) return 'Original'
    return flows.find((flow) => flow.id === flowId)?.name || 'Unknown source'
  }

  function updateFlow(flowId: number, patch: Partial<ManagedFlow>) {
    setFlows((current) =>
      current.map((flow) => (flow.id === flowId ? { ...flow, ...patch, updatedAt: 'Just now' } : flow)),
    )
  }

  function createFlowFromSource() {
    const source = flows.find((flow) => flow.id === sourceFlowId)
    const name = newFlowName.trim()
    if (!source || !name) return

    setFlows((current) => [
      ...current,
      {
        id: Math.max(...current.map((flow) => flow.id)) + 1,
        code: name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
        name,
        version: 1,
        sourceFlowId: source.id,
        stageCount: source.stageCount,
        phaseCount: source.phaseCount,
        status: 'draft',
        updatedAt: 'Just now',
      },
    ])
    setNewFlowName('')
  }

  function deleteFlow(flowId: number) {
    setFlows((current) => {
      if (current.length <= 1) return current
      return current.filter((flow) => flow.id !== flowId)
    })
  }

  return (
    <section className="page-pad admin-page">
      <div className="page-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage user access, department ownership, and account status for the OEM workflow.</p>
        </div>
      </div>

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
              {flows.map((flow) => (
                <tr key={flow.id}>
                  <td>
                    <input
                      aria-label={`Name for ${flow.name}`}
                      onChange={(event) => updateFlow(flow.id, { name: event.target.value })}
                      value={flow.name}
                    />
                    <span>{flow.code}</span>
                  </td>
                  <td>{getFlowName(flow.sourceFlowId)}</td>
                  <td>
                    <input
                      aria-label={`Version for ${flow.name}`}
                      min="1"
                      onChange={(event) => updateFlow(flow.id, { version: Number(event.target.value) || 1 })}
                      type="number"
                      value={flow.version}
                    />
                  </td>
                  <td>{flow.stageCount} stages / {flow.phaseCount} phases</td>
                  <td>
                    <select
                      aria-label={`Status for ${flow.name}`}
                      onChange={(event) => updateFlow(flow.id, { status: event.target.value as ManagedFlow['status'] })}
                      value={flow.status}
                    >
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </td>
                  <td>{flow.updatedAt}</td>
                  <td>
                    <button className="danger-text-btn" onClick={() => deleteFlow(flow.id)} type="button">
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
                      onChange={(event) => updateUser(user.id, { department: event.target.value })}
                      value={user.department}
                    >
                      {departments.map((department) => (
                        <option key={department.id} value={department.name}>{department.name}</option>
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
