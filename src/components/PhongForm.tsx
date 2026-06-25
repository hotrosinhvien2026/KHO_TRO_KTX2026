import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { Modal } from './ui/Modal'
import { LOAI_PHONG_LIST, TIEN_ICH_PHONG, TRANG_THAI_PHONG } from '../lib/constants'
import type { KhuTro, Phong, TrangThaiPhong } from '../lib/types'
/**
 * Form thêm/sửa PHÒNG cụ thể (chỉ admin). Phòng luôn thuộc 1 khu trọ.
 * khuList để chọn khu khi thêm; khi sửa thì khu cố định theo phòng.
 */
export function PhongForm({
  initial,
  khuList,
  onClose,
  onSaved,
}: {
  initial: Partial<Phong>
  khuList: KhuTro[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<Phong>>(initial)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof Phong, v: unknown) => setForm((f) => ({ ...f, [k]: v }))
  const num = (v: string) => (v === '' ? null : Number(v))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.khu_tro_id) return toast('Vui lòng chọn khu trọ', 'error')
    setBusy(true)
    const payload: Record<string, unknown> = {
      khu_tro_id: form.khu_tro_id,
      so_phong: form.so_phong,
      loai_phong: form.loai_phong ?? 'Khác',
      dien_tich: form.dien_tich ?? null,
      gia: form.gia ?? null,
      coc_thang: form.coc_thang ?? null,
      co_wc_rieng: !!form.co_wc_rieng,
      co_gac_lung: !!form.co_gac_lung,
      co_may_lanh: !!form.co_may_lanh,
      phu_phi_may_lanh: form.co_may_lanh ? form.phu_phi_may_lanh ?? null : null,
      co_may_nong_lanh: !!form.co_may_nong_lanh,
      co_tu_lanh: !!form.co_tu_lanh,
      co_wifi: !!form.co_wifi,
      co_giu_xe: !!form.co_giu_xe,
      co_bep: !!form.co_bep,
      trang_thai: form.trang_thai ?? 'con_phong',
      ghi_chu: form.ghi_chu ?? null,
      link_anh: form.link_anh ?? null,
    }
    const { error } = form.id
      ? await supabase.from('phong').update(payload).eq('id', form.id)
      : await supabase.from('phong').insert(payload)
    setBusy(false)
    if (error) return toast('Lỗi lưu phòng: ' + error.message, 'error')
    toast(form.id ? 'Đã cập nhật phòng' : 'Đã thêm phòng')
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={form.id ? `Sửa phòng ${form.so_phong ?? ''}` : 'Thêm phòng'} size="lg">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Khu trọ *</label>
          <select className="input" required value={form.khu_tro_id ?? ''} onChange={(e) => set('khu_tro_id', e.target.value)}>
            <option value="">— Chọn khu trọ —</option>
            {khuList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_khu_tro}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Số phòng *</label>
            <input className="input" required value={form.so_phong ?? ''} onChange={(e) => set('so_phong', e.target.value)} placeholder="302, C-8…" />
          </div>
          <div>
            <label className="label">Loại phòng</label>
            <select className="input" value={form.loai_phong ?? 'Khác'} onChange={(e) => set('loai_phong', e.target.value)}>
              {LOAI_PHONG_LIST.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Diện tích (m²)</label>
            <input className="input" type="number" step="0.1" value={form.dien_tich ?? ''} onChange={(e) => set('dien_tich', num(e.target.value))} />
          </div>
          <div>
            <label className="label">Giá (đ/tháng)</label>
            <input className="input" type="number" value={form.gia ?? ''} onChange={(e) => set('gia', num(e.target.value))} />
          </div>
          <div>
            <label className="label">Cọc (số tháng)</label>
            <input className="input" type="number" step="0.5" value={form.coc_thang ?? ''} onChange={(e) => set('coc_thang', num(e.target.value))} placeholder="1" />
          </div>
        </div>

        <div>
          <label className="label">Tiện ích</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIEN_ICH_PHONG.map((t) => (
              <label key={t.key as string} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  checked={!!(form as Record<string, unknown>)[t.key as string]}
                  onChange={(e) => set(t.key as keyof Phong, e.target.checked)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        {form.co_may_lanh && (
          <div>
            <label className="label">Phụ phí máy lạnh (đ/tháng, để trống nếu không có)</label>
            <input className="input" type="number" value={form.phu_phi_may_lanh ?? ''} onChange={(e) => set('phu_phi_may_lanh', num(e.target.value))} placeholder="300000" />
          </div>
        )}

        <div>
          <label className="label">Trạng thái</label>
          <select className="input" value={form.trang_thai ?? 'con_phong'} onChange={(e) => set('trang_thai', e.target.value as TrangThaiPhong)}>
            {Object.entries(TRANG_THAI_PHONG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Link ảnh (Google Drive)</label>
          <input className="input" value={form.link_anh ?? ''} onChange={(e) => set('link_anh', e.target.value)} />
        </div>
        <div>
          <label className="label">Ghi chú</label>
          <textarea className="input" rows={2} value={form.ghi_chu ?? ''} onChange={(e) => set('ghi_chu', e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
