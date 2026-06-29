import logo from '../../img/Logo-p.piya.solotion-01 1 (2).jpg'

type BrandBlockProps = {
  title: string
}

function BrandBlock({ title }: BrandBlockProps) {
  return (
    <div className="brand-block">
      <img className='w-[75px] h-[75px]' src={logo} alt="Company Logo" />
      <div>
        <p className="eyebrow">P.Piya Solution</p>
        <h1>{title}</h1>
      </div>
    </div>
  )
}

export default BrandBlock
