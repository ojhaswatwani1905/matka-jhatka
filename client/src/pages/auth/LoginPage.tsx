import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { CountryCodeSelect, COUNTRIES, type CountryCode } from '../../components/auth/CountryCodeSelect';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';

interface LoginForm {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRIES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const fullIdentifier = loginMethod === 'phone' ? `${selectedCountry.dialCode}${data.identifier}` : data.identifier;
      await login(fullIdentifier, data.password);
      addToast({ type: 'success', title: 'Welcome Back!', message: 'Successfully signed in to PlayArena.' });
      navigate('/');
    } catch {
      setServerError('Invalid email/phone or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    setServerError(null);
    try {
      await login('demoplayer@playarena.com', 'password123');
      addToast({ type: 'success', title: 'Demo Logged In', message: 'Logged in as Demo Player with $10,000 balance.' });
      navigate('/');
    } catch {
      setServerError('Demo login failed.');
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
      {/* Instant Demo Access Box */}
      <div className="p-3 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.3)] text-center space-y-1.5 mb-3">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gold">
          <Sparkles className="w-3.5 h-3.5 text-gold" /> Instant Demo Access
        </div>
        <p className="text-[11px] text-[rgba(212,175,55,0.65)]">
          Test games immediately with <span className="text-gold font-bold">₹10,000</span> demo funds.
        </p>
        <button
          type="button"
          onClick={handleQuickDemoLogin}
          disabled={isLoading}
          className="btn-royal-gold w-full py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:transform-none"
        >
          <UserCheck className="w-3.5 h-3.5" /> Log In as Demo Player
        </button>
      </div>

      {/* Divider */}
      <div className="my-3 flex items-center gap-3">
        <div className="flex-1 h-px bg-[rgba(212,175,55,0.15)]" />
        <span className="text-[9px] font-bold uppercase text-[rgba(212,175,55,0.45)] tracking-wider">or continue with credentials</span>
        <div className="flex-1 h-px bg-[rgba(212,175,55,0.15)]" />
      </div>

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
              <Lock className="w-3.5 h-3.5" />
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

        {/* Social Logins */}
        <div className="pt-1 mt-3">
          <p className="text-[9px] text-center text-[rgba(212,175,55,0.45)] uppercase tracking-wider mb-2 font-bold">Or Sign In With</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => addToast({ type: 'info', title: 'Google Sign In', message: 'Google authentication demo.' })}
              className="py-2 px-3 rounded-xl bg-[#0E2A1E] border border-[rgba(212,175,55,0.2)] text-[#E8C97A] hover:border-[rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.6 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => addToast({ type: 'info', title: 'Apple Sign In', message: 'Apple authentication demo.' })}
              className="py-2 px-3 rounded-xl bg-[#0E2A1E] border border-[rgba(212,175,55,0.2)] text-[#E8C97A] hover:border-[rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.35c.67-.82 1.13-1.97.99-3.12-.98.04-2.18.66-2.88 1.48-.63.73-1.18 1.9-1.03 3.03 1.1.09 2.24-.56 2.92-1.39z" />
              </svg>
              <span>Apple ID</span>
            </button>
          </div>
        </div>

        {/* Footer Link & Trust Row */}
        <div className="pt-3 mt-4 border-t border-[rgba(212,175,55,0.15)] space-y-2">
          <p className="text-center text-[rgba(212,175,55,0.65)] text-[11px]">
            Don't have an account yet?{' '}
            <Link to="/auth/register" className="text-gold font-bold hover:text-[#F5D576] transition-colors">
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
            <span>SSL Encrypted</span>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
