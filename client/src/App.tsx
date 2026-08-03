import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { WalletProvider } from './store/WalletContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';

import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Eagerly import main app pages for instant navigation without loading delays
import HomePage from './pages/home/HomePage';
import GamesPage from './pages/games/GamesPage';
import ColorPredictionPage from './pages/games/ColorPredictionPage';
import MatkaPage from './pages/games/MatkaPage';
import WinGoPage from './pages/games/WinGoPage';
import LotteryPage from './pages/games/LotteryPage';
import WalletPage from './pages/wallet/WalletPage';
import HistoryPage from './pages/history/HistoryPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import SupportPage from './pages/support/SupportPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import VIPPage from './pages/vip/VIPPage';
import ReferralPage from './pages/referral/ReferralPage';

// Premium glowing loading fallback
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

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <WalletProvider>
            <ToastProvider>
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
                  </Route>

                  {/* Main app routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/games" element={<GamesPage />} />
                    <Route path="/support" element={<SupportPage />} />

                    {/* Protected Game & Account Routes */}
                    <Route path="/games/color-prediction" element={<ProtectedRoute><ColorPredictionPage /></ProtectedRoute>} />
                    <Route path="/games/matka" element={<ProtectedRoute><MatkaPage /></ProtectedRoute>} />
                    <Route path="/games/wingo" element={<ProtectedRoute><WinGoPage /></ProtectedRoute>} />
                    <Route path="/games/lottery" element={<ProtectedRoute><LotteryPage /></ProtectedRoute>} />
                    <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/vip" element={<ProtectedRoute><VIPPage /></ProtectedRoute>} />
                    <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                  </Route>

                  {/* Catch-all redirect to Home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ToastProvider>
          </WalletProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
