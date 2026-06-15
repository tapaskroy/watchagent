'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@watchagent/ui';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { OtpModal } from '@/components/auth/OtpModal';
import { UsernamePrompt } from '@/components/auth/UsernamePrompt';
import { authApi, apiClient } from '@watchagent/api-client';
import { useAuthStore } from '@/store/auth';
import type { RegisterRequest } from '@watchagent/shared';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isRegisterLoading, registerError } = useAuth();
  const { setUser } = useAuthStore();
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
    fullName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Google auth state
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Post-verify state
  const [pendingTokens, setPendingTokens] = useState<{ accessToken: string } | null>(null);
  const [defaultUsername, setDefaultUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.username) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = 'Username can only contain letters, numbers, and underscores';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Password must contain at least one uppercase letter';
    else if (!/[a-z]/.test(formData.password)) newErrors.password = 'Password must contain at least one lowercase letter';
    else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Password must contain at least one number';
    if (formData.password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try { await register(formData); } catch {}
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
      const result = await authApi.googleVerify(googleIdToken, code, 'register');

      if (!result.isNewUser) {
        // Account already exists — just log them in
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
        router.push('/');
        return;
      }

      // New user — show username prompt
      const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
      setDefaultUsername(payload.username ?? otpEmail?.split('@')[0] ?? '');
      setPendingTokens({ accessToken: result.accessToken });
      setOtpEmail(null); // close OTP modal
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleUsernameConfirm = async (username: string) => {
    if (!pendingTokens) return;
    setUsernameLoading(true);
    try {
      await apiClient.patch('/users/me', { username });
      const payload = JSON.parse(atob(pendingTokens.accessToken.split('.')[1]));
      setUser({
        id: payload.id,
        username,
        email: payload.email,
        isActive: true,
        emailVerified: true,
        profileVisibility: 'public',
        showWatchlist: true,
        showRatings: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      router.push('/');
    } catch {
      setUsernameLoading(false);
    }
  };

  const handleOtpResend = async () => {
    if (!googleIdToken) return;
    setOtpError(null);
    try { await authApi.googleResend(googleIdToken); }
    catch (err: any) { setOtpError(err.message || 'Failed to resend code'); }
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

      {pendingTokens && (
        <UsernamePrompt
          defaultUsername={defaultUsername}
          onConfirm={handleUsernameConfirm}
          isLoading={usernameLoading}
        />
      )}

      <div className="bg-background-card rounded-lg p-8 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-primary mb-2">WatchAgent</h1>
          <p className="text-text-secondary">Create your account</p>
        </div>

        <GoogleLoginButton label="signup_with" onSuccess={handleGoogleSuccess} />

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
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            error={errors.username}
            placeholder="johndoe"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="you@example.com"
          />
          <Input
            label="Full Name (Optional)"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="John Doe"
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            placeholder="••••••••"
            helperText="Must be 8+ chars with uppercase, lowercase, and number"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            placeholder="••••••••"
          />

          {registerError && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {(registerError as any).message || 'Registration failed. Please try again.'}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={isRegisterLoading}>
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}
