import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { LoadingPage } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { TRANG_THAI_LEAD } from '../lib/constants'
import { formatNgay, formatVND } from '../lib/format'
import type { Lead, Profile, TrangThaiLead } from '../lib/types'

const empty = (uid: string): Partial<Lead> => ({
  ten_khach: '',
  sdt_khach: '',
  ngan_sach: null,
  khu_vuc_mong_muon: '',
  yeu_cau: '',
  trang_thai: 'moi',
  ket_qua: '',
  ctv_phu_trach: uid,
})

export default function Leads() {
  const { session, isAdmin } = useAuth()
  const { toast } = useToast()
  const uid = session!.user.id

  const [leads, setLeads] = useState<Lead[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Lead> | null>(null)

  const [fTrangThai, setFTrangThai] = useState('')
  const [fCtv, setFCtv] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from('leads').select('*').order('ngay_tao', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    setLeads((l as Lead[]) ?? [])
    setProfiles((p as Profile[]) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const profMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) => (!fTrangThai || l.trang_thai === fTrangThai) && (!fCtv || l.ctv_phu_trach === fCtv)
      ),
    [leads, fTrangThai, fCtv]
  )

  const canEdit = (l: Lead) => isAdmin || l.ctv_phu_trach === uid

  const save = async (form: Partial<Lead>) => {
    const payload = { ...form, ngan_sach: form.ngan_sach || null }
    let error
    if (form.id) {
      ;({ error } = await supabase.from('leads').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('leads').insert({ ...payload, ctv_phu_trach: uid }))
    }
    if (error) return toast('Lỗi lưu: ' + error.message, 'error')
    toast(form.id ? 'Đã cập nhật lead' : 'Đã tạo lead mới')
    setEditing(null)
    load()
  }

  const remove = async (l: Lead) => {
    if (!confirm(`Xóa lead "${l.ten_khach}"?`)) return
    const { error } = await supabase.from('leads').delete().eq('id', l.id)
    if (error) return toast('Lỗi xóa: ' + error.message, 'error')
    toast('Đã xóa lead')
    load()
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead khách</h1>
          <p className="text-sm text-gray-500">{filtered.length} khách</p>
        </div>
        <button onClick={() => setEditing(empty(uid))} className="btn-primary">
          + Tạo Lead
        </button>
      </div>

      <div className="card mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select className="input" value={fTrangThai} onChange={(e) => setFTrangThai(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(TRANG_THAI_LEAD).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select className="input" value={fCtv} onChange={(e) => setFCtv(e.target.value)}>
          <option value="">Mọi CTV</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? p.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && <p className="py-10 text-center text-gray-400">Chưa có lead nào.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((l) => (
          <div key={l.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900">{l.ten_khach}</div>
                <div className="text-xs text-gray-500">{l.sdt_khach || '—'}</div>
              </div>
              <Badge {...TRANG_THAI_LEAD[l.trang_thai]} />
            </div>
            <div className="mt-2 space-y-0.5 text-sm text-gray-600">
              <div>💰 Ngân sách: {formatVND(l.ngan_sach)}</div>
              <div>📍 Mong muốn: {l.khu_vuc_mong_muon || '—'}</div>
              {l.yeu_cau && <div>📝 {l.yeu_cau}</div>}
              {l.ket_qua && <div className="text-gray-500">↳ {l.ket_qua}</div>}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span>
                CTV: {profMap.get(l.ctv_phu_trach ?? '')?.full_name ?? '—'} · {formatNgay(l.ngay_tao)}
              </span>
              {canEdit(l) && (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(l)} className="text-brand-600 hover:underline">
                    Sửa
                  </button>
                  <button onClick={() => remove(l)} className="text-red-600 hover:underline">
                    Xóa
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && <LeadForm initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function LeadForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<Lead>
  onClose: () => void
  onSave: (f: Partial<Lead>) => void
}) {
  const [form, setForm] = useState<Partial<Lead>>(initial)
  const set = (k: keyof Lead, v: any) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal open onClose={onClose} title={form.id ? 'Cập nhật Lead' : 'Tạo Lead mới'}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-3"
      >
        <div>
          <label className="label">Tên khách *</label>
          <input className="input" required value={form.ten_khach ?? ''} onChange={(e) => set('ten_khach', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">SĐT</label>
            <input className="input" value={form.sdt_khach ?? ''} onChange={(e) => set('sdt_khach', e.target.value)} />
          </div>
          <div>
            <label className="label">Ngân sách (đ)</label>
            <input
              className="input"
              type="number"
              value={form.ngan_sach ?? ''}
              onChange={(e) => set('ngan_sach', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>
        <div>
          <label className="label">Khu vực mong muốn</label>
          <input
            className="input"
            value={form.khu_vuc_mong_muon ?? ''}
            onChange={(e) => set('khu_vuc_mong_muon', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Yêu cầu</label>
          <textarea className="input" rows={2} value={form.yeu_cau ?? ''} onChange={(e) => set('yeu_cau', e.target.value)} />
        </div>
        <div>
          <label className="label">Trạng thái</label>
          <select
            className="input"
            value={form.trang_thai}
            onChange={(e) => set('trang_thai', e.target.value as TrangThaiLead)}
          >
            {Object.entries(TRANG_THAI_LEAD).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Kết quả / Ghi chú tiến trình</label>
          <textarea className="input" rows={2} value={form.ket_qua ?? ''} onChange={(e) => set('ket_qua', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button type="submit" className="btn-primary">
            Lưu
          </button>
        </div>
      </form>
    </Modal>
  )
}
