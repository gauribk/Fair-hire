import React, { useState, useEffect } from 'react';
import { MitigationData } from '../types';
import { fetchMitigation } from '../api';
import {
  SlidersHorizontal,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Download,
  HelpCircle,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface MitigationSectionProps {
  initialAttribute?: string;
  initialSetup?: 'standard' | 'audit';
  initialModel?: string;
}

export const MitigationSection: React.FC<MitigationSectionProps> = ({
  initialAttribute = 'Gender',
  initialSetup = 'audit',
  initialModel = 'Random Forest',
}) => {
  const [attribute, setAttribute] = useState<string>(initialAttribute);
  const [setup, setSetup] = useState<'standard' | 'audit'>(initialSetup);
  const [model, setModel] = useState<string>(initialModel);
  const [strategy, setStrategy] = useState<'demographic_parity' | 'equal_opportunity'>('demographic_parity');

  const [data, setData] = useState<MitigationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comparison' | 'reweighting' | 'tradeoff'>('comparison');
  const [showArchitectureNotice, setShowArchitectureNotice] = useState<boolean>(true);

  const loadData = async (
    attr: string,
    setp: 'standard' | 'audit',
    mdl: string,
    strat: 'demographic_parity' | 'equal_opportunity'
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchMitigation({
        attribute: attr,
        setup: setp,
        model: mdl,
        strategy: strat,
      });
      setData(res);
    } catch (err) {
      setError((err as Error).message || 'Failed to load mitigation data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(attribute, setup, model, strategy);
  }, []);

  const handleAttributeChange = (newAttr: string) => {
    setAttribute(newAttr);
    loadData(newAttr, setup, model, strategy);
  };

  const handleSetupChange = (newSetup: 'standard' | 'audit') => {
    setSetup(newSetup);
    loadData(attribute, newSetup, model, strategy);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    loadData(attribute, setup, newModel, strategy);
  };

  const handleStrategyChange = (newStrategy: 'demographic_parity' | 'equal_opportunity') => {
    setStrategy(newStrategy);
    loadData(attribute, setup, model, newStrategy);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-800 rounded-md">
              <SlidersHorizontal className="w-5 h-5 text-blue-700" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Bias Mitigation Lab
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              Before &amp; After Audit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Empirical mitigation benchmarking across the 8,000 train records and 2,000 held-out test records.
          </p>
        </div>

        {/* Setup Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
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
          </div>

          <a
            href={`/download/mitigation_results?attribute=${encodeURIComponent(attribute)}&setup=${setup}&model=${encodeURIComponent(model)}&strategy=${strategy}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
            title="Download complete mitigation CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>
        </div>
      </div>

      {/* Control Bar: Protected Attribute, Model, Strategy */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Protected Class Selection */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold mr-1">Protected Class:</span>
            {['Gender', 'Race', 'Ethnicity', 'Age'].map((attr) => (
              <button
                key={attr}
                onClick={() => handleAttributeChange(attr)}
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

          {/* Model Classifier Selection */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
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
            </div>

            {/* Mitigation Strategy Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => handleStrategyChange('demographic_parity')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  strategy === 'demographic_parity'
                    ? 'bg-white text-blue-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Equalize positive selection rate across protected groups"
              >
                Demographic Parity
              </button>
              <button
                onClick={() => handleStrategyChange('equal_opportunity')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  strategy === 'equal_opportunity'
                    ? 'bg-white text-blue-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Equalize True Positive Rate (TPR) across protected groups"
              >
                Equal Opportunity (TPR)
              </button>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Lab Modules:</span>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Before &amp; After Comparison
          </button>
          <button
            onClick={() => setActiveTab('reweighting')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'reweighting'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Sample Reweighting Analysis
          </button>
          <button
            onClick={() => setActiveTab('tradeoff')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'tradeoff'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Fairness-Performance Trade-off
          </button>
        </div>
      </div>

      {/* Architectural Disclosure & Scientific Protocol Notice */}
      {showArchitectureNotice && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-sm space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Scientific Rigor &amp; Architecture Integrity Notice</span>
            </div>
            <button
              onClick={() => setShowArchitectureNotice(false)}
              className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300 pt-1 leading-relaxed">
            <div>
              <span className="font-semibold text-white">1. Parameter Fitting Protocol (Train-Only):</span>
              <p className="text-slate-400 mt-0.5">
                Mitigation parameters (&tau; thresholds) are fitted strictly on the 8,000 training records.
                <strong className="text-slate-200"> Held-out test labels are never accessed</strong> during threshold optimization or tuning.
                Both baseline (&tau; = 0.50) and mitigated models are evaluated out-of-sample on the exact same 2,000 test applicants.
              </p>
            </div>
            <div>
              <span className="font-semibold text-white">2. Runtime Implementation Reality:</span>
              <p className="text-slate-400 mt-0.5">
                The backend executes in a Node.js runtime without Python/C++ Scikit-Learn binaries. In-processing sample reweighting (which modifies Gini split criterion during recursive tree growth) cannot dynamically retrain a 100-tree Scikit-Learn forest. Rather than fabricating a misleading retrained model, we implement documented <strong className="text-slate-200">Group-Specific Threshold Optimization (Hardt et al. 2016 / Fairlearn)</strong> and calculate empirical Kamiran &amp; Calders sample weights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading or Error State */}
      {isLoading ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-medium text-slate-700">
            Fitting mitigation parameters on training split and evaluating test records...
          </div>
        </div>
      ) : error || !data ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Error Computing Mitigation</span>
          </div>
          <p>{error || 'Unable to retrieve mitigation results.'}</p>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Before & After Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Disparate Impact Ratio */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Disparate Impact Ratio</span>
                <span className="font-mono text-[11px] text-slate-400">min/max rate</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400">Baseline</div>
                  <div className="text-lg font-bold font-mono text-slate-800">
                    {(data.baseline.disparateImpactRatio * 100).toFixed(1)}%
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className="text-right">
                  <div className={`text-xs font-semibold ${data.mitigated.disparateImpactRatio >= data.baseline.disparateImpactRatio ? 'text-emerald-600' : 'text-amber-700'}`}>Mitigated</div>
                  <div className={`text-xl font-bold font-mono ${data.mitigated.adverseImpact ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {(data.mitigated.disparateImpactRatio * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">EEOC 80% Rule:</span>
                {data.mitigated.adverseImpact ? (
                  <span className="font-semibold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Fails 0.80 Rule
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Compliant (&ge;0.80)
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: Demographic Parity Difference */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Demographic Parity Diff</span>
                <span className="font-mono text-[11px] text-slate-400">max - min</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400">Baseline</div>
                  <div className="text-lg font-bold font-mono text-slate-800">
                    {(data.baseline.demographicParityDiff * 100).toFixed(1)}%
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className="text-right">
                  <div className={`text-xs font-semibold ${data.mitigated.demographicParityDiff <= data.baseline.demographicParityDiff ? 'text-emerald-600' : 'text-amber-700'}`}>Mitigated</div>
                  <div className={`text-xl font-bold font-mono ${data.mitigated.demographicParityDiff <= data.baseline.demographicParityDiff ? 'text-emerald-600' : 'text-amber-700'}`}>
                    {(data.mitigated.demographicParityDiff * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Parity Delta:</span>
                {data.tradeoffSummary.disparityReduction > 0 ? (
                  <span className="font-semibold text-emerald-600 font-mono">
                    -{(data.tradeoffSummary.disparityReduction * 100).toFixed(1)}% pts (Reduced)
                  </span>
                ) : data.tradeoffSummary.disparityReduction < 0 ? (
                  <span className="font-semibold text-rose-600 font-mono">
                    +{(Math.abs(data.tradeoffSummary.disparityReduction) * 100).toFixed(1)}% pts (Increased)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-500 font-mono">
                    0.0% pts (Unchanged)
                  </span>
                )}
              </div>
            </div>

            {/* KPI 3: True Positive Rate (TPR) Gap */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Equal Opportunity (TPR Gap)</span>
                <span className="font-mono text-[11px] text-slate-400">max - min TPR</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400">Baseline</div>
                  <div className="text-lg font-bold font-mono text-slate-800">
                    {(data.baseline.tprGap * 100).toFixed(1)}%
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className="text-right">
                  <div className={`text-xs font-semibold ${data.mitigated.tprGap <= data.baseline.tprGap ? 'text-emerald-600' : 'text-amber-700'}`}>Mitigated</div>
                  <div className={`text-xl font-bold font-mono ${data.mitigated.tprGap <= data.baseline.tprGap ? 'text-emerald-600' : 'text-amber-700'}`}>
                    {(data.mitigated.tprGap * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">TPR Disparity:</span>
                {data.tradeoffSummary.tprGapReduction > 0 ? (
                  <span className="font-semibold text-emerald-600 font-mono">
                    -{(data.tradeoffSummary.tprGapReduction * 100).toFixed(1)}% pts (Reduced)
                  </span>
                ) : data.tradeoffSummary.tprGapReduction < 0 ? (
                  <span className="font-semibold text-amber-700 font-mono">
                    +{(Math.abs(data.tradeoffSummary.tprGapReduction) * 100).toFixed(1)}% pts (Increased)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-500 font-mono">
                    0.0% pts (Unchanged)
                  </span>
                )}
              </div>
            </div>

            {/* KPI 4: Predictive Accuracy & Trade-Off */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Held-Out Test Accuracy</span>
                <span className="font-mono text-[11px] text-slate-400">2,000 records</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400">Baseline</div>
                  <div className="text-lg font-bold font-mono text-slate-800">
                    {(data.baseline.accuracy * 100).toFixed(1)}%
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className="text-right">
                  <div className="text-xs text-slate-700 font-semibold">Mitigated</div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {(data.mitigated.accuracy * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Accuracy Trade-Off:</span>
                <span className={`font-semibold font-mono ${data.tradeoffSummary.accuracyDelta < 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                  {data.tradeoffSummary.accuracyDelta > 0 ? '+' : ''}
                  {(data.tradeoffSummary.accuracyDelta * 100).toFixed(1)}% pts
                </span>
              </div>
            </div>
          </div>

          {/* Module Tab 1: Before & After Comparison */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              {/* Visual Selection Rate Comparison Chart */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-600" />
                      <span>Selection Rate Before vs After Mitigation by {data.attribute}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comparing group selection rates against overall applicant baseline on 2,000 held-out test records.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-slate-300 rounded-xs" />
                      <span className="text-slate-600">Historical Label Base</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-rose-400 rounded-xs" />
                      <span className="text-slate-600">Baseline Model</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-emerald-500 rounded-xs" />
                      <span className="text-slate-600">Mitigated Model</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {data.groupMetrics.map((gm) => (
                    <div key={gm.group} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          {gm.group}
                          {gm.smallGroup && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px] font-normal">
                              Small Group (N &lt; 30)
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                          <span title="Historical Positive Rate in Test">
                            Hist: {(gm.actualRate * 100).toFixed(1)}%
                          </span>
                          <span title="Baseline Selection Rate" className="text-rose-700 font-semibold">
                            Base: {(gm.baselineRate * 100).toFixed(1)}%
                          </span>
                          <span title="Mitigated Selection Rate" className="text-emerald-700 font-bold">
                            Mit: {(gm.mitigatedRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Visualization */}
                      <div className="h-6 w-full bg-slate-100 rounded-md overflow-hidden relative flex">
                        {/* Reference indicator for 50% parity */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-400 z-10 border-dashed" title="50% Balanced Rate" />

                        <div className="w-full h-full flex flex-col justify-center space-y-1 px-1">
                          {/* Baseline bar */}
                          <div
                            className="h-2 bg-rose-400 rounded-xs transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(2, gm.baselineRate * 100))}%` }}
                          />
                          {/* Mitigated bar */}
                          <div
                            className="h-2 bg-emerald-500 rounded-xs transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(2, gm.mitigatedRate * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Per-Group Comparison Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Detailed Group-Level Metrics &amp; Fitted Thresholds
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thresholds $\tau_g$ were fitted strictly on train records; evaluation conducted on held-out test split.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                    Strategy: {data.strategy === 'demographic_parity' ? 'Demographic Parity' : 'Equal Opportunity'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Group</th>
                        <th className="py-3 px-3 text-right">Train N</th>
                        <th className="py-3 px-3 text-right">Test N</th>
                        <th className="py-3 px-3 text-right">Hist. Rate</th>
                        <th className="py-3 px-3 text-right">Base Rate</th>
                        <th className="py-3 px-3 text-right">Mit. Rate</th>
                        <th className="py-3 px-3 text-right">Base TPR</th>
                        <th className="py-3 px-3 text-right">Mit. TPR</th>
                        <th className="py-3 px-3 text-right">Base Acc</th>
                        <th className="py-3 px-3 text-right">Mit. Acc</th>
                        <th className="py-3 px-4 text-center">Fitted &tau;</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.groupMetrics.map((gm) => (
                        <tr key={gm.group} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {gm.group}
                            {gm.smallGroup && (
                              <span className="block text-[10px] font-normal text-amber-700">
                                Low sample size
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">{gm.trainCount.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">{gm.testCount.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">{(gm.actualRate * 100).toFixed(1)}%</td>
                          <td className="py-3 px-3 text-right font-mono text-rose-700 font-medium">{(gm.baselineRate * 100).toFixed(1)}%</td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">{(gm.mitigatedRate * 100).toFixed(1)}%</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">{gm.baselineTpr !== null ? `${(gm.baselineTpr * 100).toFixed(1)}%` : 'N/A'}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-900 font-medium">{gm.mitigatedTpr !== null ? `${(gm.mitigatedTpr * 100).toFixed(1)}%` : 'N/A'}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">{(gm.baselineAccuracy * 100).toFixed(1)}%</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-900 font-semibold">{(gm.mitigatedAccuracy * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono text-xs font-semibold rounded border border-blue-200">
                              {gm.fittedThreshold.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Overall Model Performance Summary Table */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-2">
                    Overall Model Performance Metrics (On Held-Out Test Records)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500">Accuracy</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        Base: {(data.baseline.accuracy * 100).toFixed(2)}% | Mit: {(data.mitigated.accuracy * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500">Precision</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        Base: {(data.baseline.precision * 100).toFixed(2)}% | Mit: {(data.mitigated.precision * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500">Recall</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        Base: {(data.baseline.recall * 100).toFixed(2)}% | Mit: {(data.mitigated.recall * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500">F1-Score</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        Base: {(data.baseline.f1 * 100).toFixed(2)}% | Mit: {(data.mitigated.f1 * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Module Tab 2: Sample Reweighting Analysis */}
          {activeTab === 'reweighting' && (
            <div className="space-y-6">
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Pre-Processing Sample Reweighting (Kamiran &amp; Calders, 2012)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Under the Kamiran &amp; Calders formulation, sample weights W(s, y) = [P(S=s) &times; P(Y=y)] / P(S=s, Y=y) = [N(s) &times; N(y)] / [N &times; N(s, y)] reweight training records to neutralize historical demographic correlation prior to model training.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Protected Group (S)</th>
                        <th className="py-2.5 px-3">Target Label (Y)</th>
                        <th className="py-2.5 px-3 text-right">Observed Count N(s, y)</th>
                        <th className="py-2.5 px-3 text-right">Expected Count under Parity</th>
                        <th className="py-2.5 px-4 text-center">Reweighting Factor $W(s, y)$</th>
                        <th className="py-2.5 px-4">Reweighting Effect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.reweightingTable.map((rw, idx) => {
                        const isUpweighted = rw.weight > 1.05;
                        const isDownweighted = rw.weight < 0.95;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{rw.group}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">{rw.labelName}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">{rw.count.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">{rw.expectedCount.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 font-mono text-xs font-bold rounded ${
                                  isUpweighted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : isDownweighted
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                &times;{rw.weight.toFixed(4)}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-xs">
                              {isUpweighted ? (
                                <span className="text-emerald-700 font-medium">
                                  &uarr; Upweighted (compensates historical underrepresentation)
                                </span>
                              ) : isDownweighted ? (
                                <span className="text-rose-700 font-medium">
                                  &darr; Downweighted (penalizes historical overrepresentation)
                                </span>
                              ) : (
                                <span className="text-slate-500">Neutral weight (~1.0)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Educational Notice */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1.5 text-slate-700">
                  <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-700" />
                    <span>How Pre-Processing Reweighting Compares to Post-Processing Thresholds</span>
                  </div>
                  <p className="leading-relaxed">
                    <strong>Pre-processing Reweighting</strong> operates on sample counts before training, assigning higher sample loss weights to underrepresented positive cases. In full Scikit-Learn pipelines, this parameter is supplied via <code className="px-1 py-0.5 bg-blue-100 rounded text-blue-900 font-mono">model.fit(X, y, sample_weight=w)</code>.
                  </p>
                  <p className="leading-relaxed">
                    <strong>Post-Processing Threshold Optimization</strong> operates directly on model score distributions P(Y=1 | X), searching for group thresholds &tau; that satisfy Demographic Parity without altering the trained base model weights. Both methods target identical fairness definitions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Module Tab 3: Trade-Off Analysis */}
          {activeTab === 'tradeoff' && (
            <div className="space-y-6">
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Algorithmic Fairness vs Predictive Accuracy Trade-Off</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deconstructing why fairness interventions alter test accuracy when training labels contain historical bias.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Mitigation Verdict</span>
                  </div>
                  <p className="leading-relaxed">{data.tradeoffSummary.verdict}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                      <span>The Bias Memorization Trap</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      In the historical dataset, 32 job roles artificially favored male applicants by &ge;50 percentage points, and 17 favored female applicants. When demographic features are provided (Audit Setup), standard machine-learning classifiers achieve ~88% test accuracy solely by <em>memorizing</em> and replicating this historical gender discrimination.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Therefore, high predictive accuracy on biased historical test labels is <strong>not evidence of candidate merit</strong>—it is evidence of algorithmic complicity.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      <span>The Pareto Frontier of Ethical ML</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      By shifting decision thresholds (&tau; = {data.groupMetrics[0]?.fittedThreshold.toFixed(2) || '0.32'} vs &tau; = {data.groupMetrics[1]?.fittedThreshold.toFixed(2) || '0.68'} across demographic groups), the model breaks the cycle of demographic gatekeeping.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      The observed test accuracy adjustment of {Math.abs(data.tradeoffSummary.accuracyDelta * 100).toFixed(1)}% reflects the deliberate refusal to mirror discriminatory historical outcomes, achieving an ethical Disparate Impact Ratio of {(data.mitigated.disparateImpactRatio * 100).toFixed(1)}%.
                    </p>
                  </div>
                </div>

                {/* Confusion Matrix Side-by-Side Comparison */}
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-900 mb-3">
                    Confusion Matrix Comparison on 2,000 Held-Out Test Records
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Baseline CM */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-xs font-semibold text-slate-700 mb-2">
                        Baseline Model ($\tau = 0.50$)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400">TN (True Neg)</div>
                          <div className="font-mono font-bold text-slate-900">{data.baseline.confusionMatrix[0][0]}</div>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400">FP (False Pos)</div>
                          <div className="font-mono font-bold text-rose-700">{data.baseline.confusionMatrix[0][1]}</div>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400">FN (False Neg)</div>
                          <div className="font-mono font-bold text-amber-700">{data.baseline.confusionMatrix[1][0]}</div>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <div className="text-[10px] text-slate-400">TP (True Pos)</div>
                          <div className="font-mono font-bold text-emerald-700">{data.baseline.confusionMatrix[1][1]}</div>
                        </div>
                      </div>
                    </div>

                    {/* Mitigated CM */}
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                      <div className="text-xs font-semibold text-emerald-950 mb-2">
                        Mitigated Model (Group Thresholds $\tau_g$)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 bg-white rounded border border-emerald-100">
                          <div className="text-[10px] text-slate-400">TN (True Neg)</div>
                          <div className="font-mono font-bold text-slate-900">{data.mitigated.confusionMatrix[0][0]}</div>
                        </div>
                        <div className="p-2 bg-white rounded border border-emerald-100">
                          <div className="text-[10px] text-slate-400">FP (False Pos)</div>
                          <div className="font-mono font-bold text-slate-700">{data.mitigated.confusionMatrix[0][1]}</div>
                        </div>
                        <div className="p-2 bg-white rounded border border-emerald-100">
                          <div className="text-[10px] text-slate-400">FN (False Neg)</div>
                          <div className="font-mono font-bold text-slate-700">{data.mitigated.confusionMatrix[1][0]}</div>
                        </div>
                        <div className="p-2 bg-white rounded border border-emerald-100">
                          <div className="text-[10px] text-slate-400">TP (True Pos)</div>
                          <div className="font-mono font-bold text-emerald-700">{data.mitigated.confusionMatrix[1][1]}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
