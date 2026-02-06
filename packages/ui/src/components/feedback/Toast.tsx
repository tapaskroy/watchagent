import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-gray-700',
  }[type];

  return (
    <div
      className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-full shadow-lg z-50 animate-slide-up`}
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};
