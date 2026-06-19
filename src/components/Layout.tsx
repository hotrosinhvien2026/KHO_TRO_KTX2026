import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/phong-tro', label: 'Phòng Trọ', icon: '🏠' },
  { to: '/ktx', label: 'KTX', icon: '🛏️' },
  { to: '/leads', label: 'Lead khách', icon: '📞' },
  { to: '/quan-ly', label: 'Quản lý', icon: '⚙️', adminOnly: true },
]

export function Layout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const items = navItems.filter((i) => !i.adminOnly || isAdmin)

  const handleSignOut = async () => {
    await signOut()
    navigate('/dang-nhap')
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white p-4 lg:flex">
        <Brand />
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={linkCls}>
              <span>{i.icon}</span>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <UserBox profile={profile} onSignOut={handleSignOut} />
      </aside>

      {/* Topbar mobile */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <Brand />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {menuOpen && (
          <div className="border-b border-gray-200 bg-white p-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end}
                  className={linkCls}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{i.icon}</span>
                  {i.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 border-t pt-3">
              <UserBox profile={profile} onSignOut={handleSignOut} />
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">🏠</div>
      <div className="leading-tight">
        <div className="text-sm font-bold text-gray-900">Phòng Trọ & KTX</div>
        <div className="text-[11px] text-gray-500">CTV ĐH Ngân Hàng</div>
      </div>
    </div>
  )
}

function UserBox({
  profile,
  onSignOut,
}: {
  profile: { full_name: string | null; role: string } | null
  onSignOut: () => void
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="truncate text-sm font-medium text-gray-800">
        {profile?.full_name || 'Người dùng'}
      </div>
      <div className="mb-2 text-xs text-gray-500">
        {profile?.role === 'admin' ? 'Quản trị viên' : 'Cộng tác viên'}
      </div>
      <button onClick={onSignOut} className="btn-secondary w-full !py-1.5 text-xs">
        Đăng xuất
      </button>
    </div>
  )
}
