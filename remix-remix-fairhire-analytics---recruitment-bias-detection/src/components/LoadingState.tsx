import React from 'react';
import { Cpu, RefreshCw, Database, ShieldCheck } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  onRetry?: () => void;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, onRetry }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">
            Initializing Machine Learning Models
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {message || 'Fitting scikit-learn pipelines on 10,000 applicant records and computing held-out fairness metrics.'}
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-left space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Pipeline Steps</span>
          </div>
          <div className="space-y-1 pl-6 text-slate-500">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Stratified 80/20 split (8,000 train / 2,000 test)</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Fitting Logistic Regression, Decision Tree, Random Forest</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Standard (Fair) vs Audit (Demographic) feature setups</span>
            </div>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status Again</span>
          </button>
        )}
      </div>
    </div>
  );
};
