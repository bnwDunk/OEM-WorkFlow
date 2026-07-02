import toast, { type Toast } from 'react-hot-toast'

type ConfirmToastOptions = {
  cancelLabel?: string
  confirmLabel?: string
  message: string
  title?: string
}

export function confirmToast({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  message,
  title = 'Please confirm',
}: ConfirmToastOptions) {
  return new Promise<boolean>((resolve) => {
    function close(value: boolean, toastId: string) {
      toast.dismiss(toastId)
      resolve(value)
    }

    toast.custom(
      (item: Toast) => (
        <div
          className={`w-[min(92vw,420px)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition ${
            item.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}
        >
          <strong className="block text-sm font-black text-slate-950">{title}</strong>
          <p className="m-0 mt-1 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="min-h-10 rounded-xl !border !border-slate-200 !bg-white px-4 text-sm font-black !text-slate-600 transition hover:!bg-slate-50"
              onClick={() => close(false, item.id)}
              type="button"
            >
              {cancelLabel}
            </button>
            <button
              className="min-h-10 rounded-xl !border-0 !bg-rose-600 px-4 text-sm font-black !text-white shadow-sm transition hover:!bg-rose-700"
              onClick={() => close(true, item.id)}
              type="button"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' },
    )
  })
}
