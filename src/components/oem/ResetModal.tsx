import { flowStops } from '../../data/oemWorkflow'

type ResetModalProps = {
  phase: number
  onClose: () => void
  onReset: (mode: 'all' | 'single') => void
}

function ResetModal({ onClose, onReset, phase }: ResetModalProps) {
  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-box">
        <h3>Reset to Draft - {flowStops[phase].name}</h3>
        <div className="reset-choice">
          <button onClick={() => onReset('all')} type="button">
            <b>Reset ทั้งหมด</b>
            <span>รีเซ็ต phase นี้และทุก phase ถัดไป แล้วดึงตัวชี้กลับมาที่นี่</span>
          </button>
          <button onClick={() => onReset('single')} type="button">
            <b>Reset เฉพาะ Phase นี้</b>
            <span>แก้เฉพาะ phase นี้ โดย phase อื่นที่เสร็จแล้วไม่ถูกเปลี่ยน</span>
          </button>
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose} type="button">ยกเลิก</button>
        </div>
      </div>
    </div>
  )
}

export default ResetModal
