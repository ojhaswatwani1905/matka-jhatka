import { Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { WalletProvider } from './store/WalletContext';
import { KYCProvider } from './store/KYCContext';
import { NotificationProvider } from './store/NotificationContext';
import { AchievementProvider } from './store/AchievementContext';
import { RGProvider } from './store/RGContext';
import { LiveFeedProvider } from './store/LiveFeedContext';
import { PromoProvider } from './store/PromoContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/home/HomePage';
import GamesPage from './pages/games/GamesPage';
import ColorPredictionPage from './pages/games/ColorPredictionPage';
import MatkaPage from './pages/games/MatkaPage';
import WinGoPage from './pages/games/WinGoPage';
import LotteryPage from './pages/games/LotteryPage';
import AviatorPage from './pages/games/AviatorPage';
import MinesPage from './pages/games/MinesPage';
import PlinkoPage from './pages/games/PlinkoPage';
import TeenPattiPage from './pages/games/TeenPattiPage';
import WalletPage from './pages/wallet/WalletPage';
import HistoryPage from './pages/history/HistoryPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import SupportPage from './pages/support/SupportPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import LeaderboardPage from './pages/leaderboard/LeaderboardPage';
import { LiveFeedPage } from './components/ui/GlobalLiveFeed';
import ResponsibleGamingPage from './pages/responsible-gaming/ResponsibleGamingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminKYCPage from './pages/admin/AdminKYCPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminGamesPage from './pages/admin/AdminGamesPage';
import AdminPromosPage from './pages/admin/AdminPromosPage';
import AdminBroadcastsPage from './pages/admin/AdminBroadcastsPage';
import AdminFraudPage from './pages/admin/AdminFraudPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import VIPPage from './pages/vip/VIPPage';
import ReferralPage from './pages/referral/ReferralPage';
import KYCPage from './pages/kyc/KYCPage';

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
        <div className="w-6 h-6 rounded-full bg-amber-400/10 blur-sm" />
      </div>
      <p className="text-xs font-black text-amber-400 tracking-widest uppercase animate-pulse">Loading Arena...</p>
    </div>
  );
}

/**
 * Inner component that has access to both useAuth and useNavigate
 * Needed so RGProvider's onSessionExpired can call logout + navigate
 */
function AppWithRG({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSessionExpired = useCallback(() => {
    logout();
    navigate('/auth/login?reason=session_expired');
  }, [logout, navigate]);

  return (
    <RGProvider onSessionExpired={handleSessionExpired}>
      {children}
    </RGProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <WalletProvider>
            <LiveFeedProvider>
              <NotificationProvider>
                <AchievementProvider>
                  <PromoProvider>
                    <KYCProvider>
                      <ToastProvider>
                        <AppWithRG>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* Auth routes (no layout) */}
                          <Route path="/auth/login" element={<LoginPage />} />
                          <Route path="/auth/register" element={<RegisterPage />} />
                          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/register" element={<RegisterPage />} />
                          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                          {/* Admin routes */}
                          <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsersPage />} />
                            <Route path="kyc" element={<AdminKYCPage />} />
                            <Route path="transactions" element={<AdminTransactionsPage />} />
                            <Route path="promos" element={<AdminPromosPage />} />
                            <Route path="broadcasts" element={<AdminBroadcastsPage />} />
                            <Route path="fraud" element={<AdminFraudPage />} />
                            <Route path="analytics" element={<AdminAnalyticsPage />} />
                            <Route path="games" element={<AdminGamesPage />} />
                          </Route>

                          {/* Main app routes with layout */}
                          <Route element={<AppLayout />}>
                            {/* Public */}
                            <Route path="/" element={<HomePage />} />
                            <Route path="/games" element={<GamesPage />} />
                            <Route path="/support" element={<SupportPage />} />
                            <Route path="/live" element={<LiveFeedPage />} />
                            <Route path="/leaderboard" element={<LeaderboardPage />} />
                            <Route path="/responsible-gaming" element={<ResponsibleGamingPage />} />

                            {/* Game pages — guest-browsable, bet actions gated */}
                            <Route path="/games/color-prediction" element={<ColorPredictionPage />} />
                            <Route path="/games/matka" element={<MatkaPage />} />
                            <Route path="/games/wingo" element={<WinGoPage />} />
                            <Route path="/games/lottery" element={<LotteryPage />} />
                            <Route path="/games/aviator" element={<AviatorPage />} />
                            <Route path="/games/mines" element={<MinesPage />} />
                            <Route path="/games/plinko" element={<PlinkoPage />} />
                            <Route path="/games/teen-patti" element={<TeenPattiPage />} />

                            {/* Protected routes */}
                            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                            <Route path="/kyc" element={<ProtectedRoute><KYCPage /></ProtectedRoute>} />
                            <Route path="/vip" element={<ProtectedRoute><VIPPage /></ProtectedRoute>} />
                            <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                          </Route>

                          {/* Catch-all */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Suspense>
                    </AppWithRG>
                  </ToastProvider>
                </KYCProvider>
              </PromoProvider>
            </AchievementProvider>
          </NotificationProvider>
            </LiveFeedProvider>
          </WalletProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
