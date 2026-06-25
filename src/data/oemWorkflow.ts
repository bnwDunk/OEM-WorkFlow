export type Department = {
  name: string
  members: string[]
}

export type BranchTemplate = {
  dept: string
  items: string[]
}

export type StopTemplate = {
  label: string
  name: string
  branches: BranchTemplate[]
}

export type StageTemplate = {
  name: string
  stops: StopTemplate[]
}

export type FlowStop = StopTemplate & {
  stageIndex: number
  stageName: string
  globalIndex: number
}

export type BranchState = {
  live: boolean[]
  saved: boolean[]
  done: boolean
}

export type NotificationItem = {
  text: string
  time: string
}

export type IssueItem = {
  openedBy: string
  openedByDept: string
  targetDept: string
  text: string
  closed: boolean
  time: string
}

export type CustomerTag = {
  id?: number
  name: string
  color?: string | null
}

export type Customer = {
  id: string
  databaseId?: number
  name: string
  currentPhase: number
  tags: CustomerTag[]
  info: {
    costSyrup: string
    costPackage: string
    price: string
    volume: string
  }
  branch: BranchState[][]
  singleResets: Record<number, boolean>
  notifications: NotificationItem[]
  issues: IssueItem[]
}

export const stages: StageTemplate[] = [
  {
    name: 'รับบรีฟ & ปิดดีล',
    stops: [
      {
        label: '1',
        name: 'คุยบรีฟ & หาลูกค้าใหม่',
        branches: [{ dept: 'Sales', items: ['คุยบรีฟ และค้นหาลูกค้าใหม่'] }],
      },
      {
        label: '2',
        name: 'ขึ้นสูตรตัวอย่าง + อนุมัติราคาเบื้องต้น',
        branches: [
          { dept: 'R&D', items: ['ขึ้นสูตรตัวอย่าง (Sample)', 'ส่งตัวอย่าง + ราคาเบื้องต้นให้ลูกค้า'] },
          { dept: 'CEO', items: ['อนุมัติราคาขาย'] },
        ],
      },
      {
        label: '3',
        name: 'คำนวณต้นทุนแต่ละด้าน',
        branches: [
          { dept: 'Purchase', items: ['ดูต้นทุนบรรจุภัณฑ์'] },
          { dept: 'R&D', items: ['ดูต้นทุนวัตถุดิบ'] },
          { dept: 'Production plan', items: ['ดูต้นทุนการผลิต'] },
        ],
      },
      {
        label: '3.1',
        name: 'รวมต้นทุนทั้งหมด',
        branches: [{ dept: 'Accounting', items: ['รวมต้นทุนทั้งหมด'] }],
      },
      {
        label: '4',
        name: 'CEO อนุมัติราคาขายจริง',
        branches: [{ dept: 'CEO', items: ['พิจารณา และอนุมัติ'] }],
      },
      {
        label: '5',
        name: 'ทำสัญญา',
        branches: [{ dept: 'Sales', items: ['จัดทำเอกสารสัญญาซื้อขาย / สัญญาจ้างผลิต OEM'] }],
      },
      {
        label: '6',
        name: 'รับมัดจำ',
        branches: [{ dept: 'Accounting', items: ['ตรวจสอบยอดเงิน และรับเงินมัดจำงวดแรก'] }],
      },
    ],
  },
  {
    name: 'เตรียมการผลิต',
    stops: [
      {
        label: '1',
        name: 'เปิดใบสั่งผลิต',
        branches: [{ dept: 'Sales', items: ['แจ้งไฟเขียว (เปิดใบสั่งผลิต)'] }],
      },
      {
        label: '2',
        name: 'ขอเลข อย. + ออกแบบฉลาก',
        branches: [
          { dept: 'R&D', items: ['ยื่นขออนุมัติเลข อย.'] },
          { dept: 'Marketing', items: ['ออกแบบดีไซน์ฉลาก'] },
        ],
      },
      {
        label: '2.1',
        name: 'ตรวจฉลาก',
        branches: [{ dept: 'QA', items: ['ตรวจสอบความถูกต้องฉลาก'] }],
      },
      {
        label: '3',
        name: 'สั่งซื้อวัตถุดิบ',
        branches: [{ dept: 'Purchase', items: ['สั่งซื้อวัตถุดิบและบรรจุภัณฑ์ตามล็อตผลิต'] }],
      },
    ],
  },
  {
    name: 'รับเข้าคลัง & ตรวจสอบ',
    stops: [
      {
        label: '1',
        name: 'ตรวจรับ & ลงทะเบียน',
        branches: [{ dept: 'Warehouse', items: ['ทำการตรวจรับจำนวน และลงทะเบียนสินค้าขาเข้า'] }],
      },
      {
        label: '2',
        name: 'ตรวจคุณภาพวัตถุดิบ',
        branches: [{ dept: 'QC', items: ['สุ่มตรวจคุณภาพวัตถุดิบ (Inbound)'] }],
      },
      {
        label: '3',
        name: 'จัดเก็บเข้าคลัง',
        branches: [{ dept: 'Warehouse', items: ['เคลื่อนย้ายและจัดเก็บเข้าคลังสินค้า'] }],
      },
    ],
  },
  {
    name: 'เดินไลน์ผลิต & แบ่งบรรจุ',
    stops: [
      {
        label: '1',
        name: 'เบิกวัตถุดิบ',
        branches: [{ dept: 'Production', items: ['เบิกวัตถุดิบและบรรจุภัณฑ์ออกจากคลัง'] }],
      },
      {
        label: '2',
        name: 'ผลิต + ตรวจคู่กัน',
        branches: [
          { dept: 'Production', items: ['ผลิตเสร็จสิ้น'] },
          { dept: 'QC', items: ['สุ่มตรวจ'] },
        ],
      },
    ],
  },
  {
    name: 'ส่งมอบสินค้า',
    stops: [
      {
        label: '1',
        name: 'ตรวจ & อนุมัติปล่อยสินค้า',
        branches: [{ dept: 'QC', items: ['สุ่มตรวจ', 'อนุมัติผ่าน'] }],
      },
      {
        label: '2',
        name: 'เปิด SO + จัดคิวรถ',
        branches: [
          { dept: 'Sales', items: ['เปิด SO'] },
          { dept: 'Admin', items: ['วางแผนเส้นทางและจัดตารางคิวรอรถขนส่ง'] },
        ],
      },
      {
        label: '3',
        name: 'แจ้งหนี้ + เก็บเงิน',
        branches: [{ dept: 'Accounting', items: ['ออกเอกสารแจ้งหนี้ และเก็บเงินงวดสุดท้าย'] }],
      },
      {
        label: '4',
        name: 'ขนส่ง',
        branches: [{ dept: 'Warehouse', items: ['ขนส่งสินค้าให้ลูกค้า'] }],
      },
    ],
  },
]

export const departments: Department[] = [
  { name: 'Sales', members: ['สมชาย', 'ปอย'] },
  { name: 'Marketing', members: ['แนน'] },
  { name: 'R&D', members: ['ศิรินภา', 'เบนซ์'] },
  { name: 'CEO', members: ['คุณบอส'] },
  { name: 'Purchase', members: ['อร'] },
  { name: 'Production plan', members: ['ศิรินภา'] },
  { name: 'Accounting', members: ['บีม', 'ตา'] },
  { name: 'QA', members: ['แนต'] },
  { name: 'QC', members: ['แนต', 'กิ๊ฟ'] },
  { name: 'Warehouse', members: ['เอก'] },
  { name: 'Admin', members: ['ปอย'] },
  { name: 'Production', members: ['เอก', 'โบ'] },
]

export const tagOptions = ['น้ำเชื่อมใส', 'Zero Sugar', 'อาหารเสริม', 'แบ่งบรรจุ', 'น้ำหวานแต่งกลิ่น']

export const flowStops = stages.flatMap((stage, stageIndex) =>
  stage.stops.map((stop, stopIndex) => ({
    ...stop,
    stageIndex,
    stageName: stage.name,
    globalIndex: stage.stops
      .slice(0, stopIndex)
      .reduce((total) => total + 1, stages.slice(0, stageIndex).reduce((sum, item) => sum + item.stops.length, 0)),
  })),
)

export const stageRanges = stages.reduce<{ start: number; end: number }[]>((ranges, stage) => {
  const start = ranges.length === 0 ? 0 : ranges[ranges.length - 1].end + 1
  ranges.push({ start, end: start + stage.stops.length - 1 })
  return ranges
}, [])

export function seedBranchState(currentPhase: number, doneSeed: Record<number, number[]> = {}) {
  return flowStops.map((stop, stopIndex) =>
    stop.branches.map((branch, branchIndex) => {
      const done = stopIndex < currentPhase || doneSeed[stopIndex]?.includes(branchIndex) || false
      const items = branch.items.map(() => done)

      return {
        live: [...items],
        saved: [...items],
        done,
      }
    }),
  )
}

export function createInitialCustomers(): Customer[] {
  return [
    {
      id: 'siam-foods',
      name: 'บริษัท สยามฟู้ดส์ จำกัด',
      currentPhase: 2,
      tags: [{ name: 'น้ำหวานแต่งกลิ่น' }],
      info: {
        costSyrup: '21.00',
        costPackage: '4.00',
        price: '44.86',
        volume: '2,600',
      },
      branch: seedBranchState(2, { 2: [1] }),
      singleResets: {},
      notifications: [
        { text: 'ฝ่าย R&D ทำงานเสร็จแล้ว - ส่งตัวอย่าง + ราคาเบื้องต้นให้ลูกค้า', time: '2 ชม.ที่แล้ว' },
        { text: 'CEO อนุมัติราคาเบื้องต้นแล้ว', time: 'เมื่อวาน' },
      ],
      issues: [
        {
          openedBy: 'ปอย',
          openedByDept: 'Sales',
          targetDept: 'Purchase',
          text: 'ขอราคา packaging แบบขวด PET เพิ่มอีก 1 option',
          closed: false,
          time: '1 ชม.ที่แล้ว',
        },
      ],
    },
    {
      id: 'green-plus',
      name: 'Green Plus Lab',
      currentPhase: 8,
      tags: [{ name: 'Zero Sugar' }, { name: 'อาหารเสริม' }],
      info: {
        costSyrup: '18.50',
        costPackage: '6.20',
        price: '58.00',
        volume: '8,000',
      },
      branch: seedBranchState(8),
      singleResets: {},
      notifications: [
        { text: 'Sales เปิดใบสั่งผลิตแล้ว - ส่งต่อ R&D + Marketing', time: '30 นาทีที่แล้ว' },
      ],
      issues: [],
    },
  ]
}
