import { flowStops } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'

type DeptWorkViewProps = {
  currentDept: string
  customers: Customer[]
  onOpenCustomer: (customerId: string) => void
}

function DeptWorkView({ currentDept, customers, onOpenCustomer }: DeptWorkViewProps) {
  const workItems = customers.flatMap((customer) =>
    flowStops.flatMap((stop, stopIndex) => {
      const active = stopIndex === customer.currentPhase || customer.singleResets[stopIndex]

      if (!active) return []

      return stop.branches
        .map((branch, branchIndex) => ({ branch, branchIndex, customer, stop }))
        .filter(({ branch, branchIndex }) => branch.dept === currentDept && !customer.branch[stopIndex][branchIndex].done)
    }),
  )

  return (
    <section className="page-pad">
      <div className="page-heading">
        <div>
          <h1>งานของแผนก {currentDept}</h1>
          <p>แสดงเฉพาะงานของแผนกที่ Login อยู่ ข้ามทุกลูกค้า</p>
        </div>
      </div>

      {workItems.length === 0 ? (
        <p className="empty-note">ไม่มีงานที่รอแผนก {currentDept} ตอนนี้</p>
      ) : (
        workItems.map(({ branchIndex, customer, stop }) => (
          <article className="deptwork-row" key={`${customer.id}-${stop.label}-${branchIndex}`}>
            <div>
              <b>{customer.name}</b>
              <span>Stage {stop.stageIndex + 1} · Phase {stop.label}: {stop.name}</span>
            </div>
            <button onClick={() => onOpenCustomer(customer.id)} type="button">เปิดดู</button>
          </article>
        ))
      )}
    </section>
  )
}

export default DeptWorkView
