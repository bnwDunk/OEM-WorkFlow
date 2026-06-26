import { flowStops } from '../../data/oemWorkflow'
import type { Customer } from '../../data/oemWorkflow'

type DeptWorkViewProps = {
  currentDept: string
  departments: string[]
  customers: Customer[]
  onOpenCustomer: (customerId: string) => void
}

function DeptWorkView({ currentDept, departments, customers, onOpenCustomer }: DeptWorkViewProps) {
  const assignedDepartments = departments.length ? departments : [currentDept]
  const workItems = customers.flatMap((customer) =>
    flowStops.flatMap((stop, stopIndex) => {
      const active = stopIndex === customer.currentPhase || customer.singleResets[stopIndex]

      if (!active) return []

      return stop.branches
        .map((branch, branchIndex) => ({ branch, branchIndex, customer, stop }))
        .filter(({ branch, branchIndex }) =>
          assignedDepartments.includes(branch.dept) && !customer.branch[stopIndex][branchIndex].done,
        )
    }),
  )

  return (
    <section className="page-pad">
      <div className="page-heading">
        <div>
          <h1>งานของแผนก {assignedDepartments.join(', ')}</h1>
          <p>รวมงานที่รอจากทุกแผนกที่คุณได้รับสิทธิ์</p>
        </div>
      </div>

      {workItems.length === 0 ? (
        <p className="empty-note">ไม่มีงานที่รอแผนกของคุณตอนนี้</p>
      ) : (
        workItems.map(({ branch, branchIndex, customer, stop }) => (
          <article className="deptwork-row" key={`${customer.id}-${stop.label}-${branchIndex}`}>
            <div>
              <b>{customer.name}</b>
              <span>{branch.dept} · Stage {stop.stageIndex + 1} · Phase {stop.label}: {stop.name}</span>
            </div>
            <button onClick={() => onOpenCustomer(customer.id)} type="button">เปิดดู</button>
          </article>
        ))
      )}
    </section>
  )
}

export default DeptWorkView
