import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { LoadingPage } from './components/ui/Spinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PhongTro from './pages/PhongTro'
import KtxPage from './pages/Ktx'
import Leads from './pages/Leads'
import QuanLy from './pages/QuanLy'

function Protected({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <LoadingPage />
  if (!session) return <Navigate to="/dang-nhap" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const { session, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/dang-nhap"
        element={loading ? <LoadingPage /> : session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/phong-tro" element={<Protected><PhongTro /></Protected>} />
      <Route path="/ktx" element={<Protected><KtxPage /></Protected>} />
      <Route path="/leads" element={<Protected><Leads /></Protected>} />
      <Route path="/quan-ly" element={<Protected adminOnly><QuanLy /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
