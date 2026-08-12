import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, LockKeyhole, Eye, EyeOff, ArrowRight, ShieldCheck, Shield } from 'lucide-react';

import { AuthLayout } from '../../components/auth/AuthLayout';
import { CountryCodeSelect, COUNTRIES, type CountryCode } from '../../components/auth/CountryCodeSelect';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useRG } from '../../store/RGContext';

interface LoginForm {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const { isExcluded } = useRG();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const reason = searchParams.get('reason');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRIES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>();

  const performLogin = async (identifier: string, password: string, rememberMe?: boolean) => {
    await login(identifier, password, rememberMe);
    addToast({ type: 'success', title: 'Welcome Back!', message: 'Successfully signed in to PlayArena.' });
    navigate(decodeURIComponent(returnTo));
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const fullIdentifier = loginMethod === 'phone' ? `${selectedCountry.dialCode}${data.identifier}` : data.identifier;
      await performLogin(fullIdentifier, data.password, data.rememberMe);
    } catch (err: any) {
      setServerError(err?.message || 'Invalid email/phone or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <AuthLayout
      title="Sign In to PlayArena"
      subtitle="Access your casino wallet, round history, & provably fair games"
      activeMode="login"
    >
      {/* Self-Exclusion block */}
      {isExcluded() && (
        <div className="rounded-2xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/40 p-5 text-center space-y-3 mb-4">
          <div className="text-4xl">🔒</div>
          <h3 className="text-base font-black text-[#FF4D6D]">Account Locked</h3>
          <p className="text-xs text-[rgba(212,175,55,0.6)]">
            You have self-excluded from PlayArena. Login is blocked until your exclusion period ends.
          </p>
          <p className="text-[10px] text-[#FF4D6D]/70 font-bold">
            For help: <a href="mailto:support@playarena.com" className="underline">support@playarena.com</a>
          </p>
        </div>
      )}

      {/* Session expired banner */}
      {reason === 'session_expired' && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 font-bold">You were logged out because your session time limit was reached.</p>
        </div>
      )}

      {/* Session admin revoked banner */}
      {reason === 'session_admin_revoked' && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-3 flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-xs text-rose-300 font-bold">Your session was ended by an administrator.</p>
        </div>
      )}

      {/* Inline Server Error Banner */}
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium mb-3"
          >
            {serverError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-xs">
        {/* Method Toggle Tab */}
        <div className="flex w-full items-center gap-1 bg-[#0B2318] p-1 rounded-xl border border-[rgba(212,175,55,0.2)] relative mb-3">
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            className={`relative z-10 flex-1 w-1/2 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${
              loginMethod === 'email' ? 'text-[#0B2318]' : 'text-[rgba(212,175,55,0.6)] hover:text-[#E8C97A]'
            }`}
          >
            {loginMethod === 'email' && (
              <motion.div
                layoutId="authTogglePill"
                className="absolute inset-0 rounded-lg -z-10"
                style={{ background: 'linear-gradient(180deg, #F5D576 0%, #D4AF37 100%)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            Email Address
          </button>

          <button
            type="button"
            onClick={() => setLoginMethod('phone')}
            className={`relative z-10 flex-1 w-1/2 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-center text-xs ${
              loginMethod === 'phone' ? 'text-[#0B2318]' : 'text-[rgba(212,175,55,0.6)] hover:text-[#E8C97A]'
            }`}
          >
            {loginMethod === 'phone' && (
              <motion.div
                layoutId="authTogglePill"
                className="absolute inset-0 rounded-lg -z-10"
                style={{ background: 'linear-gradient(180deg, #F5D576 0%, #D4AF37 100%)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            Phone Number
          </button>
        </div>

        {/* Input Identifier Field Block */}
        <div className="space-y-1">
          <label className="block text-[rgba(212,175,55,0.8)] font-bold text-[11px]">
            {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
          </label>
          <div className="flex items-center gap-2">
            {loginMethod === 'phone' && (
              <CountryCodeSelect selected={selectedCountry} onChange={setSelectedCountry} />
            )}
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(212,175,55,0.5)]">
                {loginMethod === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
              </div>
              <input
                type={loginMethod === 'email' ? 'email' : 'tel'}
                inputMode={loginMethod === 'email' ? 'email' : 'tel'}
                autoComplete={loginMethod === 'email' ? 'email' : 'tel'}
                placeholder={loginMethod === 'email' ? 'name@example.com' : 'XXXXX XXXXX'}
                className="w-full bg-[#0E2A1E] border border-[rgba(212,175,55,0.25)] rounded-xl pl-9 pr-3 py-2.5 text-[#F5F1E6] text-xs placeholder:text-[rgba(212,175,55,0.3)] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[rgba(212,175,55,0.3)] transition-all"
                {...register('identifier', { required: `${loginMethod === 'email' ? 'Email' : 'Phone number'} is required` })}
              />
            </div>
          </div>
          {errors.identifier && (
            <p className="text-[10px] text-rose-400 mt-0.5">{errors.identifier.message}</p>
          )}
        </div>

        {/* Password Input Field Block */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[rgba(212,175,55,0.8)] font-bold text-[11px]">Password</label>
            <Link to="/auth/forgot-password" className="text-gold font-bold hover:text-[#F5D576] transition-colors text-[11px]">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(212,175,55,0.5)]">
              <LockKeyhole className="w-3.5 h-3.5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full bg-[#0E2A1E] border border-[rgba(212,175,55,0.25)] rounded-xl pl-9 pr-9 py-2.5 text-[#F5F1E6] text-xs placeholder:text-[rgba(212,175,55,0.3)] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[rgba(212,175,55,0.3)] transition-all"
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(212,175,55,0.5)] hover:text-gold cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[10px] text-rose-400 mt-0.5">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me Checkbox Row */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 text-[rgba(212,175,55,0.7)] cursor-pointer select-none">
            <input
              type="checkbox"
              defaultChecked
              className="rounded accent-[#D4AF37] cursor-pointer"
              {...register('rememberMe')}
            />
            <span className="text-[11px]">Remember me on this device</span>
          </label>
        </div>

        {/* Submit Button — clear enabled vs disabled states */}
        <button
          type="submit"
          disabled={isLoading}
          className="group btn-royal-gold w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:transform-none"
        >
          {isLoading ? (
            <span>Signing In...</span>
          ) : (
            <>
              <span>Sign In to Account</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Admin Quick Fill Helper */}
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => {
              setValue('identifier', 'admin@playarena.com');
              setValue('password', 'adminpassword123');
            }}
            className="text-[11px] font-bold text-amber-400/80 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fill Admin Credentials</span>
          </button>
        </div>

        {/* Footer Link & Trust Row */}
        <div className="pt-3 mt-4 border-t border-[rgba(212,175,55,0.15)] space-y-2">
          <p className="text-center text-[rgba(212,175,55,0.65)] text-[11px]">
            Don't have an account yet?{' '}
            <Link to={`/auth/register${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="text-gold font-bold hover:text-[#F5D576] transition-colors">
              Create Account
            </Link>
          </p>


          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-2.5 text-[10px] text-[rgba(212,175,55,0.55)] font-bold flex-wrap">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-gold" /> SHA-256 Audited
            </span>
            <span className="text-[rgba(212,175,55,0.3)]">•</span>
            <span>Licensed & Regulated</span>
            <span className="text-[rgba(212,175,55,0.3)]">•</span>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}


