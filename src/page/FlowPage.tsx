import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import CompanyModal from '../components/oem/CompanyModal'
import ConfigView from '../components/oem/ConfigView'
import CustomerDetailView from '../components/oem/CustomerDetailView'
import DeptWorkView from '../components/oem/DeptWorkView'
import OemTopNav from '../components/oem/OemTopNav'
import OverviewView from '../components/oem/OverviewView'
import ResetModal from '../components/oem/ResetModal'
import {
  createInitialCustomers,
  departments,
  flowStops,
} from '../data/oemWorkflow'
import type { AuthUser } from '../data/adminDashboard'
import type { Customer } from '../data/oemWorkflow'

type FlowPageProps = {
  currentUser: AuthUser
  onLogout: () => void
}

type ActiveView = 'overview' | 'detail' | 'dept' | 'config' | 'admin'
type ModalState =
  | { type: 'company'; customerId: string }
  | { type: 'reset'; customerId: string; phase: number }
  | null

function cloneCustomers() {
  return structuredClone(createInitialCustomers())
}

function FlowPage({ currentUser, onLogout }: FlowPageProps) {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [customers, setCustomers] = useState<Customer[]>(cloneCustomers)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [viewedPhase, setViewedPhase] = useState(0)
  const [currentDept, setCurrentDept] = useState(currentUser.department)
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null
  const modalCustomer = modal?.type === 'company'
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

  function handleToggleBranchItem(branchIndex: number, itemIndex: number) {
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      const branch = customer.branch[viewedPhase][branchIndex]
      const isActive = viewedPhase === customer.currentPhase || customer.singleResets[viewedPhase]

      if (branch.done || !isActive) return customer

      branch.live[itemIndex] = !branch.live[itemIndex]
      return customer
    })
  }

  function handleSaveBranch(branchIndex: number) {
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      const branch = customer.branch[viewedPhase][branchIndex]
      branch.saved = [...branch.live]
      return customer
    })
  }

  function handleCancelBranch(branchIndex: number) {
    if (!selectedCustomer) return

    updateCustomer(selectedCustomer.id, (customer) => {
      const branch = customer.branch[viewedPhase][branchIndex]
      branch.live = [...branch.saved]
      return customer
    })
  }

  function handleDoneBranch(branchIndex: number) {
    if (!selectedCustomer) return

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
      if (!issue || ![issue.openedByDept, issue.targetDept].includes(currentDept)) return customer

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
        departments={departments}
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
          onOpenCompany={(customerId) => setModal({ type: 'company', customerId })}
          onOpenCustomer={openCustomer}
          onResetDemo={() => {
            setCustomers(cloneCustomers())
            setSelectedCustomerId(null)
            setActiveView('overview')
          }}
        />
      )}

      {activeView === 'detail' && selectedCustomer && (
        <CustomerDetailView
          currentDept={currentDept}
          customer={selectedCustomer}
          onAddIssue={handleAddIssue}
          onBack={() => setActiveView('overview')}
          onCancelBranch={handleCancelBranch}
          onCloseIssue={handleCloseIssue}
          onDoneBranch={handleDoneBranch}
          onOpenReset={() => setModal({ type: 'reset', customerId: selectedCustomer.id, phase: viewedPhase })}
          onSaveBranch={handleSaveBranch}
          onToggleBranchItem={handleToggleBranchItem}
          onViewPhase={setViewedPhase}
          viewedPhase={viewedPhase}
        />
      )}

      {activeView === 'dept' && (
        <DeptWorkView
          currentDept={currentDept}
          customers={customers}
          onOpenCustomer={openCustomer}
        />
      )}

      {activeView === 'config' && <ConfigView />}

      {activeView === 'admin' && currentUser.role === 'admin' && <AdminDashboard />}

      {modal?.type === 'company' && modalCustomer && (
        <CompanyModal
          customer={modalCustomer}
          onClose={() => setModal(null)}
          onSave={handleSaveCompany}
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
