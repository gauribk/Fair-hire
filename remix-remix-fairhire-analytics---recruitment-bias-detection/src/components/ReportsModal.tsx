import React from 'react';
import { X, FileSpreadsheet, FileText, Archive, Download } from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const reports = [
    {
      title: 'Model Metrics Evaluation CSV',
      description: 'Accuracy, precision, recall, F1-score, and positive rate across both standard and audit setups on the held-out test split.',
      endpoint: '/download/model_metrics',
      filename: 'model_metrics.csv',
      icon: FileSpreadsheet,
    },
    {
      title: 'Demographic Fairness Results CSV',
      description: 'Disparate impact ratios, selection rates, and true positive rates across Gender, Race, Ethnicity, and Age categories.',
      endpoint: '/download/fairness_results',
      filename: 'fairness_results.csv',
      icon: FileSpreadsheet,
    },
    {
      title: 'Permutation Feature Importance CSV',
      description: 'Held-out test accuracy loss when shuffling logical feature groups (Resume text vs Role/JD vs Protected demographics).',
      endpoint: '/download/permutation_importance',
      filename: 'permutation_importance.csv',
      icon: FileSpreadsheet,
    },
    {
      title: 'Mitigation Audit (Before & After) CSV',
      description: 'Demographic parity, disparate impact ratios, true positive rates, and accuracy trade-offs before and after mitigation on held-out test data.',
      endpoint: '/download/mitigation_results',
      filename: 'mitigation_results.csv',
      icon: FileSpreadsheet,
    },
    {
      title: 'Gender Disparity by Job Role CSV',
      description: 'Female vs Male target label rates across all 51 standardized roles, identifying roles with >=50 point gaps.',
      endpoint: '/download/gender_gap_by_role',
      filename: 'gender_gap_by_role.csv',
      icon: FileSpreadsheet,
    },
    {
      title: 'Dataset Summary & Governance CSV',
      description: 'Aggregate applicant counts, demographic balances, missing values, and dataset integrity checks.',
      endpoint: '/download/dataset_summary',
      filename: 'dataset_summary.csv',
      icon: FileSpreadsheet,
    },
    {
      title: 'Verified Results Markdown Summary',
      description: 'Live scientific report formatted in Markdown with verified metrics tables and ethics disclosure.',
      endpoint: '/download/results_summary_markdown',
      filename: 'results_summary.md',
      icon: FileText,
    },
    {
      title: 'Complete Flask Project Archive (.zip)',
      description: 'Download the standalone Python Flask codebase, scikit-learn core modules, and templates for local execution.',
      endpoint: '/download/project_zip',
      filename: 'recruitment-bias-flask.zip',
      icon: Archive,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Audit Data & Report Exports
            </h3>
            <p className="text-xs text-slate-500">
              Download live computed empirical data directly from the Python backend.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {reports.map((rep, idx) => {
            const Icon = rep.icon;
            return (
              <div
                key={idx}
                className="flex items-start justify-between gap-4 p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 leading-snug">
                      {rep.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {rep.description}
                    </div>
                  </div>
                </div>

                <a
                  href={rep.endpoint}
                  download={rep.filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-white bg-white hover:bg-slate-900 rounded-md border border-slate-300 hover:border-slate-900 transition-colors shrink-0 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
