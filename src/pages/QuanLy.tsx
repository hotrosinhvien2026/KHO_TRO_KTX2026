import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { LoadingPage } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import type { ChuNha, Profile, UserRole } from '../lib/types'

type Tab = 'ctv' | 'chu_nha'

export default function QuanLy() {
  const [tab, setTab] = useState<Tab>('ctv')
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Quản lý</h1>
      <p className="mb-4 text-sm text-gray-500">Khu vực dành cho quản trị viên.</p>

      <div className="mb-5 flex gap-2">
        <TabBtn active={tab === 'ctv'} onClick={() => setTab('ctv')}>
          👤 CTV & Tài khoản
        </TabBtn>
        <TabBtn active={tab === 'chu_nha'} onClick={() => setTab('chu_nha')}>
          🏘️ Chủ nhà
        </TabBtn>
      </div>

      {tab === 'ctv' ? <QuanLyCtv /> : <QuanLyChuNha />}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

/* ----------------------------- CTV ----------------------------- */
function QuanLyCtv() {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const changeRole = async (p: Profile, role: UserRole) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id)
    if (error) return toast('Lỗi: ' + error.message, 'error')
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, role } : x)))
    toast(`Đã đặt ${p.full_name ?? 'user'} thành ${role === 'admin' ? 'Admin' : 'CTV'}`)
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setCreating(true)} className="btn-primary">
          + Tạo tài khoản
        </button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">Vai trò</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{p.full_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    className="input !py-1 text-xs"
                    value={p.role}
                    onChange={(e) => changeRole(p, e.target.value as UserRole)}
                  >
                    <option value="ctv">Cộng tác viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateAccountModal
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function CreateAccountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', role: 'ctv' as UserRole })
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    // Dùng client tạm (persistSession: false) để KHÔNG ghi đè phiên admin.
    const temp = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { error } = await temp.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.full_name, phone: form.phone, role: form.role } },
    })
    setBusy(false)
    if (error) return toast('Lỗi tạo tài khoản: ' + error.message, 'error')
    toast('Đã tạo tài khoản. Trigger tự tạo profile với vai trò đã chọn.')
    onDone()
  }

  return (
    <Modal open onClose={onClose} title="Tạo tài khoản mới">
      <form onSubmit={submit} className="space-y-3">
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
          Lưu ý: nếu project bật "Confirm email", người dùng cần xác nhận email trước khi đăng nhập.
          Có thể tắt ở Supabase → Authentication → Providers → Email.
        </p>
        <div>
          <label className="label">Email *</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Mật khẩu *</label>
          <input className="input" type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Họ tên</label>
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">SĐT</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Vai trò</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="ctv">Cộng tác viên</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ----------------------------- CHỦ NHÀ ----------------------------- */
function QuanLyChuNha() {
  const { toast } = useToast()
  const [list, setList] = useState<ChuNha[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<ChuNha> | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('chu_nha').select('*').order('ten_chu')
    setList((data as ChuNha[]) ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const save = async (f: Partial<ChuNha>) => {
    let error
    if (f.id) ({ error } = await supabase.from('chu_nha').update(f).eq('id', f.id))
    else ({ error } = await supabase.from('chu_nha').insert(f))
    if (error) return toast('Lỗi: ' + error.message, 'error')
    toast('Đã lưu chủ nhà')
    setEditing(null)
    load()
  }

  const remove = async (c: ChuNha) => {
    if (!confirm(`Xóa chủ nhà "${c.ten_chu}"? (Khu/KTX liên quan sẽ gỡ liên kết)`)) return
    const { error } = await supabase.from('chu_nha').delete().eq('id', c.id)
    if (error) return toast('Lỗi: ' + error.message, 'error')
    toast('Đã xóa')
    load()
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing({ ten_chu: '' })} className="btn-primary">
          + Thêm chủ nhà
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900">{c.ten_chu}</div>
                <div className="text-sm text-gray-500">
                  {c.sdt || '—'}
                  {c.zalo ? ` · Zalo: ${c.zalo}` : ''}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditing(c)} className="text-brand-600 hover:underline">
                  Sửa
                </button>
                <button onClick={() => remove(c)} className="text-red-600 hover:underline">
                  Xóa
                </button>
              </div>
            </div>
            {c.ghi_chu_hop_tac && <p className="mt-1 text-sm text-gray-600">{c.ghi_chu_hop_tac}</p>}
          </div>
        ))}
      </div>

      {editing && <ChuNhaForm initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function ChuNhaForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<ChuNha>
  onClose: () => void
  onSave: (f: Partial<ChuNha>) => void
}) {
  const [form, setForm] = useState<Partial<ChuNha>>(initial)
  const set = (k: keyof ChuNha, v: any) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal open onClose={onClose} title={form.id ? 'Sửa chủ nhà' : 'Thêm chủ nhà'}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-3"
      >
        <div>
          <label className="label">Tên chủ *</label>
          <input className="input" required value={form.ten_chu ?? ''} onChange={(e) => set('ten_chu', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">SĐT</label>
            <input className="input" value={form.sdt ?? ''} onChange={(e) => set('sdt', e.target.value)} />
          </div>
          <div>
            <label className="label">Zalo</label>
            <input className="input" value={form.zalo ?? ''} onChange={(e) => set('zalo', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Ghi chú hợp tác</label>
          <textarea className="input" rows={2} value={form.ghi_chu_hop_tac ?? ''} onChange={(e) => set('ghi_chu_hop_tac', e.target.value)} />
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
