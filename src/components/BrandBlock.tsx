type BrandBlockProps = {
  title: string
}

function BrandBlock({ title }: BrandBlockProps) {
  return (
    <div className="brand-block">
      <span className="brand-mark">O</span>
      <div>
        <p className="eyebrow">OEM Control</p>
        <h1>{title}</h1>
      </div>
    </div>
  )
}

export default BrandBlock
