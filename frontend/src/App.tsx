import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { AppLayout } from './layouts/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { BetsPage } from './pages/BetsPage'
import { HomePage } from './pages/HomePage'
import { LivePage } from './pages/LivePage'
import { ProfilePage } from './pages/ProfilePage'
import { WalletPage } from './pages/WalletPage'
import { PATHS } from './routes/paths'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path={PATHS.auth} element={<AuthPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="bets" element={<BetsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to={PATHS.home} replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
