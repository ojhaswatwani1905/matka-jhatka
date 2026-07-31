import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, RotateCw } from 'lucide-react';

interface OtpVerificationStepProps {
  destination: string; // email or phone
  onVerified: (otp: string) => void;
  onBack: () => void;
  onResend?: () => void;
}

export const OtpVerificationStep: React.FC<OtpVerificationStepProps> = ({
  destination,
  onVerified,
  onBack,
  onResend,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [timer, setTimer] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if complete
    if (newDigits.every((d) => d !== '') && value) {
      triggerSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      triggerSubmit(pasted);
    }
  };

  const triggerSubmit = (code: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onVerified(code);
    }, 600);
  };

  const handleResendClick = () => {
    if (timer > 0) return;
    setTimer(30);
    setDigits(Array(6).fill(''));
    inputRefs.current[0]?.focus();
    onResend?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-6 text-center"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-400">Step 2 of 2</span>
      </div>

      <div>
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white font-heading">Verify 6-Digit Code</h2>
        <p className="text-xs text-slate-400 mt-1">
          We sent a verification code to <span className="text-gold font-mono font-bold">{destination}</span>
        </p>
      </div>

      {/* 6 Digit Inputs */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={`w-10 h-12 text-center font-black text-xl text-white font-mono bg-slate-900 border rounded-xl outline-none transition-all ${
              digit ? 'border-gold shadow-[0_0_12px_rgba(245,185,44,0.3)] bg-slate-950' : 'border-slate-800 focus:border-gold/60'
            }`}
            autoFocus={idx === 0}
          />
        ))}
      </div>

      {/* Demo OTP Banner & Auto-Fill CTA */}
      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5 my-2">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
          Demo OTP Code: <span className="font-mono text-gold font-black underline tracking-wider">123456</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Enter <span className="text-white font-bold">123456</span> (or any 6 digits) to complete registration.
        </p>
        <button
          type="button"
          onClick={() => {
            setDigits(['1', '2', '3', '4', '5', '6']);
            triggerSubmit('123456');
          }}
          className="w-full py-1.5 rounded-lg font-bold text-xs text-black bg-gold hover:bg-amber-400 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          Auto-Fill Code (123456)
        </button>
      </div>

      <div className="pt-1">
        <button
          type="button"
          disabled={timer > 0}
          onClick={handleResendClick}
          className="text-xs text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${timer > 0 ? 'animate-spin' : ''}`} />
          {timer > 0 ? `Resend code in 0:${timer < 10 ? `0${timer}` : timer}` : 'Resend Verification Code'}
        </button>
      </div>

      <button
        type="button"
        disabled={digits.some((d) => d === '') || isSubmitting}
        onClick={() => triggerSubmit(digits.join(''))}
        className="w-full py-3.5 rounded-xl font-bold text-black btn-gold-shimmer disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wider shadow-lg"
      >
        {isSubmitting ? 'Verifying Code...' : 'Complete Registration'}
      </button>
    </motion.div>
  );
};
