import { departments, stages } from '../../data/oemWorkflow'

function ConfigView() {
  return (
    <section className="page-pad">
      <div className="page-heading">
        <div>
          <h1>Configuration</h1>
          <p>จัดการแผนก/สมาชิก และตรวจ workflow template ที่ใช้กับลูกค้าทุกเจ้า</p>
        </div>
      </div>

      <section className="config-block">
        <h3>แผนกและสมาชิก</h3>
        {departments.map((department) => (
          <div className="config-row" key={department.name}>
            <div>
              <b>{department.name}</b>
              <span>{department.members.join(', ')}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="config-block">
        <h3>Workflow Template</h3>
        {stages.map((stage, stageIndex) => (
          <div className="config-stage" key={stage.name}>
            <h4>Stage {stageIndex + 1}: {stage.name}</h4>
            {stage.stops.map((stop) =>
              stop.branches.flatMap((branch) =>
                branch.items.map((item) => (
                  <div className="config-row" key={`${stop.label}-${branch.dept}-${item}`}>
                    <div>Phase {stop.label} · {branch.dept}: {item}</div>
                  </div>
                )),
              ),
            )}
          </div>
        ))}
      </section>
    </section>
  )
}

export default ConfigView
