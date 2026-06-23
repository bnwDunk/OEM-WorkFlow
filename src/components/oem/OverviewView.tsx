import type { Customer } from '../../data/oemWorkflow'
import CustomerCard from './CustomerCard'

type OverviewViewProps = {
  customers: Customer[]
  onOpenCompany: (customerId: string) => void
  onOpenCustomer: (customerId: string) => void
  onResetDemo: () => void
}

function OverviewView({ customers, onOpenCompany, onOpenCustomer, onResetDemo }: OverviewViewProps) {
  return (
    <section className="page-pad">
      <div className="page-heading">
        <div>
          <h1>Overview</h1>
          <p>ดูสถานะลูกค้าทุกเจ้า, phase ปัจจุบัน, notification และ ticket ค้างข้ามฝ่าย</p>
        </div>
        <button className="reset-btn" onClick={onResetDemo} type="button">Reset Demo</button>
      </div>-

      <div className="customer-list">
        {customers.map((customer) => (
          <CustomerCard
            customer={customer}
            key={customer.id}
            onOpen={onOpenCustomer}
            onOpenCompany={onOpenCompany}
          />
        ))}
      </div>
    </section>
  )
}

export default OverviewView
