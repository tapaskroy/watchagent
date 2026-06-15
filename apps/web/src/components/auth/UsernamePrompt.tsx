'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@watchagent/api-client';

interface Props {
  defaultUsername: string;
  onConfirm: (username: string) => Promise<void>;
  isLoading: boolean;
}

export function UsernamePrompt({ defaultUsername, onConfirm, isLoading }: Props) {
  const [username, setUsername] = useState(defaultUsername);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [validationError, setValidationError] = useState('');

  const USERNAME_RE = /^[a-zA-Z0-9_]{3,50}$/;

  useEffect(() => {
    if (!username || !USERNAME_RE.test(username)) {
      setAvailable(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    setAvailable(null);

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
        setAvailable((res.data as any)?.data?.available ?? false);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleChange = (val: string) => {
    setUsername(val);
    if (val && !USERNAME_RE.test(val)) {
      setValidationError('3–50 characters, letters, numbers, and underscores only');
    } else {
      setValidationError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USERNAME_RE.test(username) || !available) return;
    await onConfirm(username);
  };

  const canSubmit = USERNAME_RE.test(username) && available === true && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background-card rounded-xl p-8 shadow-2xl w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-bold text-white mb-1">
            Choose your username
          </h2>
          <p className="text-text-secondary text-sm">
            You can change this later in settings.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-1">
            <input
              type="text"
              value={username}
              onChange={(e) => handleChange(e.target.value)}
              maxLength={50}
              autoFocus
              className="w-full px-3 py-2.5 bg-background border-2 border-gray-600 focus:border-primary rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors"
              placeholder="username"
            />
          </div>

          <div className="h-5 mb-4">
            {validationError && (
              <p className="text-red-400 text-xs">{validationError}</p>
            )}
            {!validationError && checking && (
              <p className="text-text-secondary text-xs">Checking availability…</p>
            )}
            {!validationError && !checking && available === true && (
              <p className="text-green-400 text-xs">✓ {username} is available</p>
            )}
            {!validationError && !checking && available === false && (
              <p className="text-red-400 text-xs">Username already taken</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}
