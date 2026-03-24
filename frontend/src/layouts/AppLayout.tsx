import { Navigate, Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from '../routes/paths'

export function AppLayout(): JSX.Element {
  const { isAuthed, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0e1a] text-white">Loading...</div>
  }

  if (!isAuthed) {
    return <Navigate to={PATHS.auth} replace />
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[393px] flex-col overflow-x-hidden bg-[#0a0e1a] text-white">
      <Outlet />
      <BottomNav />
    </div>
  )
}
