import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, LockKeyhole, User, Eye, EyeOff, ArrowRight, Gift, Tag, Check, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { CountryCodeSelect, COUNTRIES, type CountryCode } from '../../components/auth/CountryCodeSelect';
import { OtpVerificationStep } from '../../components/auth/OtpVerificationStep';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';

interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRIES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [agreed18Plus, setAgreed18Plus] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<RegisterForm | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm<RegisterForm>({
    mode: 'onBlur',
  });

  const passwordValue = watch('password', '');

  // Password strength logic
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(passwordValue);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const strengthColors = ['bg-rose-500', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

  const onFormSubmit = async (data: RegisterForm) => {
    if (!agreed18Plus) {
      addToast({ type: 'warning', title: 'Age Confirmation Required', message: 'You must confirm you are 18+ to register.' });
      return;
    }
    setFormData(data);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, name: data.name }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ type: 'info', title: 'OTP Sent!', message: `Verification code sent to ${data.email}` });
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
      setStep('otp');
    }
  };

  const handleOtpVerified = async (enteredOtp: string) => {
    if (!formData) return;
    setIsLoading(true);
    try {
      // Verify dynamic OTP against server
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: enteredOtp }),
      });
      const verifyJson = await verifyRes.json();

      if (!verifyRes.ok || !verifyJson.success) {
        addToast({ type: 'error', title: 'Invalid OTP', message: verifyJson.message || 'Incorrect verification code. Please check your email.' });
        setIsLoading(false);
        return;
      }

      await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: `${selectedCountry.dialCode}${formData.phone}`,
      });
      addToast({
        type: 'success',
        title: 'Account Created!',
        message: `Welcome to PlayArena, ${formData.name}! Your account has been registered successfully.`,
      });
      navigate(decodeURIComponent(returnTo));
    } catch {
      addToast({ type: 'error', title: 'Registration Failed', message: 'An account with this email already exists.' });
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <AuthLayout
      title={step === 'form' ? 'Create Player Account' : 'Verify Registration'}
      subtitle={step === 'form' ? 'Register now to access casino wallet, live draws & games' : 'Complete 6-digit verification code step'}
      activeMode="register"
    >

      <AnimatePresence mode="wait">
        {step === 'otp' && formData ? (
          <OtpVerificationStep
            key="otp-step"
            destination={formData.email || `${selectedCountry.dialCode}${formData.phone}`}
            onVerified={handleOtpVerified}
            onBack={() => setStep('form')}
            onResend={() => addToast({ type: 'info', title: 'Code Resent', message: 'New 6-digit OTP code sent.' })}
          />
        ) : (
          <motion.div key="form-step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-xs">
            {/* Welcome Bonus Chip */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-400 block">$10,000 Welcome Demo Bonus</span>
                <span className="text-[10px] text-slate-400">Credited instantly upon account registration</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs placeholder:text-slate-500 outline-none focus:border-gold focus:shadow-[0_0_15px_rgba(245,185,44,0.25)] transition-all"
                    {...register('name', { required: 'Full name is required' })}
                  />
                </div>
                {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name.message}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs placeholder:text-slate-500 outline-none focus:border-gold focus:shadow-[0_0_15px_rgba(245,185,44,0.25)] transition-all"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' },
                    })}
                  />
                </div>
                {errors.email && <p className="text-[11px] text-rose-400 mt-1">{errors.email.message}</p>}
              </div>

              {/* Phone Number with Country Code */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Phone Number</label>
                <div className="flex items-center gap-2">
                  <CountryCodeSelect selected={selectedCountry} onChange={setSelectedCountry} />
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="XXXXX XXXXX"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs placeholder:text-slate-500 outline-none focus:border-gold focus:shadow-[0_0_15px_rgba(245,185,44,0.25)] transition-all"
                      {...register('phone', { required: 'Phone number is required' })}
                    />
                  </div>
                </div>
                {errors.phone && <p className="text-[11px] text-rose-400 mt-1">{errors.phone.message}</p>}
              </div>

              {/* Password & Strength Meter */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Password</label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white text-xs placeholder:text-slate-500 outline-none focus:border-gold focus:shadow-[0_0_15px_rgba(245,185,44,0.25)] transition-all"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Minimum 6 characters required' },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordValue && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i < strength ? strengthColors[Math.min(strength - 1, 4)] : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Strength: <span className="font-bold text-slate-200">{strengthLabels[Math.min(strength, 4)]}</span>
                    </p>
                  </div>
                )}
                {errors.password && <p className="text-[11px] text-rose-400 mt-1">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Confirm Password</label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white text-xs placeholder:text-slate-500 outline-none focus:border-gold focus:shadow-[0_0_15px_rgba(245,185,44,0.25)] transition-all"
                    {...register('confirmPassword', {
                      validate: (val) => val === passwordValue || 'Passwords do not match',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[11px] text-rose-400 mt-1">{errors.confirmPassword.message}</p>}
              </div>

              {/* Referral Code Collapsible Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowReferral(!showReferral)}
                  className="text-gold font-bold flex items-center gap-1.5 hover:underline cursor-pointer text-[11px]"
                >
                  <Tag className="w-3.5 h-3.5 text-gold" />
                  <span>{showReferral ? 'Hide Referral Code' : 'Have a referral code?'}</span>
                </button>
                {showReferral && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                    <input
                      type="text"
                      placeholder="Enter referral code (e.g. WIN900)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs uppercase placeholder:normal-case outline-none focus:border-gold focus:shadow-[0_0_15px_rgba(245,185,44,0.25)] transition-all"
                      {...register('referralCode')}
                    />
                  </motion.div>
                )}
              </div>

              {/* Required 18+ Age & Jurisdiction Gate */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
                <button
                  type="button"
                  onClick={() => setAgreed18Plus(!agreed18Plus)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                    agreed18Plus ? 'bg-gold border-gold text-black shadow-[0_0_8px_rgba(245,185,44,0.4)]' : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {agreed18Plus && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <span className="text-[11px] text-slate-300 leading-snug">
                  I confirm I am <span className="text-gold font-bold">18+</span> (or legal gambling age in my jurisdiction) & agree to the{' '}
                  <span className="text-gold font-bold">Terms of Service</span> & Responsible Gaming Policy.
                </span>
              </label>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={!agreed18Plus || !isValid || isLoading}
                className="group w-full py-3.5 rounded-xl font-bold text-black btn-gold-shimmer cursor-pointer shadow-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Continue to 6-Digit OTP</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Footer Link to Login */}
            <div className="pt-3 border-t border-white/10 text-center space-y-2">
              <p className="text-slate-400">
                Already have an account?{' '}
                <Link to={`/auth/login${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="text-gold font-bold hover:underline">
                  Sign In Here
                </Link>
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> 100% Encrypted & Safe Demo Environment
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
