import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LoadingPage } from '../components/ui/Spinner'
import { formatNgayGio } from '../lib/format'

interface Stats {
  tongKtx: number
  ktxConCho: number
  tongPhong: number
  phongConTrong: number
  tongLead: number
  leadDaChot: number
  capNhatCuoi: string | null
}

// Đếm bằng truy vấn thật (head + count) — không dựa vào công thức Sheet lỗi.
async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count: c } = await q
  return c ?? 0
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    ;(async () => {
      const [tongKtx, ktxConCho, tongPhong, phongConTrong, tongLead, leadDaChot] = await Promise.all([
        count('ktx'),
        count('ktx', (q) => q.in('trang_thai', ['con_cho', 'giu_cho'])),
        count('phong'),
        count('phong', (q) => q.eq('trang_thai', 'con_phong')),
        count('leads'),
        count('leads', (q) => q.eq('trang_thai', 'da_chot')),
      ])

      // "Cập nhật lần cuối" = max(ngay_cap_nhat) giữa phong & ktx.
      const [{ data: p }, { data: k }] = await Promise.all([
        supabase.from('phong').select('ngay_cap_nhat').order('ngay_cap_nhat', { ascending: false }).limit(1),
        supabase.from('ktx').select('ngay_cap_nhat').order('ngay_cap_nhat', { ascending: false }).limit(1),
      ])
      const times = [p?.[0]?.ngay_cap_nhat, k?.[0]?.ngay_cap_nhat].filter(Boolean) as string[]
      const capNhatCuoi = times.sort().at(-1) ?? null

      setStats({ tongKtx, ktxConCho, tongPhong, phongConTrong, tongLead, leadDaChot, capNhatCuoi })
    })()
  }, [])

  if (!stats) return <LoadingPage label="Đang tính thống kê…" />

  const cards = [
    { label: 'Tổng KTX', value: stats.tongKtx, sub: 'cơ sở', color: 'text-brand-600' },
    { label: 'KTX còn chỗ', value: stats.ktxConCho, sub: 'đang nhận khách', color: 'text-green-600' },
    { label: 'Tổng phòng trọ', value: stats.tongPhong, sub: 'phòng', color: 'text-brand-600' },
    { label: 'Phòng còn trống', value: stats.phongConTrong, sub: 'sẵn sàng', color: 'text-green-600' },
    { label: 'Tổng Lead', value: stats.tongLead, sub: 'khách', color: 'text-brand-600' },
    { label: 'Lead đã chốt', value: stats.leadDaChot, sub: 'thành công', color: 'text-green-600' },
  ]

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-500">Số liệu tính trực tiếp từ cơ sở dữ liệu.</p>
        </div>
        <p className="text-xs text-gray-500">
          Cập nhật lần cuối: <span className="font-medium">{formatNgayGio(stats.capNhatCuoi)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className={`mt-1 text-3xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-400">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
