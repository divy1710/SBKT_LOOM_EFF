import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600/95 text-amber-50 px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-lg backdrop-blur sticky top-0 z-50 border-b border-amber-400/30 animate-fade-in"
    >
      <WifiOff size={16} className="shrink-0 animate-pulse" />
      <span>
        <strong>Connection Lost:</strong> You are currently offline. Real-time factory updates and server synchronization are paused.
      </span>
    </div>
  );
};
