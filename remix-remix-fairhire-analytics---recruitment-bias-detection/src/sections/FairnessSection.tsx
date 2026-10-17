import React, { useState, useEffect } from 'react';
import { FairnessData } from '../types';
import { fetchFairness } from '../api';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  HelpCircle,
} from 'lucide-react';

interface FairnessSectionProps {
  initialData: FairnessData;
}

export const FairnessSection: React.FC<FairnessSectionProps> = ({ initialData }) => {
  const [data, setData] = useState<FairnessData>(initialData);
  const [attribute, setAttribute] = useState<string>(initialData.attr_label || 'Gender');
  const [model, setModel] = useState<string>(initialData.selected_model || 'Random Forest');
  const [setup, setSetup] = useState<'standard' | 'audit'>(initialData.setup || 'standard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showGlossary, setShowGlossary] = useState<boolean>(false);

  const loadFairness = async (newAttr: string, newModel: string, newSetup: 'standard' | 'audit') => {
    setIsLoading(true);
    try {
      const res = await fetchFairness({
        attribute: newAttr,
        model: newModel,
        setup: newSetup,
      });
      setData(res);
    } catch (err) {
      console.error('Error fetching fairness data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttrChange = (a: string) => {
    setAttribute(a);
    loadFairness(a, model, setup);
  };

  const handleModelChange = (m: string) => {
    setModel(m);
    loadFairness(attribute, m, setup);
  };

  const handleSetupChange = (s: 'standard' | 'audit') => {
    setSetup(s);
    loadFairness(attribute, model, s);
  };

  const diRatio = data.summary['Disparate-impact ratio (min/max)'] || 0;
  const parityDiff = data.summary['Demographic Parity Difference'] || 0;
  const tprGap = data.summary['True-positive-rate gap (max-min)'] || 0;
  const actualGap = data.summary['Actual-rate gap (max-min)'] || 0;

  // EEOC Four-Fifths rule check: Disparate Impact Ratio < 0.80 indicates adverse impact
  const hasAdverseImpact = diRatio < 0.80;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Algorithmic Fairness & Bias Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Evaluating disparate impact, demographic parity, and equal opportunity on {data.test_size.toLocaleString()} held-out applicants.
          </p>
        </div>

        {/* Setup switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => handleSetupChange('standard')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              setup === 'standard'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Standard Setup
          </button>
          <button
            onClick={() => handleSetupChange('audit')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              setup === 'audit'
                ? 'bg-white text-rose-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Setup (+ Demographics)
          </button>
        </div>
      </div>

      {/* Control Bar: Attribute Tabs & Model Selector */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Attribute Tabs */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-semibold mr-1">Protected Class:</span>
          {['Gender', 'Race', 'Ethnicity', 'Age'].map((attr) => (
            <button
              key={attr}
              onClick={() => handleAttrChange(attr)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                attribute === attr
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {attr === 'Age' ? 'Age Group' : attr}
            </button>
          ))}
        </div>

        {/* Model dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Classifier:</span>
          <select
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
          >
            <option value="Random Forest">Random Forest</option>
            <option value="Logistic Regression">Logistic Regression</option>
            <option value="Decision Tree">Decision Tree</option>
          </select>

          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="ml-2 inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Metric Definitions</span>
          </button>
        </div>
      </div>

      {/* Optional Educational Glossary Box */}
      {showGlossary && (
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-700" />
            <span>Fairness Metrics Guide for Technical Audits</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-700 pt-1">
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <div className="font-semibold text-slate-900">Disparate Impact Ratio (DIR)</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Min selection rate divided by Max selection rate ($Rate_{'{min}'} / Rate_{'{max}'}$). Under the U.S. EEOC Uniform Guidelines "Four-Fifths Rule", a ratio below 0.80 (80%) indicates adverse impact against the disfavored group.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <div className="font-semibold text-slate-900">Demographic Parity Difference</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Absolute difference between maximum and minimum group selection rates ($Rate_{'{max}'} - Rate_{'{min}'}$). Perfect demographic parity achieves a difference of 0.00.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <div className="font-semibold text-slate-900">True Positive Rate (TPR) Gap</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Measures Equal Opportunity: difference in recall across groups. Ensures qualified applicants in all protected classes have an equal likelihood of being accurately identified as a Best Match.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Core Fairness KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Disparate Impact */}
        <div className={`p-4 rounded-xl border shadow-xs space-y-1.5 ${
          hasAdverseImpact
            ? 'bg-rose-50/50 border-rose-200 text-rose-950'
            : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Disparate Impact Ratio</span>
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {hasAdverseImpact ? 'Adverse Impact (<0.80)' : 'Passes 4/5ths Rule'}
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${
            hasAdverseImpact ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {diRatio.toFixed(3)}
          </div>
          <div className="text-[11px] text-slate-500">
            EEOC threshold: &ge; 0.800 ({diRatio >= 0.8 ? 'Compliant' : 'Violation detected'})
          </div>
        </div>

        {/* Demographic Parity Difference */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="text-xs font-semibold text-slate-500">
            Demographic Parity Difference
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {(parityDiff * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Selection rate gap across groups ({parityDiff.toFixed(3)})
          </div>
        </div>

        {/* True Positive Rate Gap */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="text-xs font-semibold text-slate-500">
            Equal Opportunity (TPR Gap)
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-700">
            {(tprGap * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Difference in recall between groups ({tprGap.toFixed(3)})
          </div>
        </div>

        {/* Historical Label Gap */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="text-xs font-semibold text-slate-500">
            Historical Actual Label Gap
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-700">
            {(actualGap * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Ground-truth training data discrepancy
          </div>
        </div>
      </div>

      {/* Main Fairness Audit Table */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Per-Group Disparity Breakdown: {attribute === 'Age' ? 'Age Group' : attribute} ({model})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Held-out test split audit records with selection rates, accuracy, TPR, and FPR.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Model Test Accuracy: {(data.model_acc * 100).toFixed(1)}%
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Demographic Group</th>
                <th className="py-2.5 px-3 text-right">Sample (n)</th>
                <th className="py-2.5 px-3 text-right">Actual Best Match Rate</th>
                <th className="py-2.5 px-3 text-right">Predicted Selection Rate</th>
                <th className="py-2.5 px-3 text-right">Accuracy</th>
                <th className="py-2.5 px-3 text-right">True Positive Rate (TPR)</th>
                <th className="py-2.5 px-3 text-right">False Positive Rate (FPR)</th>
                <th className="py-2.5 px-3 text-center">Sample Reliability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Computing fairness metrics...
                  </td>
                </tr>
              ) : (
                data.table_records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {r.group}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {r.applicants.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {(r.actual_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-700">
                      {(r.pred_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {(r.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {r.tpr !== null ? `${(r.tpr * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {r.fpr !== null ? `${(r.fpr * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {r.small_group === 'yes' ? (
                        <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                          Small Sample (n &lt; 30)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[10px]">
                          Robust Sample (n &ge; 30)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Model Fairness Comparison for this Attribute */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Cross-Model Comparison under {attribute === 'Age' ? 'Age Group' : attribute} ({setup.toUpperCase()} SETUP)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluating how each machine learning architecture responds to the demographic attribute.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Classifier</th>
                <th className="py-2.5 px-3 text-right">Test Accuracy</th>
                <th className="py-2.5 px-3 text-right">Selection Rate Gap</th>
                <th className="py-2.5 px-3 text-right">Disparate Impact Ratio</th>
                <th className="py-2.5 px-3 text-right">True Positive Rate Gap</th>
                <th className="py-2.5 px-3">EEOC 4/5ths Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.model_comp.map((mcItem) => {
                const passes = mcItem.di_ratio >= 0.8;
                return (
                  <tr
                    key={mcItem.model}
                    onClick={() => handleModelChange(mcItem.model)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      model === mcItem.model ? 'bg-blue-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-900">{mcItem.model}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {(mcItem.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {(mcItem.pred_rate_gap * 100).toFixed(1)}%
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                      passes ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {mcItem.di_ratio.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {(mcItem.tpr_gap * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      {passes ? (
                        <span className="text-emerald-700 font-semibold">Passes (&ge; 0.800)</span>
                      ) : (
                        <span className="text-rose-700 font-semibold">Adverse Impact (&lt; 0.800)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
