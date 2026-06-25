import type { FormEvent } from 'react'
import { useState } from 'react'
import type { Customer, CustomerTag } from '../../data/oemWorkflow'

const palette = ['#0f766e', '#2563eb', '#7c3aed', '#c2410c', '#be123c', '#15803d', '#ca8a04', '#475569']

type TagModalProps = {
  customer: Customer
  loading: boolean
  tags: CustomerTag[]
  onClose: () => void
  onSave: (payload: { color: string; name: string; tagId?: number }) => void
}

function TagModal({ customer, loading, tags, onClose, onSave }: TagModalProps) {
  const [selectedTagId, setSelectedTagId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [color, setColor] = useState(palette[0])

  function chooseExisting(tag: CustomerTag) {
    setSelectedTagId(tag.id || '')
    setName(tag.name)
    setColor(tag.color || palette[0])
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    onSave({
      color,
      name: cleanName,
      tagId: selectedTagId || undefined,
    })
  }

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal-box tag-modal" onSubmit={handleSubmit}>
        <h3>เพิ่ม tag ให้ {customer.name}</h3>

        {tags.length > 0 && (
          <div className="tag-suggestion-list">
            {tags.map((tag) => (
              <button
                className={selectedTagId === tag.id ? 'tag-suggestion selected' : 'tag-suggestion'}
                key={tag.id || tag.name}
                onClick={() => chooseExisting(tag)}
                style={tag.color ? { borderColor: tag.color } : undefined}
                type="button"
              >
                <span style={tag.color ? { background: tag.color } : undefined} />
                {tag.name}
              </button>
            ))}
          </div>
        )}

        <label>
          Tag name
          <input
            autoFocus
            onChange={(event) => {
              setSelectedTagId('')
              setName(event.target.value)
            }}
            placeholder="เช่น Premium, เร่งด่วน, สูตรใหม่"
            value={name}
          />
        </label>

        <div className="color-field">
          <span>Color</span>
          <div className="color-palette">
            {palette.map((item) => (
              <button
                aria-label={`Use color ${item}`}
                className={color === item ? 'color-swatch selected' : 'color-swatch'}
                key={item}
                onClick={() => setColor(item)}
                style={{ background: item }}
                type="button"
              />
            ))}
            <input aria-label="Custom color" onChange={(event) => setColor(event.target.value)} type="color" value={color} />
          </div>
        </div>

        <div className="tag-preview">
          <span className="tag-chip" style={{ background: color, color: '#fff' }}>{name || 'Preview tag'}</span>
        </div>

        <div className="modal-actions">
          <button className="ghost" disabled={loading} onClick={onClose} type="button">ยกเลิก</button>
          <button className="primary" disabled={loading || !name.trim()} type="submit">
            {loading ? 'กำลังบันทึก...' : 'เพิ่ม tag'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TagModal
