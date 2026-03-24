import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthStateProvider } from './providers/AuthStateProvider'
import { ToastViewport } from './components/ToastViewport'
import { AppLayout } from './layouts/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { BetsPage } from './pages/BetsPage'
import { HomePage } from './pages/HomePage'
import { LivePage } from './pages/LivePage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfileSupportPage } from './pages/ProfileSupportPage'
import { MatchWatchPage } from './pages/MatchWatchPage'
import { RankingPage } from './pages/RankingPage'
import { WalletPage } from './pages/WalletPage'
import { PATHS } from './routes/paths'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthStateProvider>
        <Routes>
          <Route path={PATHS.auth} element={<AuthPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="bets" element={<BetsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/support" element={<ProfileSupportPage />} />
            <Route path="watch/:matchId" element={<MatchWatchPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="*" element={<Navigate to={PATHS.home} replace />} />
          </Route>
        </Routes>
        <ToastViewport />
      </AuthStateProvider>
    </BrowserRouter>
  )
}

export default App
