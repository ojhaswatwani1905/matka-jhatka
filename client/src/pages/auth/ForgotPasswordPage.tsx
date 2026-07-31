import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { OtpVerificationStep } from '../../components/auth/OtpVerificationStep';
import { useToast } from '../../components/ui/Toast';

interface ForgotForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'otp' | 'reset' | 'success'>('request');
  const [targetEmail, setTargetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>();

  const onRequestSubmit = (data: ForgotForm) => {
    setTargetEmail(data.email);
    addToast({ type: 'info', title: 'Code Sent', message: `Verification OTP code sent to ${data.email}` });
    setStep('otp');
  };

  const handleOtpVerified = () => {
    setStep('reset');
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast({ type: 'warning', title: 'Password Too Short', message: 'Password must be at least 6 characters.' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('success');
      addToast({ type: 'success', title: 'Password Reset', message: 'Your password has been successfully updated.' });
    }, 600);
  };

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Follow the step-by-step verification to recover account access"
      activeMode="forgot"
    >
      <AnimatePresence mode="wait">
        {step === 'request' && (
          <motion.form
            key="step-request"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit(onRequestSubmit)}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Account Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Enter your registered email"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-3 text-white text-xs placeholder:text-slate-500 outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  {...register('email', { required: 'Email address is required' })}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-400 mt-1">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-bold text-black btn-gold-shimmer cursor-pointer shadow-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Send 6-Digit OTP</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <Link to="/auth/login" className="text-slate-400 hover:text-white text-xs">
                ← Back to Sign In
              </Link>
            </div>
          </motion.form>
        )}

        {step === 'otp' && (
          <OtpVerificationStep
            key="step-otp"
            destination={targetEmail}
            onVerified={handleOtpVerified}
            onBack={() => setStep('request')}
            onResend={() => addToast({ type: 'info', title: 'OTP Resent', message: 'Sent new 6-digit code.' })}
          />
        )}

        {step === 'reset' && (
          <motion.form
            key="step-reset"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handlePasswordReset}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Create New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-10 py-3 text-white text-xs placeholder:text-slate-500 outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold text-black btn-gold-shimmer cursor-pointer shadow-lg text-xs uppercase tracking-wider"
            >
              {isLoading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </motion.form>
        )}

        {step === 'success' && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 py-2"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white font-heading">Password Reset Complete</h2>
            <p className="text-xs text-slate-400">
              Your password has been updated. You can now sign in with your new credentials.
            </p>
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="w-full py-3.5 rounded-xl font-bold text-black btn-gold-shimmer cursor-pointer shadow-lg text-xs uppercase tracking-wider"
            >
              Sign In Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
