'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error?: string | null;
}

const RESEND_COOLDOWN = 60;

export function OtpModal({ email, onVerify, onResend, onBack, isLoading, error }: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (error) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [error]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) return;
    await onVerify(code);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setDigits(['', '', '', '', '', '']);
    setCountdown(RESEND_COOLDOWN);
    await onResend();
    inputRefs.current[0]?.focus();
  };

  const code = digits.join('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background-card rounded-xl p-8 shadow-2xl w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-bold text-white mb-1">Check your email</h2>
          <p className="text-text-secondary text-sm">
            We sent a 6-digit code to{' '}
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className={`flex gap-2 justify-center mb-5 ${shake ? 'animate-shake' : ''}`}
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-11 h-12 text-center text-xl font-bold rounded-lg border-2 bg-background focus:outline-none focus:border-primary transition-colors ${
                  error
                    ? 'border-red-500 text-red-400'
                    : digit
                    ? 'border-primary text-white'
                    : 'border-gray-600 text-white'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={code.length < 6 || isLoading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {countdown > 0 ? (
            <p className="text-text-secondary">
              Resend code in{' '}
              <span className="tabular-nums">
                0:{countdown.toString().padStart(2, '0')}
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-primary hover:underline"
            >
              Resend code
            </button>
          )}
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-text-secondary text-sm hover:text-white transition-colors"
          >
            Not your account? Go back
          </button>
        </div>
      </div>
    </div>
  );
}
