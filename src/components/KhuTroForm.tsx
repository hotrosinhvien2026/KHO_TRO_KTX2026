import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { KHU_VUC_LIST } from '../../lib/constants'
import type { ChuNha, KhuTro } from '../../lib/types'

/**
 * Form thêm/sửa KHU TRỌ (chỉ admin dùng).
 * Tự ghi vào Supabase rồi gọi onSaved() để trang cha tải lại.
 */
export function KhuTroForm({
  initial,
  chuNhaList,
  onClose,
  onSaved,
}: {
  initial: Partial<KhuTro>
  chuNhaList: ChuNha[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<KhuTro>>(initial)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof KhuTro, v: unknown) => setForm((f) => ({ ...f, [k]: v }))
  const num = (v: string) => (v === '' ? null : Number(v))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const payload = {
      ten_khu_tro: form.ten_khu_tro,
      dia_chi: form.dia_chi ?? null,
      khu_vuc: form.khu_vuc ?? null,
      chu_nha_id: form.chu_nha_id ?? null,
      gia_dien: form.gia_dien ?? null,
      gia_nuoc: form.gia_nuoc ?? null,
      cac_phi_khac: form.cac_phi_khac ?? null,
      link_anh: form.link_anh ?? null,
      ghi_chu_chung: form.ghi_chu_chung ?? null,
    }
    const { error } = form.id
      ? await supabase.from('khu_tro').update(payload).eq('id', form.id)
      : await supabase.from('khu_tro').insert(payload)
    setBusy(false)
    if (error) return toast('Lỗi lưu khu trọ: ' + error.message, 'error')
    toast(form.id ? 'Đã cập nhật khu trọ' : 'Đã thêm khu trọ')
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={form.id ? 'Sửa khu trọ' : 'Thêm khu trọ'} size="lg">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Tên khu trọ *</label>
          <input className="input" required value={form.ten_khu_tro ?? ''} onChange={(e) => set('ten_khu_tro', e.target.value)} />
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
            <label className="label">Chủ nhà</label>
            <select className="input" value={form.chu_nha_id ?? ''} onChange={(e) => set('chu_nha_id', e.target.value || null)}>
              <option value="">— Chọn —</option>
              {chuNhaList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ten_chu} {c.sdt ? `(${c.sdt})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Giá điện (đ/kWh)</label>
            <input className="input" type="number" value={form.gia_dien ?? ''} onChange={(e) => set('gia_dien', num(e.target.value))} />
          </div>
          <div>
            <label className="label">Giá nước (đ/m³)</label>
            <input className="input" type="number" value={form.gia_nuoc ?? ''} onChange={(e) => set('gia_nuoc', num(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">Các phí khác</label>
          <textarea className="input" rows={2} placeholder="Net 100k, rác 50k, giữ xe 80k…" value={form.cac_phi_khac ?? ''} onChange={(e) => set('cac_phi_khac', e.target.value)} />
        </div>
        <div>
          <label className="label">Link ảnh (Google Drive)</label>
          <input className="input" value={form.link_anh ?? ''} onChange={(e) => set('link_anh', e.target.value)} />
        </div>
        <div>
          <label className="label">Ghi chú chung</label>
          <textarea className="input" rows={2} value={form.ghi_chu_chung ?? ''} onChange={(e) => set('ghi_chu_chung', e.target.value)} />
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
