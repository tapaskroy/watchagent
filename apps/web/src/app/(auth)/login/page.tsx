'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@watchagent/ui';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { OtpModal } from '@/components/auth/OtpModal';
import { authApi } from '@watchagent/api-client';
import { useAuthStore } from '@/store/auth';
import type { LoginRequest } from '@watchagent/shared';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoginLoading, loginError } = useAuth();
  const { setUser } = useAuthStore();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Google auth state
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await login(formData);
    } catch {}
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setGoogleIdToken(idToken);
    setOtpError(null);
    try {
      const result = await authApi.googleInitiate(idToken);
      setOtpEmail(result.email);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send verification code');
    }
  };

  const handleOtpVerify = async (code: string) => {
    if (!googleIdToken) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const result = await authApi.googleVerify(googleIdToken, code, 'login');

      if (result.isNewUser) {
        // Should not happen on login flow, but handle gracefully
        router.push('/');
        return;
      }

      const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
      setUser({
        id: payload.id,
        username: payload.username,
        email: payload.email,
        isActive: true,
        emailVerified: true,
        profileVisibility: 'public',
        showWatchlist: true,
        showRatings: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (result.linkedExistingAccount) {
        // Toast would be shown here — for now just redirect
      }

      router.push('/');
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpResend = async () => {
    if (!googleIdToken) return;
    setOtpError(null);
    try {
      await authApi.googleResend(googleIdToken);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend code');
    }
  };

  const handleOtpBack = () => {
    setGoogleIdToken(null);
    setOtpEmail(null);
    setOtpError(null);
  };

  return (
    <>
      {otpEmail && googleIdToken && (
        <OtpModal
          email={otpEmail}
          onVerify={handleOtpVerify}
          onResend={handleOtpResend}
          onBack={handleOtpBack}
          isLoading={otpLoading}
          error={otpError}
        />
      )}

      <div className="bg-background-card rounded-lg p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-primary mb-2">WatchAgent</h1>
          <p className="text-text-secondary">Sign in to your account</p>
        </div>

        <GoogleLoginButton label="signin_with" onSuccess={handleGoogleSuccess} />

        {otpError && !otpEmail && (
          <p className="mt-2 text-red-400 text-sm text-center">{otpError}</p>
        )}

        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-gray-700" />
          <span className="px-3 text-text-secondary text-sm">or</span>
          <div className="flex-1 border-t border-gray-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            placeholder="••••••••"
          />

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              className="h-4 w-4 rounded border-gray-700 bg-background-card text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">
              Remember me
            </label>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {(loginError as any).message || 'Login failed. Please try again.'}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={isLoginLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </>
  );
}
