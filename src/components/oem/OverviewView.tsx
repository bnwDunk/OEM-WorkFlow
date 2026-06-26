import type { Customer } from '../../data/oemWorkflow'
import CustomerCard from './CustomerCard'

type OverviewViewProps = {
  customers: Customer[]
  error: string
  loading: boolean
  onAddTag: (customerId: string) => void
  onCreateCustomer?: () => void
  onOpenCompany: (customerId: string) => void
  onOpenCustomer: (customerId: string) => void
  onReload: () => void
}

function OverviewView({
  customers,
  error,
  loading,
  onAddTag,
  onCreateCustomer,
  onOpenCompany,
  onOpenCustomer,
  onReload,
}: OverviewViewProps) {
  return (
    <section className="page-pad">
      <div className="page-heading">
        <div>
          <h1>ภาพรวมงาน</h1>
          <p>ดูสถานะลูกค้าทุกเจ้า, Phase ปัจจุบัน, การแจ้งเตือน และ Ticket ข้ามฝ่าย</p>
        </div>
        <div className="overview-actions">
          {onCreateCustomer && (
            <button className="primary-action-btn" onClick={onCreateCustomer} type="button">
              สร้างลูกค้า
            </button>
          )}
          <button className="reset-btn" disabled={loading} onClick={onReload} type="button">
            {loading ? 'กำลังโหลด...' : 'โหลดข้อมูลใหม่'}
          </button>
        </div>
      </div>

      <div className="customer-list">
        {error && <p className="overview-state error">{error}</p>}
        {!error && loading && customers.length === 0 && <p className="overview-state">กำลังโหลดข้อมูลงาน...</p>}
        {!error && !loading && customers.length === 0 && <p className="overview-state">ยังไม่มีข้อมูลลูกค้าในฐานข้อมูล</p>}
        {customers.map((customer) => (
          <CustomerCard
            customer={customer}
            key={customer.id}
            onAddTag={onAddTag}
            onOpen={onOpenCustomer}
            onOpenCompany={onOpenCompany}
          />
        ))}
      </div>
    </section>
  )
}

export default OverviewView
