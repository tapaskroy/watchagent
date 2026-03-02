'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button, Container } from '@watchagent/ui';
import { APP_VERSION } from '@/lib/version';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background-dark">
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-sm border-b border-gray-800">
        <Container>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="text-2xl font-display font-bold text-primary"
              >
                WatchAgent
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/"
                  className={`transition-colors ${pathname === '/' ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Home
                </Link>
                <Link
                  href="/chat"
                  className={`transition-colors ${pathname === '/chat' ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Chat
                </Link>
                <Link
                  href="/browse"
                  className={`transition-colors ${pathname === '/browse' ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Browse
                </Link>
                <Link
                  href="/watchlist"
                  className={`transition-colors ${pathname.startsWith('/watchlist') ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  My Watchlist
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <>
                  <Link href="/profile">
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="hidden md:block text-text-primary">
                        {user.username}
                      </span>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                  >
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </Container>
      </header>

      <main>{children}</main>

      <footer className="mt-16 py-8 border-t border-gray-800">
        <Container>
          <div className="text-center text-text-secondary text-sm">
            <p>&copy; 2026 WatchAgent. Your personalized entertainment companion.</p>
            <p className="text-xs text-gray-600 mt-1">version {APP_VERSION}</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
