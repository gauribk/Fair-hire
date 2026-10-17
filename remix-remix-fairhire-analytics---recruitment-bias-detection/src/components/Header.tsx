import React from 'react';
import { NavigationTab } from '../types';
import { Download } from 'lucide-react';

interface HeaderProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenReports: () => void;
  isBackendReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenReports,
  isBackendReady,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onTabChange('overview')}
          className="text-left group cursor-pointer"
        >
          <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors whitespace-nowrap">
            FairHire Analytics
          </span>
        </button>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => onTabChange('overview')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'overview' ? 'text-blue-900 font-semibold' : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onTabChange('dataset')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'dataset' ? 'text-blue-900 font-semibold' : ''
          }`}
        >
          Dataset
        </button>
        <button
          onClick={() => onTabChange('models')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'models' ? 'text-blue-900 font-semibold' : ''
          }`}
        >
          Models
        </button>
        <button
          onClick={() => onTabChange('fairness')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'fairness' ? 'text-blue-900 font-semibold' : ''
          }`}
        >
          Fairness
        </button>
        <button
          onClick={() => onTabChange('mitigation')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'mitigation' ? 'text-blue-900 font-semibold' : ''
          }`}
        >
          Mitigation Lab
        </button>
        <button
          onClick={() => onTabChange('prediction')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'prediction' ? 'text-blue-900 font-semibold' : ''
          }`}
        >
          Candidate Test
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenReports}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Reports</span>
        </button>
      </div>
    </header>
  );
};
