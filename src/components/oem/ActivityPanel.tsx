import type { NotificationItem } from '../../data/oemWorkflow'

type ActivityPanelProps = {
  notifications: NotificationItem[]
}

function ActivityPanel({ notifications }: ActivityPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-xl font-black text-slate-950">Log / การแจ้งเตือน</h4>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">ประวัติความเคลื่อนไหวล่าสุดของลูกค้ารายนี้</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{notifications.length} logs</span>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
          ยังไม่มี Log
        </div>
      ) : (
        <div className="grid gap-3">
          {notifications.map((item) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" key={`${item.text}-${item.time}`}>
              <p className="m-0 text-sm font-semibold text-slate-800">{item.text}</p>
              <time className="mt-2 block text-xs font-bold text-slate-400">{item.time}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default ActivityPanel
