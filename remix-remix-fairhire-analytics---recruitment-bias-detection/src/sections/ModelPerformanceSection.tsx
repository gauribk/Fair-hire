import React, { useState } from 'react';
import { ModelSummaryItem } from '../types';
import {
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
} from 'lucide-react';

interface ModelPerformanceSectionProps {
  summaryRows: ModelSummaryItem[];
  trainSize: number;
  testSize: number;
}

export const ModelPerformanceSection: React.FC<ModelPerformanceSectionProps> = ({
  summaryRows,
  trainSize,
  testSize,
}) => {
  const [selectedSetup, setSelectedSetup] = useState<'standard' | 'audit'>('standard');
  const [selectedModel, setSelectedModel] = useState<string>('Random Forest');

  const filteredRows = summaryRows.filter((r) => r.setup === selectedSetup);
  const activeModelData = filteredRows.find((r) => r.model === selectedModel) || filteredRows[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Machine Learning Model Performance & Evaluation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Comparing 3 scikit-learn architectures on {testSize.toLocaleString()} held-out test applicant records.
          </p>
        </div>

        {/* Setup Segmented Switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setSelectedSetup('standard')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              selectedSetup === 'standard'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Standard Setup (Fair Features)
          </button>
          <button
            onClick={() => setSelectedSetup('audit')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              selectedSetup === 'audit'
                ? 'bg-white text-rose-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Setup (+ Protected Attributes)
          </button>
        </div>
      </div>

      {/* Setup Context Banner */}
      <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
        selectedSetup === 'standard'
          ? 'bg-blue-50/50 border-blue-200 text-slate-700'
          : 'bg-rose-50/50 border-rose-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2 font-bold">
          {selectedSetup === 'standard' ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              <span className="text-blue-900">Standard Production Setup (Fair Features Only)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <span className="text-rose-900">Demographic Audit Setup (Intentionally Includes Protected Attributes)</span>
            </>
          )}
        </div>
        <p className="text-slate-600">
          {selectedSetup === 'standard'
            ? 'Inputs strictly limited to Resume Text (TF-IDF 2,500 features), Job Description (TF-IDF 800 features), and Job Roles (One-Hot Encoded). Protected attributes (Gender, Race, Ethnicity, Age) are completely omitted. Note: models perform at ~50% test accuracy because resume qualifications carry virtually zero signal for the historical label.'
            : 'Inputs include all standard qualification features plus Gender, Race, Ethnicity, and Age. Accuracy immediately surges to ~88% because the algorithms easily memorize the strong role-gender correlation present in the historical training labels.'}
        </p>
      </div>

      {/* 3 Model Cards with Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredRows.map((row) => {
          const isSelected = selectedModel === row.model;
          return (
            <div
              key={row.model}
              onClick={() => setSelectedModel(row.model)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-white border-blue-600 ring-2 ring-blue-600/10 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-900">{row.model}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isSelected ? 'Active Model' : 'Click to inspect'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Test Accuracy</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                    {(row.accuracy * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">F1-Score</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {row.f1.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Precision / Recall</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {row.precision.toFixed(3)} / {row.recall.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Predicted Selection Rate</span>
                  <span className="font-mono tabular-nums font-semibold text-blue-700">
                    {(row.pred_rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Deep-Dive: Confusion Matrix and Diagnostic Analysis */}
      {activeModelData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confusion Matrix Card */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Held-Out Confusion Matrix: {activeModelData.model}
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluated on {testSize.toLocaleString()} unseen test records ({selectedSetup} setup)
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                Acc: {(activeModelData.accuracy * 100).toFixed(1)}%
              </span>
            </div>

            {/* 2x2 Confusion Matrix Grid */}
            <div className="pt-2">
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {/* TN */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-800">
                    True Negatives (TN)
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900">
                    {activeModelData.cm[0][0]?.toLocaleString() || 0}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Correctly rejected (Actual 0 &rarr; Pred 0)
                  </div>
                </div>

                {/* FP */}
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-center space-y-1">
                  <div className="text-[11px] font-semibold text-rose-800">
                    False Positives (FP)
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-rose-900">
                    {activeModelData.cm[0][1]?.toLocaleString() || 0}
                  </div>
                  <div className="text-[11px] text-rose-700">
                    Type I Error (Actual 0 &rarr; Pred 1)
                  </div>
                </div>

                {/* FN */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-center space-y-1">
                  <div className="text-[11px] font-semibold text-amber-800">
                    False Negatives (FN)
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-900">
                    {activeModelData.cm[1][0]?.toLocaleString() || 0}
                  </div>
                  <div className="text-[11px] text-amber-700">
                    Type II Error (Actual 1 &rarr; Pred 0)
                  </div>
                </div>

                {/* TP */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-center space-y-1">
                  <div className="text-[11px] font-semibold text-blue-800">
                    True Positives (TP)
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-blue-900">
                    {activeModelData.cm[1][1]?.toLocaleString() || 0}
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Correctly selected (Actual 1 &rarr; Pred 1)
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Total Test Set: {testSize.toLocaleString()} records</span>
              <span>
                Total Errors: {(activeModelData.cm[0][1] + activeModelData.cm[1][0]).toLocaleString()} (
                {(((activeModelData.cm[0][1] + activeModelData.cm[1][0]) / testSize) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Model Metrics Table & Empirical Insights */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Comparative Metric Summary ({selectedSetup.toUpperCase()})
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3 text-right">Accuracy</th>
                    <th className="py-2.5 px-3 text-right">Precision</th>
                    <th className="py-2.5 px-3 text-right">Recall</th>
                    <th className="py-2.5 px-3 text-right">F1-Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((r) => (
                    <tr
                      key={r.model}
                      onClick={() => setSelectedModel(r.model)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedModel === r.model ? 'bg-blue-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-900">{r.model}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {(r.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {r.precision.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {r.recall.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-700 font-bold">
                        {r.f1.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Audit Insight Box */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Auditing Insight</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Notice that under the standard setup, all three models cluster tightly around 50% accuracy. Because the dataset's historical "Best Match" labels were generated without correlation to actual skills text, omitting demographic labels leaves the models with no predictive signal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
