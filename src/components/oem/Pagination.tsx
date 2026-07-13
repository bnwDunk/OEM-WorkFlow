type PaginationItem = number | 'ellipsis'

type PaginationProps = {
  className?: string
  currentPage: number
  itemLabel?: string
  onPageChange: (page: number) => void
  pageCount: number
  pageSize: number
  totalItems: number
}

function getPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', pageCount]
  }

  if (currentPage >= pageCount - 3) {
    return [1, 'ellipsis', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', pageCount]
}

function Pagination({
  className = '',
  currentPage,
  itemLabel,
  onPageChange,
  pageCount,
  pageSize,
  totalItems,
}: PaginationProps) {
  const safePageCount = Math.max(1, pageCount)
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safePageCount)
  const rangeStart = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(safeCurrentPage * pageSize, totalItems)
  const paginationItems = getPaginationItems(safeCurrentPage, safePageCount)
  const labelSuffix = itemLabel ? ` ${itemLabel}` : ''

  return (
    <div className={`pagination ${className}`.trim()}>
      <p>
        Showing {rangeStart}-{rangeEnd} of {totalItems}{labelSuffix}
      </p>
      <nav aria-label="Pagination">
        <button
          aria-label="Previous page"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          type="button"
        >
          {'<'}
        </button>
        {paginationItems.map((item, index) =>
          item === 'ellipsis' ? (
            <span aria-hidden="true" className="pagination-ellipsis" key={`ellipsis-${index}`}>
              ...
            </span>
          ) : (
            <button
              aria-current={item === safeCurrentPage ? 'page' : undefined}
              className={item === safeCurrentPage ? 'active' : ''}
              key={item}
              onClick={() => onPageChange(item)}
              type="button"
            >
              {item}
            </button>
          ),
        )}
        <button
          aria-label="Next page"
          disabled={safeCurrentPage === safePageCount}
          onClick={() => onPageChange(Math.min(safePageCount, safeCurrentPage + 1))}
          type="button"
        >
          {'>'}
        </button>
      </nav>
    </div>
  )
}

export default Pagination
