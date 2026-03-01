import { APP_VERSION } from '@/lib/version';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark px-4">
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-xs text-gray-600">Copyright Tapas Roy, version {APP_VERSION}</p>
    </div>
  );
}
