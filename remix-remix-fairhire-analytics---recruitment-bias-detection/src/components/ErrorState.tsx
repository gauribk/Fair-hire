import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  details?: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to Load Data',
  message = 'An error occurred while communicating with the Python ML backend.',
  details,
  onRetry,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 bg-white rounded-xl border border-rose-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>

        {details && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-left">
            <div className="text-[11px] font-mono text-slate-700 break-words whitespace-pre-wrap">
              {details}
            </div>
          </div>
        )}

        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    </div>
  );
};
