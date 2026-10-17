import React, { useState } from 'react';
import { FeaturesData } from '../types';
import { fetchFeatures } from '../api';
import {
  BarChart3,
  TrendingDown,
  Info,
  Layers,
  HelpCircle,
  AlertTriangle,
  FileText,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';

interface FeatureImportanceSectionProps {
  initialData: FeaturesData;
}

export const FeatureImportanceSection: React.FC<FeatureImportanceSectionProps> = ({
  initialData,
}) => {
  const [data, setData] = useState<FeaturesData>(initialData);
  const [setup, setSetup] = useState<'standard' | 'audit'>(initialData.setup || 'standard');
  const [model, setModel] = useState<string>(initialData.selected_model || 'Random Forest');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showXaiGuide, setShowXaiGuide] = useState<boolean>(false);

  const loadFeatures = async (newSetup: 'standard' | 'audit', newModel: string) => {
    setIsLoading(true);
    try {
      const res = await fetchFeatures({
        setup: newSetup,
        model: newModel,
      });
      setData(res);
    } catch (err) {
      console.error('Error fetching feature importance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupChange = (s: 'standard' | 'audit') => {
    setSetup(s);
    loadFeatures(s, model);
  };

  const handleModelChange = (m: string) => {
    setModel(m);
    loadFeatures(setup, m);
  };

  // Find max drop for relative bar chart scaling
  const maxDrop = Math.max(0.01, ...data.perm_imp.map((p) => Math.abs(p.drop)));
  const top10Features = data.top_features.slice(0, 10);
  const maxImportance = Math.max(0.001, ...top10Features.map((f) => f.Importance));

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'Resume Text':
        return (
          <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Resume Keyword
          </span>
        );
      case 'Job Role':
        return (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Target Role
          </span>
        );
      case 'Job Description':
        return (
          <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Job Description
          </span>
        );
      case 'Protected Demographic':
        return (
          <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
            Protected Class
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Feature
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Explainable AI (XAI) & Global Feature Importance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Permutation importance loss and top 10 model weights evaluated on 2,000 held-out test records.
          </p>
        </div>

        {/* Setup Switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => handleSetupChange('standard')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              setup === 'standard'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Standard Setup (Fair Features)
          </button>
          <button
            onClick={() => handleSetupChange('audit')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              setup === 'audit'
                ? 'bg-white text-rose-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Setup (+ Protected Attributes)
          </button>
        </div>
      </div>

      {/* Model Selector Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Model Architecture:</span>
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
            onClick={() => setShowXaiGuide(!showXaiGuide)}
            className="ml-3 inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Global vs Local XAI Guide</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Held-out test split (2,000 applicants · 2 permutation repeats)
        </div>
      </div>

      {/* Educational XAI Guide */}
      {showXaiGuide && (
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-700" />
            <span>Understanding Explainable AI: Global Importance vs. Local Attribution</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 pt-1">
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Global Feature Importance (This Page)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Evaluates how much the model depends on a feature overall across all 2,000 test cohort applicants. Computed by shuffling feature values on unseen data and observing the aggregate accuracy drop.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Individual Prediction Explanation (Candidate Test Page)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Pinpoints the exact words, job role, and attributes that altered the predicted match probability for ONE specific applicant. Uses Leave-One-Covariate-Out (LOCO) local perturbation or linear logit decomposition.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Causation Warning Banner */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Correlation Does Not Prove Causation: </span>
          <span className="text-amber-900">
            Feature importance quantifies statistical dependencies and correlations learned from the historical training dataset. It does not establish real-world candidate competency, workplace qualification, or causal job performance.
          </span>
        </div>
      </div>

      {/* Grouped Permutation Importance Visualization */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Grouped Permutation Importance: {model} ({setup.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Empirical test accuracy drop when logical feature groups are randomly shuffled.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Recalculating feature importances...
            </div>
          ) : (
            data.perm_imp.map((item, idx) => {
              const dropPct = item.drop * 100;
              const barWidth = Math.min(100, Math.max(2, (Math.abs(item.drop) / maxDrop) * 100));
              const isProtected = ['Gender', 'Race', 'Ethnicity', 'Age'].includes(item.Input);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 flex items-center gap-2">
                      <span>{item.Input}</span>
                      {isProtected && (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                          Protected Demographic
                        </span>
                      )}
                    </span>
                    <span className={`font-mono tabular-nums font-bold ${
                      dropPct > 5 ? 'text-rose-700' : dropPct > 0 ? 'text-amber-700' : 'text-slate-500'
                    }`}>
                      {dropPct > 0 ? `-${dropPct.toFixed(2)}% accuracy drop` : `${dropPct.toFixed(2)}%`}
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isProtected ? 'bg-rose-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Auditing Takeaway</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            In the standard model, shuffling resume text produces a negligible accuracy drop (~0%), mathematically proving that the classifier makes decisions with virtually zero reliance on candidate skills. Conversely, in the audit model, shuffling Gender causes a major accuracy collapse (&gt;30%), demonstrating severe dependency on demographic bias.
          </p>
        </div>
      </div>

      {/* Top 10 Individual Most Influential Features */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Top 10 Most Influential Features ({model})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by model weight / feature importance from the fitted estimator.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {top10Features.length} Ranked Features
          </span>
        </div>

        {/* Visual Importance Bars */}
        <div className="space-y-3 pt-1">
          {top10Features.map((feat, idx) => {
            const barWidth = Math.max(3, (feat.Importance / maxImportance) * 100);
            const isDemo = feat.Category === 'Protected Demographic';
            return (
              <div key={idx} className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200/80 transition-colors space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-slate-400 font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 truncate">
                      {feat.Feature}
                    </span>
                    <div className="shrink-0">
                      {getCategoryBadge(feat.Category)}
                    </div>
                  </div>

                  <span className="font-mono tabular-nums font-bold text-blue-700 shrink-0 ml-2">
                    {feat.Importance.toFixed(4)}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDemo ? 'bg-rose-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
