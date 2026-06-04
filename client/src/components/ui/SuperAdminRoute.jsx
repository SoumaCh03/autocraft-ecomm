import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SuperAdminRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>
  return user?.role === 'super_admin' ? <Outlet /> : <Navigate to="/" replace />
}
