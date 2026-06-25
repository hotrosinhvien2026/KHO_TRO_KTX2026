import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { Modal } from './ui/Modal'
import { KHU_VUC_LIST } from '../lib/constants'
import type { ChuNha, Ktx, TrangThaiKtx} from '../lib/types'

/** Form thêm/sửa KTX (chỉ admin). */
export function KtxForm({
  initial,
  chuNhaList,
  onClose,
  onSaved,
}: {
  initial: Partial<Ktx>
  chuNhaList: ChuNha[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<Ktx>>(initial)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof Ktx, v: unknown) => setForm((f) => ({ ...f, [k]: v }))
  const num = (v: string) => (v === '' ? null : Number(v))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const payload = {
      ma_ktx: form.ma_ktx ?? null,
      ten_ktx: form.ten_ktx,
      dia_chi: form.dia_chi ?? null,
      khu_vuc: form.khu_vuc ?? null,
      chu_nha_id: form.chu_nha_id ?? null,
      gia_tu: form.gia_tu ?? null,
      gia_den: form.gia_den ?? null,
      so_slot_trong: form.so_slot_trong ?? null,
      ghi_chu_slot: form.ghi_chu_slot ?? null,
      doi_tuong: form.doi_tuong ?? null,
      tien_ich: form.tien_ich ?? null,
      coc_thang: form.coc_thang ?? null,
      trang_thai: form.trang_thai ?? 'con_cho',
      link_anh: form.link_anh ?? null,
    }
    const { error } = form.id
      ? await supabase.from('ktx').update(payload).eq('id', form.id)
      : await supabase.from('ktx').insert(payload)
    setBusy(false)
    if (error) return toast('Lỗi lưu KTX: ' + error.message, 'error')
    toast(form.id ? 'Đã cập nhật KTX' : 'Đã thêm KTX')
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={form.id ? 'Sửa KTX' : 'Thêm KTX'} size="lg">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Mã KTX</label>
            <input className="input" value={form.ma_ktx ?? ''} onChange={(e) => set('ma_ktx', e.target.value)} placeholder="KTX01" />
          </div>
          <div className="col-span-2">
            <label className="label">Tên KTX *</label>
            <input className="input" required value={form.ten_ktx ?? ''} onChange={(e) => set('ten_ktx', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Địa chỉ</label>
          <input className="input" value={form.dia_chi ?? ''} onChange={(e) => set('dia_chi', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Khu vực</label>
            <select className="input" value={form.khu_vuc ?? ''} onChange={(e) => set('khu_vuc', e.target.value || null)}>
              <option value="">— Chọn —</option>
              {KHU_VUC_LIST.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Đối tượng</label>
            <select className="input" value={form.doi_tuong ?? ''} onChange={(e) => set('doi_tuong', e.target.value || null)}>
              <option value="">— Chọn —</option>
              {DOI_TUONG_LIST.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Chủ / Quản lý KTX</label>
          <select className="input" value={form.chu_nha_id ?? ''} onChange={(e) => set('chu_nha_id', e.target.value || null)}>
            <option value="">— Chọn —</option>
            {chuNhaList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ten_chu} {c.sdt ? `(${c.sdt})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Giá từ (đ)</label>
            <input className="input" type="number" value={form.gia_tu ?? ''} onChange={(e) => set('gia_tu', num(e.target.value))} />
          </div>
          <div>
            <label className="label">Giá đến (đ)</label>
            <input className="input" type="number" value={form.gia_den ?? ''} onChange={(e) => set('gia_den', num(e.target.value))} />
          </div>
          <div>
            <label className="label">Cọc (số tháng)</label>
            <input className="input" type="number" step="0.5" value={form.coc_thang ?? ''} onChange={(e) => set('coc_thang', num(e.target.value))} placeholder="1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Số slot trống</label>
            <input className="input" type="number" value={form.so_slot_trong ?? ''} onChange={(e) => set('so_slot_trong', num(e.target.value))} />
          </div>
          <div>
            <label className="label">Ghi chú slot (giữ bản gốc)</label>
            <input className="input" value={form.ghi_chu_slot ?? ''} onChange={(e) => set('ghi_chu_slot', e.target.value)} placeholder="<20 slot, khoảng 20 giường…" />
          </div>
        </div>
        <div>
          <label className="label">Tiện ích</label>
          <textarea className="input" rows={2} value={form.tien_ich ?? ''} onChange={(e) => set('tien_ich', e.target.value)} placeholder="Máy lạnh, wifi, giặt sấy, bảo vệ 24/7…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Trạng thái</label>
            <select className="input" value={form.trang_thai ?? 'con_cho'} onChange={(e) => set('trang_thai', e.target.value as TrangThaiKtx)}>
              {Object.entries(TRANG_THAI_KTX).map(([k, v]) => (
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
