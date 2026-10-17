import React from 'react';
import { NavigationTab } from '../types';
import {
  LayoutDashboard,
  Database,
  Cpu,
  Scale,
  SlidersHorizontal,
  BarChart3,
  UserCheck,
  FileSpreadsheet,
  FileCode2,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenReports: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenReports,
}) => {
  const navItems: Array<{
    id: NavigationTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'overview',
      label: 'Executive Overview',
      description: 'Audit KPIs & empirical takeaways',
      icon: LayoutDashboard,
    },
    {
      id: 'dataset',
      label: 'Dataset Analysis',
      description: '10,000 records & 51 job roles',
      icon: Database,
    },
    {
      id: 'models',
      label: 'Model Performance',
      description: '3 classifiers & confusion matrices',
      icon: Cpu,
    },
    {
      id: 'fairness',
      label: 'Fairness Analysis',
      description: 'Disparate impact & parity audits',
      icon: Scale,
    },
    {
      id: 'mitigation',
      label: 'Bias Mitigation Lab',
      description: 'Reweighting & threshold tuning',
      icon: SlidersHorizontal,
    },
    {
      id: 'features',
      label: 'Feature Importance',
      description: 'Permutation loss & TF-IDF n-grams',
      icon: BarChart3,
    },
    {
      id: 'prediction',
      label: 'Candidate Prediction',
      description: 'Live test & counterfactual audit',
      icon: UserCheck,
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-200 shrink-0 flex flex-col justify-between border-r border-slate-800 select-none min-h-[calc(100vh-53px)]">
      <div className="p-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-xs font-semibold tracking-wider uppercase text-slate-400">
            Audit Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <div className="text-sm leading-tight truncate">{item.label}</div>
                    <div className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Audit Methodology Snapshot */}
        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-slate-200">Scientific Protocol</div>
          <div className="text-slate-400 leading-relaxed">
            Stratified 80/20 train/test split (8,000 train / 2,000 held-out test). Preprocessing fitted strictly on train data to prevent data leakage.
          </div>
          <div className="pt-1 flex items-center gap-2 text-slate-400">
            <span>51 Roles</span>
            <span>·</span>
            <span>4 Demographics</span>
            <span>·</span>
            <span>3 Models</span>
          </div>
        </div>
      </div>

      {/* Footer Utility Actions */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <button
          onClick={onOpenReports}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800/80 rounded-lg border border-slate-800 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            Audit Exports & CSVs
          </span>
          <span className="text-slate-400 text-xs">6 files</span>
        </button>

        <a
          href="/flask/"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5" />
            Original Flask Views
          </span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    </aside>
  );
};
