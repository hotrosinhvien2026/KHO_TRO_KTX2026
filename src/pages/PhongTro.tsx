import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { LoadingPage } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { KhuTroForm } from '../components/KhuTroForm'
import { PhongForm } from '../components/PhongForm'
import {
  KHU_VUC_LIST,
  LOAI_PHONG_LIST,
  TIEN_ICH_PHONG,
  TRANG_THAI_PHONG,
} from '../lib/constants'
import { driveImageUrl, formatCoc, formatNgayGio, formatVND } from '../lib/format'
import type { ChuNha, KhuTro, Phong, TrangThaiPhong, LichSu } from '../lib/types'

type KhuTroFull = KhuTro & { chu_nha: ChuNha | null }

export default function PhongTro() {
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const [khus, setKhus] = useState<KhuTroFull[]>([])
  const [phongs, setPhongs] = useState<Phong[]>([])
  const [chuNhaList, setChuNhaList] = useState<ChuNha[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Phong | null>(null)

  // form admin (thêm/sửa)
  const [editingKhu, setEditingKhu] = useState<Partial<KhuTro> | null>(null)
  const [editingPhong, setEditingPhong] = useState<Partial<Phong> | null>(null)

  // bộ lọc
  const [search, setSearch] = useState('')
  const [fKhuVuc, setFKhuVuc] = useState('')
  const [fLoai, setFLoai] = useState('')
  const [fTrangThai, setFTrangThai] = useState('')
  const [fGiaMax, setFGiaMax] = useState('')
  const [fTienIch, setFTienIch] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    const [{ data: kt }, { data: ph }, { data: cn }] = await Promise.all([
      supabase.from('khu_tro').select('*, chu_nha(*)').order('ten_khu_tro'),
      supabase.from('phong').select('*').order('so_phong'),
      supabase.from('chu_nha').select('*').order('ten_chu'),
    ])
    setKhus((kt as KhuTroFull[]) ?? [])
    setPhongs((ph as Phong[]) ?? [])
    setChuNhaList((cn as ChuNha[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const toggleTienIch = (key: string) =>
    setFTienIch((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  // khu nào khớp filter khu_vuc / search-địa-chỉ
  const khuMap = useMemo(() => new Map(khus.map((k) => [k.id, k])), [khus])

  const filteredPhong = useMemo(() => {
    const s = search.trim().toLowerCase()
    const giaMax = fGiaMax ? Number(fGiaMax) : null
    return phongs.filter((p) => {
      const khu = khuMap.get(p.khu_tro_id)
      if (fKhuVuc && khu?.khu_vuc !== fKhuVuc) return false
      if (fLoai && p.loai_phong !== fLoai) return false
      if (fTrangThai && p.trang_thai !== fTrangThai) return false
      if (giaMax != null && (p.gia ?? Infinity) > giaMax) return false
      for (const t of fTienIch) if (!(p as any)[t]) return false
      if (s) {
        const hay = `${p.so_phong} ${khu?.ten_khu_tro ?? ''} ${khu?.dia_chi ?? ''} ${p.ghi_chu ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [phongs, khuMap, fKhuVuc, fLoai, fTrangThai, fGiaMax, fTienIch, search])

  // gom phòng theo khu. Khi KHÔNG lọc theo thuộc tính phòng, vẫn hiện cả khu
  // chưa có phòng (để admin thêm phòng vào khu mới tạo).
  const grouped = useMemo(() => {
    const byKhu = new Map<string, Phong[]>()
    for (const p of filteredPhong) {
      const arr = byKhu.get(p.khu_tro_id) ?? []
      arr.push(p)
      byKhu.set(p.khu_tro_id, arr)
    }
    const s = search.trim().toLowerCase()
    const hasRoomFilter = !!(fLoai || fTrangThai || fGiaMax || fTienIch.length)
    return khus
      .filter((khu) => {
        if (fKhuVuc && khu.khu_vuc !== fKhuVuc) return false
        const rooms = byKhu.get(khu.id)
        if (rooms && rooms.length) return true
        if (hasRoomFilter) return false // có lọc phòng mà khu không có phòng khớp -> ẩn
        if (s) return `${khu.ten_khu_tro} ${khu.dia_chi ?? ''}`.toLowerCase().includes(s)
        return true
      })
      .map((khu) => ({ khu, list: byKhu.get(khu.id) ?? [] }))
      .sort((a, b) => a.khu.ten_khu_tro.localeCompare(b.khu.ten_khu_tro, 'vi'))
  }, [filteredPhong, khus, search, fKhuVuc, fLoai, fTrangThai, fGiaMax, fTienIch])

  const updateTrangThai = async (p: Phong, tt: TrangThaiPhong) => {
    const { error } = await supabase.from('phong').update({ trang_thai: tt }).eq('id', p.id)
    if (error) return toast('Lỗi cập nhật: ' + error.message, 'error')
    setPhongs((prev) => prev.map((x) => (x.id === p.id ? { ...x, trang_thai: tt } : x)))
    toast('Đã cập nhật trạng thái phòng ' + p.so_phong)
  }

  const deletePhong = async (p: Phong) => {
    if (!confirm(`Xóa phòng "${p.so_phong}"? Hành động không thể hoàn tác.`)) return
    const { error } = await supabase.from('phong').delete().eq('id', p.id)
    if (error) return toast('Lỗi xóa: ' + error.message, 'error')
    toast('Đã xóa phòng ' + p.so_phong)
    load()
  }

  const deleteKhu = async (khu: KhuTroFull) => {
    if (!confirm(`Xóa khu trọ "${khu.ten_khu_tro}" và TẤT CẢ phòng bên trong?`)) return
    const { error } = await supabase.from('khu_tro').delete().eq('id', khu.id)
    if (error) return toast('Lỗi xóa: ' + error.message, 'error')
    toast('Đã xóa khu trọ ' + khu.ten_khu_tro)
    load()
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phòng Trọ</h1>
          <p className="text-sm text-gray-500">
            Xem theo khu trọ → các phòng bên trong. {filteredPhong.length} phòng khớp bộ lọc.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditingKhu({})} className="btn-primary shrink-0">
            + Thêm khu trọ
          </button>
        )}
      </div>

      {/* Bộ lọc */}
      <div className="card mb-5 space-y-3">
        <input
          className="input"
          placeholder="🔍 Tìm theo số phòng, tên khu, địa chỉ…"
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
          <select className="input" value={fLoai} onChange={(e) => setFLoai(e.target.value)}>
            <option value="">Mọi loại phòng</option>
            {LOAI_PHONG_LIST.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select className="input" value={fTrangThai} onChange={(e) => setFTrangThai(e.target.value)}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(TRANG_THAI_PHONG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            placeholder="Giá tối đa (đ)"
            value={fGiaMax}
            onChange={(e) => setFGiaMax(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TIEN_ICH_PHONG.map((t) => (
            <button
              key={t.key as string}
              onClick={() => toggleTienIch(t.key as string)}
              className={`badge cursor-pointer ring-1 ${
                fTienIch.includes(t.key as string)
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-gray-600 ring-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách theo khu */}
      {grouped.length === 0 && <p className="py-10 text-center text-gray-400">Không có phòng nào khớp.</p>}

      <div className="space-y-5">
        {grouped.map(({ khu, list }) => (
          <div key={khu.id} className="card">
            <div className="mb-3 border-b pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{khu.ten_khu_tro}</h2>
                {khu.khu_vuc && (
                  <span className="badge bg-brand-50 text-brand-700 ring-brand-600/20">{khu.khu_vuc}</span>
                )}
                <span className="text-xs text-gray-400">{list.length} phòng</span>
                {isAdmin && (
                  <div className="ml-auto flex gap-2 text-xs">
                    <button onClick={() => setEditingPhong({ khu_tro_id: khu.id })} className="text-brand-600 hover:underline">
                      + Thêm phòng
                    </button>
                    <button onClick={() => setEditingKhu(khu)} className="text-gray-500 hover:underline">
                      Sửa khu
                    </button>
                    <button onClick={() => deleteKhu(khu)} className="text-red-600 hover:underline">
                      Xóa khu
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">{khu.dia_chi}</p>
              <p className="text-xs text-gray-400">
                Chủ: {khu.chu_nha?.ten_chu ?? '—'}
                {khu.chu_nha?.sdt ? ` · ${khu.chu_nha.sdt}` : ''}
                {khu.gia_dien ? ` · Điện ${formatVND(khu.gia_dien)}/kWh` : ''}
                {khu.gia_nuoc ? ` · Nước ${formatVND(khu.gia_nuoc)}/m³` : ''}
              </p>
            </div>

            {list.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">
                Chưa có phòng nào trong khu này.
                {isAdmin && ' Bấm “+ Thêm phòng” ở trên để thêm.'}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <PhongCard
                    key={p.id}
                    phong={p}
                    isAdmin={isAdmin}
                    onDetail={() => setDetail(p)}
                    onChangeStatus={(tt) => updateTrangThai(p, tt)}
                    onEdit={() => setEditingPhong(p)}
                    onDelete={() => deletePhong(p)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {detail && (
        <PhongDetailModal
          phong={detail}
          khu={khuMap.get(detail.khu_tro_id)!}
          onClose={() => setDetail(null)}
        />
      )}

      {editingKhu && (
        <KhuTroForm
          initial={editingKhu}
          chuNhaList={chuNhaList}
          onClose={() => setEditingKhu(null)}
          onSaved={() => {
            setEditingKhu(null)
            load()
          }}
        />
      )}

      {editingPhong && (
        <PhongForm
          initial={editingPhong}
          khuList={khus}
          onClose={() => setEditingPhong(null)}
          onSaved={() => {
            setEditingPhong(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function PhongCard({
  phong: p,
  isAdmin,
  onDetail,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  phong: Phong
  isAdmin: boolean
  onDetail: () => void
  onChangeStatus: (tt: TrangThaiPhong) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const tien = TIEN_ICH_PHONG.filter((t) => (p as any)[t.key]).map((t) => t.label)
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-gray-900">Phòng {p.so_phong}</div>
          <div className="text-xs text-gray-500">
            {p.loai_phong}
            {p.dien_tich ? ` · ${p.dien_tich} m²` : ''}
          </div>
        </div>
        <Badge {...TRANG_THAI_PHONG[p.trang_thai]} />
      </div>
      <div className="mt-2 text-lg font-bold text-brand-700">{formatVND(p.gia)}</div>
      {p.co_may_lanh && p.phu_phi_may_lanh ? (
        <div className="text-xs text-amber-600">Máy lạnh +{formatVND(p.phu_phi_may_lanh)}</div>
      ) : null}
      {tien.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tien.slice(0, 4).map((t) => (
            <span key={t} className="badge bg-gray-100 text-gray-600 ring-gray-300">
              {t}
            </span>
          ))}
          {tien.length > 4 && <span className="text-xs text-gray-400">+{tien.length - 4}</span>}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <select
          className="input !py-1.5 text-xs"
          value={p.trang_thai}
          onChange={(e) => onChangeStatus(e.target.value as TrangThaiPhong)}
        >
          {Object.entries(TRANG_THAI_PHONG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <button onClick={onDetail} className="btn-secondary !py-1.5 text-xs">
          Chi tiết
        </button>
      </div>
      {isAdmin && (
        <div className="mt-2 flex justify-end gap-3 text-xs">
          <button onClick={onEdit} className="text-brand-600 hover:underline">
            Sửa
          </button>
          <button onClick={onDelete} className="text-red-600 hover:underline">
            Xóa
          </button>
        </div>
      )}
    </div>
  )
}

function PhongDetailModal({
  phong: p,
  khu,
  onClose,
}: {
  phong: Phong
  khu: KhuTroFull
  onClose: () => void
}) {
  const { toast } = useToast()
  const [lichSu, setLichSu] = useState<LichSu[]>([])
  const img = driveImageUrl(p.link_anh)
  const tien = TIEN_ICH_PHONG.filter((t) => (p as any)[t.key]).map((t) => t.label)

  useEffect(() => {
    supabase
      .from('lich_su_cap_nhat')
      .select('*')
      .eq('doi_tuong', 'phong')
      .eq('doi_tuong_id', p.id)
      .order('thoi_diem', { ascending: false })
      .limit(10)
      .then(({ data }) => setLichSu((data as LichSu[]) ?? []))
  }, [p.id])

  const copyTuVan = async () => {
    const lines = [
      `🏠 ${khu.ten_khu_tro} — Phòng ${p.so_phong}`,
      `📍 ${khu.dia_chi ?? ''}${khu.khu_vuc ? ` (${khu.khu_vuc})` : ''}`,
      `💰 Giá: ${formatVND(p.gia)}/tháng${p.coc_thang ? ` · Cọc: ${formatCoc(p.coc_thang)}` : ''}`,
      `🛏️ Loại: ${p.loai_phong}${p.dien_tich ? ` · ${p.dien_tich} m²` : ''}`,
      tien.length ? `✨ Tiện ích: ${tien.join(', ')}` : '',
      p.co_may_lanh && p.phu_phi_may_lanh ? `❄️ Máy lạnh phụ thu +${formatVND(p.phu_phi_may_lanh)}` : '',
      khu.gia_dien || khu.gia_nuoc
        ? `⚡ Điện ${formatVND(khu.gia_dien)}/kWh · Nước ${formatVND(khu.gia_nuoc)}/m³`
        : '',
      khu.cac_phi_khac ? `📋 Phí khác: ${khu.cac_phi_khac}` : '',
      p.ghi_chu ? `📝 ${p.ghi_chu}` : '',
      p.link_anh ? `📷 Hình ảnh: ${p.link_anh}` : '',
    ].filter(Boolean)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast('Đã sao chép nội dung tư vấn!')
    } catch {
      toast('Trình duyệt chặn sao chép.', 'error')
    }
  }

  return (
    <Modal open onClose={onClose} title={`Phòng ${p.so_phong} — ${khu.ten_khu_tro}`} size="lg">
      <div className="space-y-4">
        {img && (
          <img
            src={img}
            alt={`Phòng ${p.so_phong}`}
            className="max-h-64 w-full rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex items-center gap-2">
          <Badge {...TRANG_THAI_PHONG[p.trang_thai]} />
          <span className="text-2xl font-bold text-brand-700">{formatVND(p.gia)}</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Info label="Địa chỉ" value={`${khu.dia_chi ?? ''}`} />
          <Info label="Khu vực" value={khu.khu_vuc ?? '—'} />
          <Info label="Loại phòng" value={p.loai_phong ?? '—'} />
          <Info label="Diện tích" value={p.dien_tich ? `${p.dien_tich} m²` : '—'} />
          <Info label="Cọc" value={formatCoc(p.coc_thang)} />
          <Info label="Chủ nhà" value={khu.chu_nha ? `${khu.chu_nha.ten_chu} (${khu.chu_nha.sdt ?? ''})` : '—'} />
          <Info label="Phí khác" value={khu.cac_phi_khac ?? '—'} full />
          {tien.length > 0 && <Info label="Tiện ích" value={tien.join(', ')} full />}
          {p.ghi_chu && <Info label="Ghi chú" value={p.ghi_chu} full />}
        </dl>

        <button onClick={copyTuVan} className="btn-primary w-full">
          📋 Sao chép nội dung tư vấn (gửi Zalo)
        </button>

        <div>
          <h4 className="mb-1 text-sm font-semibold text-gray-700">Lịch sử cập nhật trạng thái</h4>
          {lichSu.length === 0 ? (
            <p className="text-xs text-gray-400">Chưa có thay đổi nào.</p>
          ) : (
            <ul className="space-y-1 text-xs text-gray-600">
              {lichSu.map((l) => (
                <li key={l.id}>
                  {formatNgayGio(l.thoi_diem)}: {TRANG_THAI_PHONG[l.gia_tri_cu as TrangThaiPhong]?.label ?? l.gia_tri_cu}
                  {' → '}
                  {TRANG_THAI_PHONG[l.gia_tri_moi as TrangThaiPhong]?.label ?? l.gia_tri_moi}
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
