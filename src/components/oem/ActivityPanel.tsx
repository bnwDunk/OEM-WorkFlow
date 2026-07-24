import { useState } from 'react'
import { IoSearch } from 'react-icons/io5'
import type { NotificationItem } from '../../data/oemWorkflow'

type ActivityPanelProps = {
  notifications: NotificationItem[]
}

function ActivityPanel({ notifications }: ActivityPanelProps) {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredNotifications = normalizedSearch
    ? notifications.filter((item) => `${item.text} ${item.time}`.toLocaleLowerCase().includes(normalizedSearch))
    : notifications

  return (
    <section className="flex h-[420px] min-w-0 self-start flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:h-[460px]">
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-lg font-black text-slate-950">Log / การแจ้งเตือน</h4>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">ประวัติความเคลื่อนไหวล่าสุดของลูกค้ารายนี้</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {normalizedSearch ? `${filteredNotifications.length}/${notifications.length}` : notifications.length} logs
        </span>
      </div>

      <label className="relative mb-3 block shrink-0">
        <IoSearch aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="ค้นหา Log"
          className="min-h-11 w-full rounded-xl !border !border-slate-200 !bg-white py-2 pl-10 pr-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:!border-teal-500 focus:ring-4 focus:ring-teal-100"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหา Log ที่ผ่านมา..."
          type="search"
          value={search}
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
            {notifications.length === 0 ? 'ยังไม่มี Log' : 'ไม่พบ Log ที่ค้นหา'}
          </div>
        ) : (
          <div className="grid gap-3 pb-1">
            {filteredNotifications.map((item, index) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" key={`${item.text}-${item.time}-${index}`}>
                <p className="m-0 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800">{item.text}</p>
                <time className="mt-2 block text-xs font-bold text-slate-400">{item.time}</time>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default ActivityPanel
