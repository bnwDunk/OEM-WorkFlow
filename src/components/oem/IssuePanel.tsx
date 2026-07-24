import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { IoAttach, IoClose, IoDocumentText, IoImage, IoWarning } from 'react-icons/io5'
import { departments } from '../../data/oemWorkflow'
import type { CustomerFile, IssueItem } from '../../data/oemWorkflow'

const allowedAttachmentTypes = new Set(['application/pdf', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'])
const maxAttachmentCount = 5
const maxAttachmentTotalSize = 10 * 1024 * 1024

type IssuePanelProps = {
  canCloseAll?: boolean
  currentDept: string
  currentUserName: string
  userDepartments: string[]
  issues: IssueItem[]
  onAddIssue: (payload: { attachments: File[]; openedBy: string; targetDept: string; text: string }) => Promise<void> | void
  onCloseIssue: (issue: IssueItem) => Promise<void> | void
  onLoadFile: (file: CustomerFile) => Promise<Blob>
}

function IssuePanel({ canCloseAll = false, currentDept, currentUserName, userDepartments, issues, onAddIssue, onCloseIssue, onLoadFile }: IssuePanelProps) {
  const visibleIssues = issues.filter((issue) => !issue.closed)
  const openIssueCount = visibleIssues.length
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [closingIssueKey, setClosingIssueKey] = useState('')
  const [openingFileId, setOpeningFileId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<CustomerFile | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const normalizedUserDepartments = new Set(userDepartments.map((department) => department.trim().toLowerCase()))

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function closeIssue(issue: IssueItem, issueKey: string) {
    try {
      setClosingIssueKey(issueKey)
      await onCloseIssue(issue)
    } finally {
      setClosingIssueKey('')
    }
  }

  function addAttachments(files: File[]) {
    setAttachmentError('')
    const nextFiles = [...attachments, ...files]
    if (nextFiles.length > maxAttachmentCount) {
      setAttachmentError(`แนบได้สูงสุด ${maxAttachmentCount} ไฟล์`)
      return
    }
    if (files.some((file) => !allowedAttachmentTypes.has(file.type))) {
      setAttachmentError('รองรับเฉพาะไฟล์รูป JPG, PNG, GIF, WEBP และ PDF')
      return
    }
    if (nextFiles.reduce((total, file) => total + file.size, 0) > maxAttachmentTotalSize) {
      setAttachmentError('ไฟล์แนบรวมต้องมีขนาดไม่เกิน 10 MB')
      return
    }
    setAttachments(nextFiles)
  }

  async function openFile(file: CustomerFile) {
    try {
      setAttachmentError('')
      setOpeningFileId(file.id)
      setPreviewFile(file)
      setPreviewLoading(true)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      const blob = await onLoadFile(file)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (error) {
      setPreviewFile(null)
      setAttachmentError(error instanceof Error ? error.message : 'ไม่สามารถเปิดไฟล์แนบได้')
    } finally {
      setPreviewLoading(false)
      setOpeningFileId(null)
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(null)
    setPreviewUrl('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const openedBy = currentUserName.trim()
    const targetDept = String(data.get('targetDept') || departments[0].name)
    const text = String(data.get('text') || '').trim()

    if (!openedBy || !text) return

    try {
      setSubmitting(true)
      await onAddIssue({ attachments, openedBy, targetDept, text })
      form.reset()
      setAttachments([])
      setAttachmentError('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'ไม่สามารถเปิด Ticket ได้')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="flex h-[420px] min-w-0 self-start flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:h-[460px]">
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-lg font-black text-slate-950">Issue tickets</h4>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Open cross-team blockers for this customer.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${openIssueCount ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-600'}`}>
          <IoWarning aria-hidden="true" className="h-3.5 w-3.5" />
          {openIssueCount} open
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
        {visibleIssues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
            No issue tickets right now.
          </div>
        ) : (
          <div className="grid gap-3 pb-1">
          {visibleIssues.map((issue, index) => {
            const issueKey = String(issue.id || `${issue.text}-${issue.time}-${index}`)
            const canClose = !issue.closed && (canCloseAll || [issue.openedByDept, issue.targetDept]
              .some((department) => normalizedUserDepartments.has(department.trim().toLowerCase())))
            const isClosing = closingIssueKey === issueKey

            return (
              <article
                className={`rounded-xl border p-3.5 transition ${issue.closed ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-amber-200 bg-amber-50/80 shadow-sm'}`}
                key={issueKey}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm ${issue.closed ? 'text-slate-600' : 'text-amber-900'}`}>
                      {!issue.closed && <IoWarning aria-hidden="true" className="h-3.5 w-3.5" />}
                      To {issue.targetDept}
                    </span>
                    {typeof issue.phase === 'number' && (
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-500 shadow-sm">Phase {issue.phase + 1}</span>
                    )}
                  </div>
                  {canClose && (
                    <button
                      className="min-h-9 rounded-xl !border-0 !bg-white px-3 text-xs font-black !text-slate-700 shadow-sm transition hover:!bg-slate-100"
                      disabled={isClosing}
                      onClick={() => void closeIssue(issue, issueKey)}
                      type="button"
                    >
                      {isClosing ? 'Closing...' : 'Close'}
                    </button>
                  )}
                </div>
                <small className="mt-3 block text-xs font-bold text-slate-500">
                  Opened by {issue.openedBy} ({issue.openedByDept}) - {issue.time}
                </small>
                <p className="m-0 mt-2 text-sm font-semibold text-slate-800">{issue.text}</p>
                {(issue.attachments || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(issue.attachments || []).map((file) => (
                      <div className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-3 pr-1 shadow-sm" key={file.id}>
                        {file.mimeType === 'application/pdf' ? <IoDocumentText className="h-4 w-4 shrink-0 text-rose-500" /> : <IoImage className="h-4 w-4 shrink-0 text-sky-500" />}
                        <span className="max-w-48 truncate text-xs font-bold text-slate-700">{file.name}</span>
                        <button
                          className="min-h-8 rounded-md !border-0 !bg-slate-100 px-3 text-xs font-black !text-teal-700 transition hover:!bg-teal-50"
                          disabled={openingFileId === file.id}
                          onClick={() => void openFile(file)}
                          type="button"
                        >
                          {openingFileId === file.id ? 'กำลังเปิด...' : 'เปิดดู'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
          </div>
        )}
      </div>

      <form className="mt-3 shrink-0 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-3 shadow-[0_10px_24px_rgba(245,158,11,0.08)]" onSubmit={handleSubmit}>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="m-0 text-sm font-black text-slate-950">เปิด Ticket ใหม่</p>
            <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">ส่งรายละเอียดปัญหาไปยังฝ่ายที่เกี่ยวข้อง</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
            {currentUserName} · {currentDept}
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[minmax(130px,170px)_minmax(0,1fr)] xl:grid-cols-[minmax(130px,170px)_minmax(0,1fr)_auto_auto]">
          <label className="grid gap-1">
            <span className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-500">ส่งถึงฝ่าย</span>
            <select
              className="min-h-11 w-full rounded-xl !border !border-slate-200 !bg-white px-3.5 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:!border-amber-500 focus:ring-4 focus:ring-amber-100 focus-visible:!outline-none"
              name="targetDept"
            >
              {departments.map((department) => (
                <option key={department.name} value={department.name}>{department.name}</option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-1">
            <span className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-500">รายละเอียด</span>
            <input
              className="min-h-11 min-w-0 rounded-xl !border !border-slate-200 !bg-white px-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:!border-amber-500 focus:ring-4 focus:ring-amber-100 focus-visible:!outline-none"
              name="text"
              placeholder="ระบุรายละเอียดปัญหา..."
            />
          </label>

        <input
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,application/pdf,image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          multiple
          onChange={(event) => {
            addAttachments(Array.from(event.target.files || []))
            event.target.value = ''
          }}
          ref={fileInputRef}
          type="file"
        />
        <button
          aria-label="Attach image or PDF"
          className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl !border !border-slate-200 !bg-white px-4 text-sm font-black !text-slate-700 shadow-sm transition hover:!border-amber-300 hover:!bg-amber-50 sm:col-start-1 xl:col-start-auto"
          disabled={submitting}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <IoAttach className="h-4 w-4" />
          Attach
        </button>
        <button
          className="mt-auto min-h-11 rounded-xl !border-0 !bg-gradient-to-r !from-amber-500 !to-orange-500 px-5 text-sm font-black !text-white shadow-[0_8px_18px_rgba(245,158,11,0.28)] transition hover:-translate-y-0.5 hover:!from-amber-600 hover:!to-orange-600 focus-visible:!outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Opening...' : 'Open'}
        </button>
        </div>

        {attachments.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2 border-t border-amber-100 pt-2.5">
            {attachments.map((file, index) => (
              <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm" key={`${file.name}-${file.size}-${index}`}>
                {file.type === 'application/pdf' ? <IoDocumentText className="h-4 w-4 shrink-0 text-rose-500" /> : <IoImage className="h-4 w-4 shrink-0 text-sky-500" />}
                <span className="truncate">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full !border-0 !bg-transparent !p-0 !text-slate-500 hover:!bg-slate-100"
                  onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                >
                  <IoClose className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        {attachmentError && <p className="m-0 mt-2 text-sm font-bold text-rose-600">{attachmentError}</p>}
      </form>

      {previewFile && (
        <div
          aria-label={`Preview ${previewFile.name}`}
          aria-modal="true"
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreview()
          }}
          role="dialog"
        >
          <div className="flex h-[min(88vh,900px)] w-[min(94vw,1100px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {previewFile.mimeType === 'application/pdf' ? <IoDocumentText className="h-5 w-5 shrink-0 text-rose-400" /> : <IoImage className="h-5 w-5 shrink-0 text-sky-400" />}
                <p className="m-0 truncate text-sm font-black text-white">{previewFile.name}</p>
              </div>
              <button
                aria-label="Close attachment preview"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg !border-0 !bg-white/10 !p-0 !text-white hover:!bg-white/20"
                onClick={closePreview}
                type="button"
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>
            <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-slate-950 p-3">
              {previewLoading && <p className="text-sm font-bold text-white">กำลังโหลดไฟล์...</p>}
              {!previewLoading && previewUrl && previewFile.mimeType === 'application/pdf' && (
                <iframe className="h-full min-h-[60vh] w-full rounded-xl border-0 bg-white" src={previewUrl} title={previewFile.name} />
              )}
              {!previewLoading && previewUrl && previewFile.mimeType !== 'application/pdf' && (
                <img alt={previewFile.name} className="max-h-full max-w-full rounded-xl object-contain" src={previewUrl} />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default IssuePanel
