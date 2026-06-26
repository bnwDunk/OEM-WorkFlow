import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import CompanyModal from '../components/oem/CompanyModal'
import ConfigView from '../components/oem/ConfigView'
import CreateCustomerModal from '../components/oem/CreateCustomerModal'
import CustomerDetailView from '../components/oem/CustomerDetailView'
import DeptWorkView from '../components/oem/DeptWorkView'
import OemTopNav from '../components/oem/OemTopNav'
import OverviewView from '../components/oem/OverviewView'
import ResetModal from '../components/oem/ResetModal'
import TagModal from '../components/oem/TagModal'
import {
  flowStops,
  seedBranchState,
} from '../data/oemWorkflow'
import type { AuthUser } from '../data/adminDashboard'
import type { ManagedFlow } from '../data/adminDashboard'
import type { BranchState, Customer, CustomerTag } from '../data/oemWorkflow'
import { apiRequest } from '../lib/api'

type FlowPageProps = {
  accessToken: string
  currentUser: AuthUser
  onLogout: () => void
}

type ActiveView = 'overview' | 'detail' | 'dept' | 'config' | 'admin'
type ModalState =
  | { type: 'company'; customerId: string }
  | { type: 'create-customer' }
  | { type: 'reset'; customerId: string; phase: number }
  | { type: 'tag'; customerId: string }
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

function FlowPage({ accessToken, currentUser, onLogout }: FlowPageProps) {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [availableFlows, setAvailableFlows] = useState<ManagedFlow[]>([])
  const [availableTags, setAvailableTags] = useState<CustomerTag[]>([])
  const [createCustomerLoading, setCreateCustomerLoading] = useState(false)
  const [tagLoading, setTagLoading] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [viewedPhase, setViewedPhase] = useState(0)
  const userDepartments = useMemo(() => {
    const departments = currentUser.departments?.map((department) => department.name).filter(Boolean) || []
    return departments.length ? departments : [currentUser.department]
  }, [currentUser.department, currentUser.departments])
  const [currentDept, setCurrentDept] = useState(userDepartments[0])
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null
  const modalCustomer = modal?.type === 'company'
    ? customers.find((customer) => customer.id === modal.customerId) || null
    : null
  const tagCustomer = modal?.type === 'tag'
    ? customers.find((customer) => customer.id === modal.customerId) || null
    : null

  const notifications = useMemo(
    () =>
      customers.flatMap((customer) =>
        customer.notifications.map((notification) => ({
          ...notification,
          customerName: customer.name,
        })),
      ),
    [customers],
  )

  useEffect(() => {
    if (!userDepartments.includes(currentDept)) {
      setCurrentDept(userDepartments[0])
    }
  }, [currentDept, userDepartments])

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

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    loadFlows()
  }, [loadFlows])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  async function handleCreateCustomer(payload: { flowId: number; name: string }) {
    try {
      setOverviewError('')
      setCreateCustomerLoading(true)
      await apiRequest('/admin/customers', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify(payload),
      })
      setModal(null)
      await loadOverview()
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to create customer.')
    } finally {
      setCreateCustomerLoading(false)
    }
  }

  function openCreateCustomerModal() {
    void loadFlows()
    setModal({ type: 'create-customer' })
  }

  function openTagModal(customerId: string) {
    void loadTags()
    setModal({ type: 'tag', customerId })
  }

  async function handleSaveTag(payload: { color: string; name: string; tagId?: number }) {
    if (!tagCustomer?.databaseId) return

    try {
      setOverviewError('')
      setTagLoading(true)
      await apiRequest(`/workflow/customers/${tagCustomer.databaseId}/tags`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify(payload),
      })
      setModal(null)
      await Promise.all([loadOverview(), loadTags()])
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to save tag.')
    } finally {
      setTagLoading(false)
    }
  }

  function updateCustomer(customerId: string, updater: (customer: Customer) => Customer) {
    setCustomers((current) =>
      current.map((customer) => (customer.id === customerId ? updater(structuredClone(customer)) : customer)),
    )
  }

  function addLog(customer: Customer, text: string) {
    customer.notifications.unshift({ text, time: 'เมื่อสักครู่' })
  }

  function openCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) return

    setSelectedCustomerId(customerId)
    setViewedPhase(customer.currentPhase)
    setActiveView('detail')
  }

  function handleChangeView(view: 'overview' | 'dept' | 'config' | 'admin') {
    setActiveView(view)
    setBellOpen(false)
    setProfileOpen(false)
  }

  function handleLogout() {
    onLogout()
    navigate('/login', { replace: true })
  }

  function canManageViewedBranch(branchIndex: number) {
    return userDepartments.includes(flowStops[viewedPhase]?.branches[branchIndex]?.dept)
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
    if (!selectedCustomer) return

    const branch = selectedCustomer.branch[viewedPhase][branchIndex]
    const willAdvance =
      branch.live.every(Boolean) &&
      selectedCustomer.branch[viewedPhase].every((item, index) => index === branchIndex || item.done)

    try {
      setOverviewError('')
      if (selectedCustomer.databaseId) {
        await apiRequest(`/workflow/customers/${selectedCustomer.databaseId}/phases/${viewedPhase}/branches/${branchIndex}/complete`, {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({ live: branch.live }),
        })
      }
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to complete branch.')
      return
    }

    updateCustomer(selectedCustomer.id, (customer) => {
      const branch = customer.branch[viewedPhase][branchIndex]

      if (!branch.live.every(Boolean)) return customer

      branch.saved = [...branch.live]
      branch.done = true
      addLog(customer, `ฝ่าย ${flowStops[viewedPhase].branches[branchIndex].dept} ทำงานเสร็จแล้ว - ${flowStops[viewedPhase].name}`)

      const stopDone = customer.branch[viewedPhase].every((item) => item.done)
      if (customer.singleResets[viewedPhase] && stopDone) delete customer.singleResets[viewedPhase]

      if (stopDone && viewedPhase === customer.currentPhase && viewedPhase < flowStops.length - 1) {
        customer.currentPhase = viewedPhase + 1
        setViewedPhase(viewedPhase + 1)
        addLog(customer, `ครบทุกฝ่ายใน "${flowStops[viewedPhase].name}" แล้ว - ส่งต่อ ${flowStops[viewedPhase + 1].branches.map((item) => item.dept).join(' + ')}`)
      }

      return customer
    })

    if (selectedCustomer.databaseId) {
      await loadOverview()
      if (willAdvance && viewedPhase < flowStops.length - 1) {
        setViewedPhase(viewedPhase + 1)
      }
    }
  }

  function handleAddIssue(payload: { openedBy: string; targetDept: string; text: string }) {
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      customer.issues.unshift({
        ...payload,
        openedByDept: currentDept,
        closed: false,
        time: 'เมื่อสักครู่',
      })
      addLog(customer, `Ticket ใหม่จาก ${payload.openedBy} (${currentDept}) ถึงฝ่าย ${payload.targetDept}: ${payload.text}`)
      return customer
    })
  }

  function handleCloseIssue(issueIndex: number) {
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      const issue = customer.issues[issueIndex]
      if (!issue || ![issue.openedByDept, issue.targetDept].some((department) => userDepartments.includes(department))) return customer

      issue.closed = true
      addLog(customer, `Ticket ถึงฝ่าย ${issue.targetDept} ถูกปิดโดย ${currentDept}`)
      return customer
    })
  }

  function handleReset(mode: 'all' | 'single') {
    if (!selectedCustomer || modal?.type !== 'reset') return

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
  }

  function handleSaveCompany(info: Customer['info']) {
    if (!modalCustomer) return

    updateCustomer(modalCustomer.id, (customer) => {
      customer.info = info
      addLog(customer, `แก้ไขข้อมูลบริษัทโดย ${currentDept}`)
      return customer
    })
    setModal(null)
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
        onChangeDept={(dept) => {
          setCurrentDept(dept)
          setProfileOpen(false)
        }}
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
        profileOpen={profileOpen}
      />

      {activeView === 'overview' && (
        <OverviewView
          customers={customers}
          error={overviewError}
          loading={overviewLoading}
          onAddTag={openTagModal}
          onCreateCustomer={currentUser.role === 'admin' ? openCreateCustomerModal : undefined}
          onOpenCompany={(customerId) => setModal({ type: 'company', customerId })}
          onOpenCustomer={openCustomer}
          onReload={loadOverview}
        />
      )}

      {activeView === 'detail' && selectedCustomer && (
        <CustomerDetailView
          currentDept={currentDept}
          userDepartments={userDepartments}
          customer={selectedCustomer}
          onAddIssue={handleAddIssue}
          onBack={() => setActiveView('overview')}
          onCancelBranch={handleCancelBranch}
          onCloseIssue={handleCloseIssue}
          onDoneBranch={handleDoneBranch}
          onOpenReset={() => setModal({ type: 'reset', customerId: selectedCustomer.id, phase: viewedPhase })}
          onToggleBranchItem={handleToggleBranchItem}
          onViewPhase={setViewedPhase}
          viewedPhase={viewedPhase}
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

      {activeView === 'config' && <ConfigView />}

      {activeView === 'admin' && currentUser.role === 'admin' && <AdminDashboard token={accessToken} />}

      {modal?.type === 'company' && modalCustomer && (
        <CompanyModal
          customer={modalCustomer}
          onClose={() => setModal(null)}
          onSave={handleSaveCompany}
        />
      )}

      {modal?.type === 'create-customer' && (
        <CreateCustomerModal
          flows={availableFlows}
          loading={createCustomerLoading}
          onClose={() => setModal(null)}
          onCreate={handleCreateCustomer}
        />
      )}

      {modal?.type === 'tag' && tagCustomer && (
        <TagModal
          customer={tagCustomer}
          loading={tagLoading}
          onClose={() => setModal(null)}
          onSave={handleSaveTag}
          tags={availableTags}
        />
      )}

      {modal?.type === 'reset' && (
        <ResetModal
          onClose={() => setModal(null)}
          onReset={handleReset}
          phase={modal.phase}
        />
      )}
    </main>
  )
}

export default FlowPage
