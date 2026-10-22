import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

interface PwaUpdateNotificationProps {
  needRefresh: boolean;
  onUpdate: () => void;
}

export const PwaUpdateNotification: React.FC<PwaUpdateNotificationProps> = ({
  needRefresh,
  onUpdate,
}) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in">
      <div className="glass-card bg-slate-900/95 border border-blue-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3 text-slate-100">
        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">Application Update</h4>
          <p className="text-xs text-slate-300 mt-0.5">
            A new version of SBKT Textile is available with the latest improvements.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              Update Now
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-md"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
