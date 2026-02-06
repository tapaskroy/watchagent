'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@watchagent/ui';
import type { LoginRequest } from '@watchagent/shared';

export default function LoginPage() {
  const { login, isLoginLoading, loginError } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    try {
      console.log('Calling login...');
      await login(formData);
      console.log('Login call completed');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="bg-background-card rounded-lg p-8 shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold text-primary mb-2">
          WatchAgent
        </h1>
        <p className="text-text-secondary">Sign in to your account</p>
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
            onChange={(e) =>
              setFormData({ ...formData, rememberMe: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-700 bg-background-card text-primary focus:ring-2 focus:ring-primary"
          />
          <label
            htmlFor="remember-me"
            className="ml-2 block text-sm text-text-secondary"
          >
            Remember me
          </label>
        </div>

        {loginError && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            {(loginError as any).message || 'Login failed. Please try again.'}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isLoginLoading}
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        Don't have an account?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
