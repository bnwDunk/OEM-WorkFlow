export function formatDate(value: string | undefined) {
  if (!value) return '-'

  const normalizedValue = value.includes('T') ? value : `${value}T00:00:00`
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return value

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}
