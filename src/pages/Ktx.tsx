import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { LoadingPage } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { KtxForm } from '../components/KtxForm'
import { DOI_TUONG_LIST, KHU_VUC_LIST, TRANG_THAI_KTX } from '../lib/constants'
import { driveImageUrl, formatCoc, formatDaiGia, formatNgayGio } from '../lib/format'
import type { ChuNha, Ktx, LichSu, TrangThaiKtx } from '../lib/types'

type KtxFull = Ktx & { chu_nha: ChuNha | null }

export default function KtxPage() {
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [list, setList] = useState<KtxFull[]>([])
  const [chuNhaList, setChuNhaList] = useState<ChuNha[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<KtxFull | null>(null)
  const [editing, setEditing] = useState<Partial<Ktx> | null>(null)

  const [search, setSearch] = useState('')
  const [fKhuVuc, setFKhuVuc] = useState('')
  const [fDoiTuong, setFDoiTuong] = useState('')
  const [fTrangThai, setFTrangThai] = useState('')
  const [fGiaMax, setFGiaMax] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data }, { data: cn }] = await Promise.all([
      supabase.from('ktx').select('*, chu_nha(*)').order('ten_ktx'),
      supabase.from('chu_nha').select('*').order('ten_chu'),
    ])
    setList((data as KtxFull[]) ?? [])
    setChuNhaList((cn as ChuNha[]) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const deleteKtx = async (k: KtxFull) => {
    if (!confirm(`Xóa KTX "${k.ten_ktx}"? Hành động không thể hoàn tác.`)) return
    const { error } = await supabase.from('ktx').delete().eq('id', k.id)
    if (error) return toast('Lỗi xóa: ' + error.message, 'error')
    toast('Đã xóa ' + k.ten_ktx)
    load()
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    const giaMax = fGiaMax ? Number(fGiaMax) : null
    return list.filter((k) => {
      if (fKhuVuc && k.khu_vuc !== fKhuVuc) return false
      if (fDoiTuong && k.doi_tuong !== fDoiTuong) return false
      if (fTrangThai && k.trang_thai !== fTrangThai) return false
      if (giaMax != null && (k.gia_tu ?? Infinity) > giaMax) return false
      if (s) {
        const hay = `${k.ten_ktx} ${k.ma_ktx ?? ''} ${k.dia_chi ?? ''} ${k.tien_ich ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [list, fKhuVuc, fDoiTuong, fTrangThai, fGiaMax, search])

  const updateTrangThai = async (k: KtxFull, tt: TrangThaiKtx) => {
    const { error } = await supabase.from('ktx').update({ trang_thai: tt }).eq('id', k.id)
    if (error) return toast('Lỗi: ' + error.message, 'error')
    setList((prev) => prev.map((x) => (x.id === k.id ? { ...x, trang_thai: tt } : x)))
    toast('Đã cập nhật ' + k.ten_ktx)
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ký túc xá</h1>
          <p className="text-sm text-gray-500">{filtered.length} cơ sở khớp bộ lọc.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing({})} className="btn-primary shrink-0">
            + Thêm KTX
          </button>
        )}
      </div>

      <div className="card mb-5 space-y-3">
        <input
          className="input"
          placeholder="🔍 Tìm theo tên, mã, địa chỉ, tiện ích…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select className="input" value={fKhuVuc} onChange={(e) => setFKhuVuc(e.target.value)}>
            <option value="">Mọi khu vực</option>
            {KHU_VUC_LIST.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select className="input" value={fDoiTuong} onChange={(e) => setFDoiTuong(e.target.value)}>
            <option value="">Mọi đối tượng</option>
            {DOI_TUONG_LIST.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select className="input" value={fTrangThai} onChange={(e) => setFTrangThai(e.target.value)}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(TRANG_THAI_KTX).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            placeholder="Giá từ tối đa (đ)"
            value={fGiaMax}
            onChange={(e) => setFGiaMax(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 && <p className="py-10 text-center text-gray-400">Không có KTX nào khớp.</p>}

      {/* Desktop: bảng. Mobile: card. */}
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-gray-200 lg:block">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">KTX</th>
              <th className="px-4 py-3">Khu vực</th>
              <th className="px-4 py-3">Đối tượng</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((k) => (
              <tr key={k.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{k.ten_ktx}</div>
                  <div className="text-xs text-gray-400">{k.dia_chi}</div>
                </td>
                <td className="px-4 py-3">{k.khu_vuc ?? '—'}</td>
                <td className="px-4 py-3">{k.doi_tuong ?? '—'}</td>
                <td className="px-4 py-3 font-semibold text-brand-700">
                  {formatDaiGia(k.gia_tu, k.gia_den)}
                </td>
                <td className="px-4 py-3">{k.ghi_chu_slot ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    className="input !py-1 text-xs"
                    value={k.trang_thai}
                    onChange={(e) => updateTrangThai(k, e.target.value as TrangThaiKtx)}
                  >
                    {Object.entries(TRANG_THAI_KTX).map(([key, v]) => (
                      <option key={key} value={key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setDetail(k)} className="btn-secondary !py-1 text-xs">
                      Chi tiết
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => setEditing(k)} className="text-xs text-brand-600 hover:underline">
                          Sửa
                        </button>
                        <button onClick={() => deleteKtx(k)} className="text-xs text-red-600 hover:underline">
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {filtered.map((k) => (
          <div key={k.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900">{k.ten_ktx}</div>
                <div className="text-xs text-gray-400">{k.dia_chi}</div>
              </div>
              <Badge {...TRANG_THAI_KTX[k.trang_thai]} />
            </div>
            <div className="mt-2 text-lg font-bold text-brand-700">
              {formatDaiGia(k.gia_tu, k.gia_den)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {k.khu_vuc ?? '—'} · {k.doi_tuong ?? '—'} · Slot: {k.ghi_chu_slot ?? '—'}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                className="input !py-1.5 text-xs"
                value={k.trang_thai}
                onChange={(e) => updateTrangThai(k, e.target.value as TrangThaiKtx)}
              >
                {Object.entries(TRANG_THAI_KTX).map(([key, v]) => (
                  <option key={key} value={key}>
                    {v.label}
                  </option>
                ))}
              </select>
              <button onClick={() => setDetail(k)} className="btn-secondary !py-1.5 text-xs">
                Chi tiết
              </button>
            </div>
            {isAdmin && (
              <div className="mt-2 flex justify-end gap-3 text-xs">
                <button onClick={() => setEditing(k)} className="text-brand-600 hover:underline">
                  Sửa
                </button>
                <button onClick={() => deleteKtx(k)} className="text-red-600 hover:underline">
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {detail && <KtxDetailModal ktx={detail} onClose={() => setDetail(null)} />}

      {editing && (
        <KtxForm
          initial={editing}
          chuNhaList={chuNhaList}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function KtxDetailModal({ ktx: k, onClose }: { ktx: KtxFull; onClose: () => void }) {
  const { toast } = useToast()
  const [lichSu, setLichSu] = useState<LichSu[]>([])
  const img = driveImageUrl(k.link_anh)

  useEffect(() => {
    supabase
      .from('lich_su_cap_nhat')
      .select('*')
      .eq('doi_tuong', 'ktx')
      .eq('doi_tuong_id', k.id)
      .order('thoi_diem', { ascending: false })
      .limit(10)
      .then(({ data }) => setLichSu((data as LichSu[]) ?? []))
  }, [k.id])

  const copyTuVan = async () => {
    const lines = [
      `🛏️ ${k.ten_ktx}${k.ma_ktx ? ` (${k.ma_ktx})` : ''}`,
      `📍 ${k.dia_chi ?? ''}${k.khu_vuc ? ` (${k.khu_vuc})` : ''}`,
      `💰 Giá: ${formatDaiGia(k.gia_tu, k.gia_den)}${k.coc_thang ? ` · Cọc: ${formatCoc(k.coc_thang)}` : ''}`,
      k.doi_tuong ? `👥 Đối tượng: ${k.doi_tuong}` : '',
      k.ghi_chu_slot ? `🔢 Chỗ trống: ${k.ghi_chu_slot}` : '',
      k.tien_ich ? `✨ Tiện ích: ${k.tien_ich}` : '',
      k.link_anh ? `📷 Hình ảnh: ${k.link_anh}` : '',
    ].filter(Boolean)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast('Đã sao chép nội dung tư vấn!')
    } catch {
      toast('Trình duyệt chặn sao chép.', 'error')
    }
  }

  return (
    <Modal open onClose={onClose} title={k.ten_ktx} size="lg">
      <div className="space-y-4">
        {img && (
          <img
            src={img}
            alt={k.ten_ktx}
            className="max-h-64 w-full rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex items-center gap-2">
          <Badge {...TRANG_THAI_KTX[k.trang_thai]} />
          <span className="text-2xl font-bold text-brand-700">{formatDaiGia(k.gia_tu, k.gia_den)}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Info label="Mã KTX" value={k.ma_ktx ?? '—'} />
          <Info label="Khu vực" value={k.khu_vuc ?? '—'} />
          <Info label="Đối tượng" value={k.doi_tuong ?? '—'} />
          <Info label="Chỗ trống" value={k.ghi_chu_slot ?? '—'} />
          <Info label="Cọc" value={formatCoc(k.coc_thang)} />
          <Info label="Chủ/Quản lý" value={k.chu_nha ? `${k.chu_nha.ten_chu} (${k.chu_nha.sdt ?? ''})` : '—'} />
          <Info label="Địa chỉ" value={k.dia_chi ?? '—'} full />
          {k.tien_ich && <Info label="Tiện ích" value={k.tien_ich} full />}
        </dl>

        <button onClick={copyTuVan} className="btn-primary w-full">
          📋 Sao chép nội dung tư vấn (gửi Zalo)
        </button>

        <div>
          <h4 className="mb-1 text-sm font-semibold text-gray-700">Lịch sử cập nhật</h4>
          {lichSu.length === 0 ? (
            <p className="text-xs text-gray-400">Chưa có thay đổi nào.</p>
          ) : (
            <ul className="space-y-1 text-xs text-gray-600">
              {lichSu.map((l) => (
                <li key={l.id}>
                  {formatNgayGio(l.thoi_diem)}:{' '}
                  {TRANG_THAI_KTX[l.gia_tri_cu as TrangThaiKtx]?.label ?? l.gia_tri_cu} →{' '}
                  {TRANG_THAI_KTX[l.gia_tri_moi as TrangThaiKtx]?.label ?? l.gia_tri_moi}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value || '—'}</dd>
    </div>
  )
}
