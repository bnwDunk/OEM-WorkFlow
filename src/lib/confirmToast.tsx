import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type ConfirmToastOptions = {
  cancelLabel?: string
  confirmLabel?: string
  dangerNote?: string
  message: string
  title?: string
}

type ConfirmDialogProps = Required<Pick<ConfirmToastOptions, 'cancelLabel' | 'confirmLabel' | 'message' | 'title'>> & {
  dangerNote?: string
  onClose: (value: boolean) => void
}

function ConfirmDialog({ cancelLabel, confirmLabel, dangerNote, message, onClose, title }: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setVisible(true))

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose(false)
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frameId)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-[9999] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose(false)}
    >
      <section
        aria-modal="true"
        className={`w-full max-w-[480px] overflow-hidden rounded-2xl border border-rose-100 bg-white text-left shadow-[0_28px_90px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5 transition duration-150 ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
        }`}
        role="dialog"
      >
        <div className="grid gap-4 p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-2xl font-black text-rose-600 ring-1 ring-rose-100">
              !
            </div>
            <div className="min-w-0">
              <h2 className="m-0 text-lg font-black leading-tight text-slate-950">{title}</h2>
              <p className="m-0 mt-2 text-sm font-semibold leading-6 text-slate-600">{message}</p>
            </div>
          </div>

          {dangerNote && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
              <p className="m-0 text-lg font-bold tracking-wide text-rose-700">ระบบกำลังลบข้อมูล</p>
              <p className="m-0 mt-1 text-sm leading-6 text-black">{dangerNote}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-xl !border !border-slate-200 !bg-white px-5 text-sm font-black !text-slate-700 shadow-sm transition hover:!bg-slate-100 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            onClick={() => onClose(false)}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="min-h-11 rounded-xl !border-0 !bg-rose-600 px-5 text-sm font-black !text-white shadow-sm transition hover:!bg-rose-700 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
            onClick={() => onClose(true)}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export function confirmToast({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  dangerNote,
  message,
  title = 'Please confirm',
}: ConfirmToastOptions) {
  return new Promise<boolean>((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    function cleanup(value: boolean) {
      root.unmount()
      host.remove()
      resolve(value)
    }

    root.render(
      <ConfirmDialog
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        dangerNote={dangerNote}
        message={message}
        onClose={cleanup}
        title={title}
      />,
    )
  })
}
