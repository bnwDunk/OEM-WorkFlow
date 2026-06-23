import type { NotificationItem } from '../../data/oemWorkflow'

type ActivityPanelProps = {
  notifications: NotificationItem[]
}

function ActivityPanel({ notifications }: ActivityPanelProps) {
  return (
    <section className="panel">
      <h4>Log / การแจ้งเตือน</h4>
      {notifications.length === 0 ? (
        <p className="empty-note">ยังไม่มี Log</p>
      ) : (
        notifications.map((item) => (
          <div className="feed-item" key={`${item.text}-${item.time}`}>
            {item.text}
            <time>{item.time}</time>
          </div>
        ))
      )}
    </section>
  )
}

export default ActivityPanel
