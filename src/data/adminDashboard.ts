export type AppRole = 'admin' | 'manager' | 'user'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: AppRole
  department: string
}

export type ManagedUser = AuthUser & {
  departmentId?: number | null
  status: 'active' | 'inactive'
  lastLogin: string
}

export type ManagedDepartment = {
  id: number
  code: string
  name: string
  manager: string
  memberCount: number
  status: 'active' | 'inactive'
}

export type ManagedFlow = {
  id: number
  code: string
  name: string
  version: number
  sourceFlowId: number | null
  stageCount: number
  phaseCount: number
  status: 'active' | 'draft' | 'inactive'
  updatedAt: string
}

export const demoUsers: ManagedUser[] = [
  {
    id: 1,
    name: 'OEM Admin',
    email: 'admin@oem.local',
    role: 'admin',
    department: 'Admin',
    status: 'active',
    lastLogin: 'Today 09:10',
  },
  {
    id: 2,
    name: 'OEM User',
    email: 'user@oem.local',
    role: 'user',
    department: 'Sales',
    status: 'active',
    lastLogin: 'Today 08:35',
  },
  {
    id: 3,
    name: 'QA Reviewer',
    email: 'qa@oem.local',
    role: 'manager',
    department: 'QA',
    status: 'active',
    lastLogin: 'Yesterday 16:40',
  },
]

export const demoDepartments: ManagedDepartment[] = [
  { id: 1, code: 'SALES', name: 'Sales', manager: 'OEM User', memberCount: 2, status: 'active' },
  { id: 2, code: 'QA', name: 'QA', manager: 'QA Reviewer', memberCount: 1, status: 'active' },
  { id: 3, code: 'ADMIN', name: 'Admin', manager: 'OEM Admin', memberCount: 1, status: 'active' },
  { id: 4, code: 'RD', name: 'R&D', manager: 'Not assigned', memberCount: 2, status: 'active' },
]

export const demoFlows: ManagedFlow[] = [
  {
    id: 1,
    code: 'OEM_FLOW',
    name: 'OEM Flow',
    version: 1,
    sourceFlowId: null,
    stageCount: 5,
    phaseCount: 20,
    status: 'active',
    updatedAt: 'Today 09:00',
  },
  {
    id: 2,
    code: 'OEM_FLOW_ZERO_SUGAR',
    name: 'OEM Flow - Zero Sugar',
    version: 1,
    sourceFlowId: 1,
    stageCount: 5,
    phaseCount: 20,
    status: 'draft',
    updatedAt: 'Yesterday 15:25',
  },
]
