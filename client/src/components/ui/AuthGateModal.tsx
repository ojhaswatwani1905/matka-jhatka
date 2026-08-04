import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LockKeyhole, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useToast } from './Toast';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthGateModal({ isOpen, onClose, onSuccess }: AuthGateModalProps) {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await login(email, password);
      addToast({ type: 'success', title: 'Welcome back!', message: 'You are now logged in.' });
      onSuccess();
    } catch {
      addToast({ type: 'error', title: 'Login failed', message: 'Invalid credentials.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setIsLoading(true);
    try {
      await login(email, password);
      addToast({ type: 'success', title: 'Account created!', message: 'Welcome to PlayArena.' });
      onSuccess();
    } catch {
      addToast({ type: 'error', title: 'Registration failed', message: 'Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[201] max-w-md mx-auto"
          >
            <div className="bg-[#061A10] border border-[rgba(212,175,55,0.35)] border-b-0 rounded-t-3xl p-6 shadow-2xl">
              {/* Handle */}
              <div className="w-10 h-1 bg-[rgba(212,175,55,0.3)] rounded-full mx-auto mb-5" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center">
                    <LockKeyhole className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#E8C97A] font-heading">Login Required</h2>
                    <p className="text-[11px] text-[rgba(212,175,55,0.5)]">Sign in to place bets & manage funds</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[rgba(212,175,55,0.08)] flex items-center justify-center text-[rgba(212,175,55,0.5)] hover:text-gold transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-[#0d2419] rounded-xl p-1 mb-5 border border-[rgba(212,175,55,0.12)]">
                {(['login', 'register'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer capitalize ${
                      tab === t
                        ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.4)]'
                        : 'text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A]'
                    }`}
                  >
                    {t === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>

              <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-3">
                {tab === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[rgba(212,175,55,0.7)] mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.6)] transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[rgba(212,175,55,0.7)] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.6)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[rgba(212,175,55,0.7)] mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.6)] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-royal-gold w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-[#0B2318]/40 border-t-[#0B2318] rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      {tab === 'login' ? 'Sign In & Continue' : 'Create Account & Play'}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  to="/auth/login"
                  onClick={onClose}
                  className="flex items-center gap-1.5 text-[11px] text-[rgba(212,175,55,0.5)] hover:text-gold transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Full registration page →
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
