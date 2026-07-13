import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import ConfigView from '../components/oem/ConfigView'
import CustomerCreateView from '../components/oem/CustomerCreateView'
import CustomerDetailView from '../components/oem/CustomerDetailView'
import CustomerEditView from '../components/oem/CustomerEditView'
import CustomerInfoModal from '../components/oem/CustomerInfoModal'
import CustomerListView from '../components/oem/CustomerListView'
import DeptWorkView from '../components/oem/DeptWorkView'
import OemTopNav from '../components/oem/OemTopNav'
import ProfileModal from '../components/oem/ProfileModal'
import OverviewView from '../components/oem/OverviewView'
import ResetModal from '../components/oem/ResetModal'
import TagModal from '../components/oem/TagModal'
import {
  flowStops,
  seedBranchState,
} from '../data/oemWorkflow'
import type { AuthUser } from '../data/adminDashboard'
import type { ManagedFlow, ManagedUser } from '../data/adminDashboard'
import type { BranchState, Customer, CustomerStatusOption, CustomerTag } from '../data/oemWorkflow'
import { apiRequest } from '../lib/api'
import { confirmToast } from '../lib/confirmToast'
import type { ConfigSection } from '../data/configSections'
import type { CustomerEditPayload } from '../components/oem/CustomerEditView'
import type { CustomerCreatePayload } from '../components/oem/CustomerCreateView'
import type { SalespersonOption } from '../components/oem/SalespersonCombobox'

type FlowPageProps = {
  accessToken: string
  currentUser: AuthUser
  onLogout: () => void
  onUserChange: (user: AuthUser) => void
}

type ActiveView = 'overview' | 'customers' | 'detail' | 'edit-customer' | 'create-customer' | 'dept' | 'config' | 'admin'
type ModalState =
  | { type: 'customer-info'; customerId: string }
  | { type: 'reset'; customerId: string; phase: number }
  | { type: 'tag'; customerId: string; tag?: CustomerTag }
  | { type: 'profile' }
  | null

type OverviewCustomerResponse = Omit<Customer, 'branch' | 'singleResets'> & {
  branch?: BranchState[][]
  databaseId?: number
  singleResets?: Record<number, boolean>
}

type OverviewResponse = {
  customers: OverviewCustomerResponse[]
}

function mapOverviewCustomer(customer: OverviewCustomerResponse): Customer {
  const currentPhase = Math.min(Math.max(customer.currentPhase, 0), flowStops.length - 1)

  return {
    ...customer,
    currentPhase,
    branch: customer.branch || seedBranchState(currentPhase),
    singleResets: customer.singleResets || {},
  }
}

function normalizeDepartmentName(value: string) {
  return value.trim().toLowerCase()
}

function hasDepartment(departments: string[], department: string | undefined) {
  if (!department) return false
  const target = normalizeDepartmentName(department)
  return departments.some((item) => normalizeDepartmentName(item) === target)
}

const flowViewPaths: Record<'overview' | 'customers' | 'dept' | 'config' | 'admin', string> = {
  overview: '/flow',
  customers: '/flow/customers',
  dept: '/flow/dept',
  config: '/flow/config',
  admin: '/flow/admin',
}

function FlowPage({ accessToken, currentUser, onLogout, onUserChange }: FlowPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [availableFlows, setAvailableFlows] = useState<ManagedFlow[]>([])
  const [availableTags, setAvailableTags] = useState<CustomerTag[]>([])
  const [customerStatusOptions, setCustomerStatusOptions] = useState<CustomerStatusOption[]>([])
  const [availableUsers, setAvailableUsers] = useState<ManagedUser[]>([])
  const [createCustomerLoading, setCreateCustomerLoading] = useState(false)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [customerDeleting, setCustomerDeleting] = useState(false)
  const [tagLoading, setTagLoading] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [viewedPhase, setViewedPhase] = useState(0)
  const [savingBranchAction, setSavingBranchAction] = useState<string | null>(null)
  const userDepartments = useMemo(() => {
    const departments = currentUser.departments?.map((department) => department.name).filter(Boolean) || []
    return departments.length ? departments : [currentUser.department]
  }, [currentUser.department, currentUser.departments])
  const [currentDept, setCurrentDept] = useState(userDepartments[0])
  const [configSection, setConfigSection] = useState<ConfigSection>('flows')
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const routeCustomerMatch = location.pathname === '/flow/customers/new'
    ? null
    : location.pathname.match(/^\/flow\/customers\/([^/]+)(?:\/edit)?$/)
  const routeCustomerId = routeCustomerMatch ? decodeURIComponent(routeCustomerMatch[1]) : null
  const activeView: ActiveView = location.pathname === '/flow/customers/new'
    ? 'create-customer'
    : location.pathname.startsWith('/flow/customers/') && location.pathname.endsWith('/edit')
    ? 'edit-customer'
    : location.pathname.startsWith('/flow/customers/')
      ? 'detail'
      : location.pathname === '/flow/customers'
        ? 'customers'
        : location.pathname === '/flow/dept'
          ? 'dept'
          : location.pathname === '/flow/config'
            ? 'config'
            : location.pathname === '/flow/admin'
              ? 'admin'
              : 'overview'
  const selectedCustomer = customers.find((customer) => customer.id === (routeCustomerId || selectedCustomerId)) || null
  const infoCustomer = modal?.type === 'customer-info'
    ? customers.find((customer) => customer.id === modal.customerId) || null
    : null
  const tagCustomer = modal?.type === 'tag'
    ? customers.find((customer) => customer.id === modal.customerId) || null
    : null

  const notifications = useMemo(
    () =>
      customers.flatMap((customer) =>
        customer.notifications.map((notification, notificationIndex) => ({
          ...notification,
          customerId: customer.id,
          customerName: customer.name,
          notificationId: notification.id,
          notificationIndex,
        })),
      ),
    [customers],
  )

  const salespersonOptions = useMemo<SalespersonOption[]>(() => {
    const currentUserOption: SalespersonOption = {
      department: currentUser.department,
      email: currentUser.email,
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      status: 'active',
    }
    const merged = [currentUserOption, ...availableUsers]
    const seen = new Set<string>()

    return merged.filter((user) => {
      const key = user.name.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [availableUsers, currentUser.department, currentUser.email, currentUser.id, currentUser.name, currentUser.role])

  useEffect(() => {
    if (!hasDepartment(userDepartments, currentDept)) {
      setCurrentDept(userDepartments[0])
    }
  }, [currentDept, userDepartments])

  useEffect(() => {
    if (currentUser.role !== 'admin' && configSection !== 'flows') {
      setConfigSection('flows')
    }
  }, [configSection, currentUser.role])

  useEffect(() => {
    if (overviewError) toast.error(overviewError)
  }, [overviewError])

  const loadOverview = useCallback(async () => {
    try {
      setOverviewError('')
      setOverviewLoading(true)
      const response = await apiRequest<OverviewResponse>('/workflow/overview', {
        token: accessToken,
      })
      const nextCustomers = response.customers.map(mapOverviewCustomer)

      setCustomers(nextCustomers)
      setSelectedCustomerId((currentId) =>
        currentId && nextCustomers.some((customer) => customer.id === currentId) ? currentId : null,
      )
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to load workflow overview.')
      setCustomers([])
      setSelectedCustomerId(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [accessToken])

  const loadFlows = useCallback(async () => {
    if (currentUser.role !== 'admin') return

    try {
      const response = await apiRequest<{ flows: ManagedFlow[] }>('/admin/flows', {
        token: accessToken,
      })
      setAvailableFlows(response.flows)
    } catch {
      setAvailableFlows([])
    }
  }, [accessToken, currentUser.role])

  const loadTags = useCallback(async () => {
    try {
      const response = await apiRequest<{ tags: CustomerTag[] }>('/workflow/tags', {
        token: accessToken,
      })
      setAvailableTags(response.tags)
    } catch {
      setAvailableTags([])
    }
  }, [accessToken])

  const loadCustomerStatuses = useCallback(async () => {
    try {
      const response = await apiRequest<{ statuses: CustomerStatusOption[] }>('/workflow/customer-statuses', {
        token: accessToken,
      })
      setCustomerStatusOptions(response.statuses)
    } catch {
      setCustomerStatusOptions([])
    }
  }, [accessToken])

  const loadUsers = useCallback(async () => {
    if (currentUser.role !== 'admin') {
      setAvailableUsers([])
      return
    }

    try {
      const response = await apiRequest<{ users: ManagedUser[] }>('/admin/users', {
        token: accessToken,
      })
      setAvailableUsers(response.users.filter((user) => user.status !== 'inactive'))
    } catch {
      setAvailableUsers([])
    }
  }, [accessToken, currentUser.role])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadFlows()
  }, [loadFlows])

  useEffect(() => {
    void loadTags()
  }, [loadTags])

  useEffect(() => {
    void loadCustomerStatuses()
  }, [loadCustomerStatuses])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if ((activeView === 'admin' || activeView === 'create-customer') && currentUser.role !== 'admin') {
      navigate('/flow', { replace: true })
    }
  }, [activeView, currentUser.role, navigate])

  useEffect(() => {
    if (activeView === 'create-customer') {
      void loadFlows()
    }
  }, [activeView, loadFlows])

  useEffect(() => {
    if (!routeCustomerId) return

    const routeCustomer = customers.find((customer) => customer.id === routeCustomerId)
    if (!routeCustomer) {
      if (!overviewLoading && customers.length > 0) {
        navigate('/flow', { replace: true })
      }
      return
    }

    setSelectedCustomerId(routeCustomer.id)
    if (selectedCustomerId !== routeCustomer.id) {
      setViewedPhase(routeCustomer.currentPhase)
    }
  }, [customers, navigate, overviewLoading, routeCustomerId, selectedCustomerId])

  async function handleCreateCustomer(payload: CustomerCreatePayload) {
    try {
      setOverviewError('')
      setCreateCustomerLoading(true)
      const createdCustomer = await apiRequest<{ id: number; name: string; slug: string }>('/admin/customers', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          flowId: payload.flowId,
          name: payload.name,
        }),
      })

      await apiRequest(`/admin/customers/${createdCustomer.id}`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({
          costPackage: payload.info.costPackage || null,
          costSyrup: payload.info.costSyrup || null,
          dueDate: payload.dueDate || null,
          name: payload.name,
          price: payload.info.price || null,
          salesperson: payload.salesperson || null,
          status: payload.status,
          tagsText: payload.tagsText,
          volume: payload.info.volume ? payload.info.volume.replace(/,/g, '') : null,
        }),
      })

      await loadOverview()
      navigate('/flow/customers')
      toast.success('Created customer.')
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to create customer.')
    } finally {
      setCreateCustomerLoading(false)
    }
  }

  function openCreateCustomerPage() {
    void loadFlows()
    navigate('/flow/customers/new')
  }

  function openTagModal(customerId: string) {
    void loadTags()
    setModal({ type: 'tag', customerId })
  }

  function openEditTagModal(customerId: string, tag: CustomerTag) {
    void loadTags()
    setModal({ type: 'tag', customerId, tag })
  }

  async function handleSaveTag(payload: { color: string; name: string; tagId?: number }) {
    if (!tagCustomer?.databaseId) return

    try {
      setOverviewError('')
      setTagLoading(true)
      if (modal?.type === 'tag' && modal.tag?.id) {
        await apiRequest(`/workflow/tags/${modal.tag.id}`, {
          method: 'PATCH',
          token: accessToken,
          body: JSON.stringify(payload),
        })
      } else {
        await apiRequest(`/workflow/customers/${tagCustomer.databaseId}/tags`, {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify(payload),
        })
      }
      setModal(null)
      await Promise.all([loadOverview(), loadTags()])
      toast.success(modal?.type === 'tag' && modal.tag?.id ? 'Updated tag.' : 'Added tag.')
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to save tag.')
    } finally {
      setTagLoading(false)
    }
  }

  async function handleDeleteCustomerTag(tag: CustomerTag) {
    if (!tagCustomer?.databaseId || !tag.id) return
    if (!(await confirmToast({
      cancelLabel: 'ยกเลิก',
      confirmLabel: 'ลบ',
      message: `ลบ tag ${tag.name} ออกจาก ${tagCustomer.name}?`,
      title: 'ยืนยันการลบ tag',
    }))) return

    try {
      setOverviewError('')
      setTagLoading(true)
      await apiRequest(`/workflow/customers/${tagCustomer.databaseId}/tags/${tag.id}`, {
        method: 'DELETE',
        token: accessToken,
      })
      setModal(null)
      await Promise.all([loadOverview(), loadTags()])
      toast.success('Deleted tag.')
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to delete tag.')
    } finally {
      setTagLoading(false)
    }
  }

  async function handleRemoveCustomerEditTag(tag: CustomerTag) {
    if (!selectedCustomer || !tag.id) return

    if (!selectedCustomer.databaseId) {
      updateCustomer(selectedCustomer.id, (customer) => {
        customer.tags = customer.tags.filter((item) => item.id !== tag.id && item.name !== tag.name)
        return customer
      })
      return
    }

    try {
      setOverviewError('')
      await apiRequest(`/workflow/customers/${selectedCustomer.databaseId}/tags/${tag.id}`, {
        method: 'DELETE',
        token: accessToken,
      })
      await Promise.all([loadOverview(), loadTags()])
      toast.success('Deleted tag.')
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to delete tag.')
      throw error
    }
  }

  function updateCustomer(customerId: string, updater: (customer: Customer) => Customer) {
    setCustomers((current) =>
      current.map((customer) => (customer.id === customerId ? updater(structuredClone(customer)) : customer)),
    )
  }

  function addLog(customer: Customer, text: string) {
    customer.notifications.unshift({ text, time: 'เมื่อสักครู่', read: false })
  }

  async function handleMarkNotificationRead(customerId: string, notificationIndex: number, notificationId?: number) {
    try {
      if (notificationId) {
        await apiRequest(`/workflow/notifications/${notificationId}/read`, {
          method: 'PATCH',
          token: accessToken,
        })
      }
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to update notification.')
      return
    }

    updateCustomer(customerId, (customer) => {
      const notification = customer.notifications[notificationIndex]
      if (notification) notification.read = true
      return customer
    })
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await apiRequest('/workflow/notifications/read-all', {
        method: 'PATCH',
        token: accessToken,
      })
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to update notifications.')
      return
    }

    setCustomers((current) =>
      current.map((customer) => ({
        ...customer,
        notifications: customer.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      })),
    )
  }

  function openCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) return

    setSelectedCustomerId(customerId)
    setViewedPhase(customer.currentPhase)
    navigate(`/flow/customers/${encodeURIComponent(customerId)}`)
  }

  function openCustomerEditor(customerId: string) {
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) return

    setSelectedCustomerId(customerId)
    setViewedPhase(customer.currentPhase)
    setModal(null)
    navigate(`/flow/customers/${encodeURIComponent(customerId)}/edit`)
  }

  function handleChangeView(view: 'overview' | 'customers' | 'dept' | 'config' | 'admin') {
    navigate(flowViewPaths[view])
    setBellOpen(false)
    setProfileOpen(false)
  }

  function handleChangeConfigSection(section: ConfigSection) {
    if (currentUser.role !== 'admin' && section !== 'flows') {
      setConfigSection('flows')
      navigate('/flow/config')
      setBellOpen(false)
      setProfileOpen(false)
      return
    }

    setConfigSection(section)
    navigate('/flow/config')
    setBellOpen(false)
    setProfileOpen(false)
  }

  function handleLogout() {
    onLogout()
    navigate('/login', { replace: true })
  }

  async function handleSaveProfile(payload: { email: string; name: string }) {
    const response = await apiRequest<{
      user: {
        id: number
        name: string
        email: string
        role: AuthUser['role']
        department?: { name?: string } | null
        departments?: { id?: number; name?: string }[]
      }
    }>('/auth/me', {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify(payload),
    })

    const departments = response.user.departments
      ?.map((department) => ({
        id: Number(department.id || 0),
        name: String(department.name || '').trim(),
      }))
      .filter((department) => department.id && department.name) || []

    onUserChange({
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      department: response.user.department?.name || departments[0]?.name || currentUser.department,
      departments: departments.length ? departments : currentUser.departments,
      departmentIds: departments.length ? departments.map((department) => department.id) : currentUser.departmentIds,
    })
    setProfileOpen(false)
    setModal(null)
  }

  function canManageViewedBranch(branchIndex: number) {
    return hasDepartment(userDepartments, flowStops[viewedPhase]?.branches[branchIndex]?.dept)
  }

  function handleToggleBranchItem(branchIndex: number, itemIndex: number) {
    if (!canManageViewedBranch(branchIndex)) return
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      const branch = customer.branch[viewedPhase][branchIndex]
      const isActive = viewedPhase === customer.currentPhase || customer.singleResets[viewedPhase]

      if (branch.done || !isActive) return customer

      branch.live[itemIndex] = !branch.live[itemIndex]
      return customer
    })
  }

  function handleCancelBranch(branchIndex: number) {
    if (!canManageViewedBranch(branchIndex)) return
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      const branch = customer.branch[viewedPhase][branchIndex]
      branch.live = [...branch.saved]
      return customer
    })
  }

  async function handleDoneBranch(branchIndex: number) {
    if (!canManageViewedBranch(branchIndex)) return
    if (!selectedCustomer || savingBranchAction) return

    const branch = selectedCustomer.branch[viewedPhase][branchIndex]
    if (!branch.live.some(Boolean)) {
      toast.error('Please tick at least one item before saving.')
      return
    }

    const busyKey = `complete-${viewedPhase}-${branchIndex}`
    const shouldReturnToCurrentPhase =
      Boolean(selectedCustomer.singleResets[viewedPhase]) && viewedPhase !== selectedCustomer.currentPhase
    let completedOnServer = false

    try {
      setOverviewError('')
      setSavingBranchAction(busyKey)
      if (selectedCustomer.databaseId) {
        await apiRequest(`/workflow/customers/${selectedCustomer.databaseId}/phases/${viewedPhase}/branches/${branchIndex}/complete`, {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({ live: branch.live }),
        })
        completedOnServer = true
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete branch.'
      if (!message.includes('409') && !message.toLowerCase().includes('conflict')) {
        setOverviewError(message)
        setSavingBranchAction(null)
        return
      }
    } finally {
      setSavingBranchAction(null)
    }

    updateCustomer(selectedCustomer.id, (customer) => {
      const branch = customer.branch[viewedPhase][branchIndex]

      branch.saved = [...branch.live]
      branch.done = true
      addLog(customer, `ฝ่าย ${flowStops[viewedPhase].branches[branchIndex].dept} ทำงานเสร็จแล้ว - ${flowStops[viewedPhase].name}`)

      const stopDone = customer.branch[viewedPhase].every((item) => item.done)
      if (customer.singleResets[viewedPhase] && stopDone) delete customer.singleResets[viewedPhase]

      if (stopDone && shouldReturnToCurrentPhase) {
        setViewedPhase(customer.currentPhase)
      }

      if (stopDone && viewedPhase === customer.currentPhase && viewedPhase < flowStops.length - 1) {
        customer.currentPhase = viewedPhase + 1
        setViewedPhase(viewedPhase + 1)
        addLog(customer, `ครบทุกฝ่ายใน "${flowStops[viewedPhase].name}" แล้ว - ส่งต่อ ${flowStops[viewedPhase + 1].branches.map((item) => item.dept).join(' + ')}`)
      }

      return customer
    })

    if (selectedCustomer.databaseId && completedOnServer) {
      void loadOverview().catch(() => undefined)
    }
    toast.success('Completed branch.')
  }

  async function handleAddIssue(payload: { openedBy: string; targetDept: string; text: string }) {
    if (!selectedCustomer) return

    if (selectedCustomer.databaseId) {
      try {
        setOverviewError('')
        await apiRequest(`/workflow/customers/${selectedCustomer.databaseId}/issues`, {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({
            ...payload,
            phase: viewedPhase,
          }),
        })
        await loadOverview()
        toast.success('Opened ticket.')
        return
      } catch (error) {
        setOverviewError(error instanceof Error ? error.message : 'Unable to open ticket.')
        return
      }
    }

    updateCustomer(selectedCustomer.id, (customer) => {
      customer.issues.unshift({
        ...payload,
        openedByDept: currentDept,
        closed: false,
        phase: viewedPhase,
        time: 'เมื่อสักครู่',
      })
      addLog(customer, `Ticket ใหม่จาก ${payload.openedBy} (${currentDept}) ถึงฝ่าย ${payload.targetDept}: ${payload.text}`)
      return customer
    })
    toast.success('Opened ticket.')
  }

  function handleCloseIssue(issueIndex: number) {
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      const issue = customer.issues[issueIndex]
      if (!issue || ![issue.openedByDept, issue.targetDept].some((department) => hasDepartment(userDepartments, department))) return customer

      issue.closed = true
      addLog(customer, `Ticket ถึงฝ่าย ${issue.targetDept} ถูกปิดโดย ${currentDept}`)
      return customer
    })
    toast.success('Closed ticket.')
  }

  async function handleReset(mode: 'all' | 'single') {
    if (!selectedCustomer || modal?.type !== 'reset') return

    try {
      setOverviewError('')
      if (selectedCustomer.databaseId) {
        await apiRequest(`/workflow/customers/${selectedCustomer.databaseId}/phases/${modal.phase}/reset`, {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({ mode }),
        })
      }
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to reset phase.')
      return
    }

    updateCustomer(selectedCustomer.id, (customer) => {
      const endPhase = mode === 'all' ? flowStops.length - 1 : modal.phase

      for (let phase = modal.phase; phase <= endPhase; phase += 1) {
        customer.branch[phase] = flowStops[phase].branches.map((branch) => ({
          live: branch.items.map(() => false),
          saved: branch.items.map(() => false),
          done: false,
        }))
      }

      if (mode === 'all') {
        customer.currentPhase = modal.phase
        customer.singleResets = Object.fromEntries(
          Object.entries(customer.singleResets).filter(([phase]) => Number(phase) < modal.phase),
        )
      } else {
        customer.singleResets[modal.phase] = true
      }

      addLog(customer, `Reset ${mode === 'all' ? 'ทั้งหมดจาก' : 'เฉพาะ'} "${flowStops[modal.phase].name}" โดยแผนก ${currentDept}`)
      return customer
    })

    setViewedPhase(modal.phase)
    setModal(null)

    if (selectedCustomer.databaseId) {
      await loadOverview()
    }
    toast.success('Reset phase.')
  }

  async function handleSaveCustomerEdit(payload: CustomerEditPayload) {
    if (!selectedCustomer) return

    if (!payload.name) {
      setOverviewError('Customer name is required.')
      return
    }

    try {
      setOverviewError('')
      setCustomerSaving(true)
      if (selectedCustomer.databaseId) {
        await apiRequest(`/admin/customers/${selectedCustomer.databaseId}`, {
          method: 'PATCH',
          token: accessToken,
          body: JSON.stringify({
            costPackage: payload.info.costPackage || null,
            costSyrup: payload.info.costSyrup || null,
            dueDate: payload.dueDate || null,
            name: payload.name,
            price: payload.info.price || null,
            salesperson: payload.salesperson || null,
            status: payload.status,
            tagsText: payload.tagsText,
            volume: payload.info.volume ? payload.info.volume.replace(/,/g, '') : null,
          }),
        })
        await loadOverview()
      } else {
        updateCustomer(selectedCustomer.id, (customer) => {
          customer.dueDate = payload.dueDate
          customer.info = payload.info
          customer.name = payload.name
          customer.salesperson = payload.salesperson
          customer.status = payload.status
          customer.tags = payload.tagsText
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => ({ name: tag }))
          addLog(customer, `แก้ไขข้อมูลบริษัทโดย ${currentDept}`)
          return customer
        })
      }
      navigate('/flow')
      toast.success('Saved customer.')
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to save customer.')
    } finally {
      setCustomerSaving(false)
    }
  }

  async function handleDeleteInfoCustomer() {
    if (!infoCustomer?.databaseId) return
    if (!(await confirmToast({
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      dangerNote: 'ระบบจะลบข้อมูลทั้งหมดของลูกค้า "${infoCustomer.name}"?',
      message: `Are you sure you want to permanently delete "${infoCustomer.name}"?`,
      title: 'Delete customer',
    }))) return

    try {
      setOverviewError('')
      setCustomerDeleting(true)
      await apiRequest(`/admin/customers/${infoCustomer.databaseId}`, {
        method: 'DELETE',
        token: accessToken,
      })
      setModal(null)
      if (selectedCustomerId === infoCustomer.id) {
        setSelectedCustomerId(null)
        navigate('/flow')
      }
      await loadOverview()
      toast.success('Deleted customer.')
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to delete customer.')
    } finally {
      setCustomerDeleting(false)
    }
  }

  async function handleDeleteSelectedCustomer() {
    if (!selectedCustomer?.databaseId) return
    if (!(await confirmToast({
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      dangerNote: `ระบบจะลบข้อมูลของลูกค้า ${selectedCustomer.name} ออกจากระบบ`,
      message: `คุณแน่ใจแล้วหรือไม่ ที่จะลบข้อมูลของลูกค้า ${selectedCustomer.name} ออกจากระบบ`,
      title: 'Delete customer',
    }))) return

    try {
      setOverviewError('')
      setCustomerDeleting(true)
      await apiRequest(`/admin/customers/${selectedCustomer.databaseId}`, {
        method: 'DELETE',
        token: accessToken,
      })
      setSelectedCustomerId(null)
      await loadOverview()
      navigate('/flow/customers')
      toast.success('Deleted customer.')
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to delete customer.')
    } finally {
      setCustomerDeleting(false)
    }
  }

  return (
    <main className="oem-app-shell">
      <OemTopNav
        activeView={activeView}
        bellOpen={bellOpen}
        currentUser={currentUser}
        currentDept={currentDept}
        departments={userDepartments}
        notifications={notifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onMarkNotificationRead={handleMarkNotificationRead}
        onChangeDept={(dept) => {
          setCurrentDept(dept)
          setProfileOpen(false)
        }}
        configSection={configSection}
        onChangeConfigSection={handleChangeConfigSection}
        onChangeView={handleChangeView}
        onLogout={handleLogout}
        onToggleBell={() => {
          setBellOpen((open) => !open)
          setProfileOpen(false)
        }}
        onToggleProfile={() => {
          setProfileOpen((open) => !open)
          setBellOpen(false)
        }}
        onOpenProfile={() => {
          setProfileOpen(false)
          setModal({ type: 'profile' })
        }}
        profileOpen={profileOpen}
      />

      {activeView === 'overview' && (
        <OverviewView
          customers={customers}
          customerStatusOptions={customerStatusOptions}
          error={overviewError}
          loading={overviewLoading}
          onAddTag={openTagModal}
          onEditTag={openEditTagModal}
          onCreateCustomer={currentUser.role === 'admin' ? openCreateCustomerPage : undefined}
          onOpenCompany={openCustomerEditor}
          onOpenCustomer={openCustomer}
          onOpenInfo={(customerId) => setModal({ type: 'customer-info', customerId })}
          onReload={loadOverview}
        />
      )}

      {activeView === 'customers' && (
        <CustomerListView
          customers={customers}
          customerStatusOptions={customerStatusOptions}
          loading={overviewLoading}
          onCreateCustomer={currentUser.role === 'admin' ? openCreateCustomerPage : undefined}
          onOpenCustomer={openCustomer}
        />
      )}

      {activeView === 'detail' && selectedCustomer && (
        <CustomerDetailView
          currentDept={currentDept}
          currentUserName={currentUser.name}
          userDepartments={userDepartments}
          customer={selectedCustomer}
          onAddIssue={handleAddIssue}
          onBack={() => navigate('/flow')}
          onCancelBranch={handleCancelBranch}
          onCloseIssue={handleCloseIssue}
          onDoneBranch={handleDoneBranch}
          onOpenReset={() => setModal({ type: 'reset', customerId: selectedCustomer.id, phase: viewedPhase })}
          onToggleBranchItem={handleToggleBranchItem}
          onViewPhase={setViewedPhase}
          savingBranchAction={savingBranchAction}
          viewedPhase={viewedPhase}
        />
      )}

      {activeView === 'edit-customer' && selectedCustomer && (
        <CustomerEditView
          availableTags={availableTags}
          canDelete={Boolean(selectedCustomer.databaseId)}
          customer={selectedCustomer}
          customerStatusOptions={customerStatusOptions}
          customers={customers}
          deleting={customerDeleting}
          loading={customerSaving}
          onBack={() => navigate('/flow')}
          onDelete={() => void handleDeleteSelectedCustomer()}
          onRemoveTag={handleRemoveCustomerEditTag}
          onSave={handleSaveCustomerEdit}
          salespersonName={currentUser.name}
          salespersonOptions={salespersonOptions}
        />
      )}

      {activeView === 'create-customer' && currentUser.role === 'admin' && (
        <CustomerCreateView
          customerStatusOptions={customerStatusOptions}
          customers={customers}
          flows={availableFlows}
          loading={createCustomerLoading}
          onBack={() => navigate('/flow/customers')}
          onCreate={handleCreateCustomer}
          salespersonName={currentUser.name}
          salespersonOptions={salespersonOptions}
        />
      )}

      {activeView === 'dept' && (
        <DeptWorkView
          currentDept={currentDept}
          departments={userDepartments}
          customers={customers}
          onOpenCustomer={openCustomer}
        />
      )}

      {activeView === 'config' && (
        currentUser.role === 'admin'
          ? <AdminDashboard configSection={configSection} mode="config" onCustomerStatusesChange={loadCustomerStatuses} token={accessToken} />
          : <ConfigView accessToken={accessToken} currentDept={currentDept} departments={userDepartments} onWorkflowTemplateChange={loadOverview} />
      )}

      {activeView === 'admin' && currentUser.role === 'admin' && (
        <AdminDashboard mode="admin" onCustomerStatusesChange={loadCustomerStatuses} token={accessToken} />
      )}

      {modal?.type === 'customer-info' && infoCustomer && (
        <CustomerInfoModal
          canDelete={Boolean(infoCustomer.databaseId)}
          customer={infoCustomer}
          customerStatusOptions={customerStatusOptions}
          deleting={customerDeleting}
          onClose={() => setModal(null)}
          onDelete={() => void handleDeleteInfoCustomer()}
          onEdit={() => openCustomerEditor(infoCustomer.id)}
        />
      )}

      {modal?.type === 'tag' && tagCustomer && (
        <TagModal
          customer={tagCustomer}
          initialTag={modal.tag || null}
          loading={tagLoading}
          onClose={() => setModal(null)}
          onDelete={handleDeleteCustomerTag}
          onSave={handleSaveTag}
          tags={availableTags}
        />
      )}

      {modal?.type === 'reset' && (
        <ResetModal
          onClose={() => setModal(null)}
          onReset={(mode) => void handleReset(mode)}
          phase={modal.phase}
        />
      )}

      {modal?.type === 'profile' && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSave={handleSaveProfile}
        />
      )}
    </main>
  )
}

export default FlowPage
