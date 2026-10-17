import React from 'react';
import { OverviewData, NavigationTab } from '../types';
import {
  Users,
  Award,
  Cpu,
  ShieldAlert,
  ArrowRight,
  Database,
  Scale,
  UserCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface OverviewSectionProps {
  data: OverviewData;
  onNavigate: (tab: NavigationTab) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ data, onNavigate }) => {
  const femaleRate = (data.gender_rates['Female'] || 0) * 100;
  const maleRate = (data.gender_rates['Male'] || 0) * 100;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Recruitment Bias & Algorithmic Fairness Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Empirical evaluation of 10,000 applicant records and 3 machine learning classifiers on a held-out test split.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>Stratified 80/20 Train/Test Split</span>
          <span aria-hidden="true">·</span>
          <span>51 Standardized Roles</span>
          <span aria-hidden="true">·</span>
          <span>4 Protected Demographic Classes</span>
        </div>
      </div>

      {/* 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Applicants */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Evaluated Records</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {data.total_applicants.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            {data.train_size.toLocaleString()} train · {data.test_size.toLocaleString()} held-out test
          </div>
        </div>

        {/* Card 2: Historical Label Rate */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Historical Best Match Rate</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
            {data.best_match_pct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Target label base rate across all 10k rows
          </div>
        </div>

        {/* Card 3: Standard Model Accuracy */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Standard Model Test Accuracy</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-700 font-mono tabular-nums">
            {data.best_std_acc.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Resume + Role only (at random chance)
          </div>
        </div>

        {/* Card 4: Audit Model Accuracy */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Audit Model Test Accuracy</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-700 font-mono tabular-nums">
            {data.best_aud_acc.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            With Gender added (learns historical bias)
          </div>
        </div>
      </div>

      {/* Core Empirical Findings Callout Grid */}
      <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Empirical Findings & Scientific Highlights
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 space-y-1">
            <div className="text-xs font-bold text-slate-900">
              1. Zero Signal in Resume Text
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard models trained only on legitimate job qualification features (Resume, Job Role, Job Description) achieve ~50% test accuracy—statistically indistinguishable from random guessing.
            </p>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 space-y-1">
            <div className="text-xs font-bold text-slate-900">
              2. Severe Role-Level Gender Skew
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Historical selection labels embed stark role-gender correlations: {data.male_favored} roles favor men by &ge;50 percentage points, {data.fem_favored} roles favor women, and only {data.neutral_roles} roles are gender-neutral.
            </p>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 space-y-1">
            <div className="text-xs font-bold text-slate-900">
              3. Biased Memorization Spike
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When demographic features are included (audit setup), test accuracy surges to ~88%. The classifier exploits demographic correlations to memorize skewed target labels rather than measuring candidate competence.
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Deep Dive: Disparity Distribution & Audit Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disparity Distribution Breakdown */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Historical Best Match Rate by Gender
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              10,000 Total Applicants
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Female */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  Female Applicants ({data.gender_counts['Female']?.toLocaleString() || 0})
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-900">
                  {femaleRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${femaleRate}%` }}
                />
              </div>
            </div>

            {/* Male */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  Male Applicants ({data.gender_counts['Male']?.toLocaleString() || 0})
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-900">
                  {maleRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-700 rounded-full transition-all duration-500"
                  style={{ width: `${maleRate}%` }}
                />
              </div>
            </div>

            {/* Gap Analysis Note */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Macro Parity vs Micro Disparity</div>
              <p className="text-slate-500 leading-relaxed">
                At the aggregate dataset level, the overall selection rates appear roughly balanced (
                {Math.abs(femaleRate - maleRate).toFixed(1)}% delta). However, role-by-role stratification reveals extreme disparities, where single roles systematically favor one demographic by 50 to 90 points.
              </p>
            </div>
          </div>
        </div>

        {/* Audit Modules Quick Links */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Audit Modules & Navigation Shortcuts
            </h3>
            <span className="text-xs text-slate-500">Quick Access</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('dataset')}
              className="p-3.5 text-left rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-xs font-bold text-slate-900">Dataset Analysis</div>
              <div className="text-[11px] text-slate-500 mt-0.5">10k rows & 51 roles</div>
            </button>

            <button
              onClick={() => onNavigate('models')}
              className="p-3.5 text-left rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-xs font-bold text-slate-900">ML Evaluation</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Confusion matrices</div>
            </button>

            <button
              onClick={() => onNavigate('fairness')}
              className="p-3.5 text-left rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-xs font-bold text-slate-900">Fairness Audit</div>
              <div className="text-[11px] text-slate-500 mt-0.5">0.80 Disparate Impact</div>
            </button>

            <button
              onClick={() => onNavigate('prediction')}
              className="p-3.5 text-left rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-xs font-bold text-slate-900">Candidate Test</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Real-time inference</div>
            </button>
          </div>
        </div>
      </div>

      {/* Model Benchmark Table Summary */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Held-Out Test Set Performance Benchmark
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated on 2,000 unseen applicant records across standard and audit configurations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('models')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
          >
            Detailed Metrics &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Model Architecture</th>
                <th className="py-2.5 px-3 text-right">Standard Test Acc</th>
                <th className="py-2.5 px-3 text-right">Audit Test Acc</th>
                <th className="py-2.5 px-3 text-right">Accuracy Delta (&Delta;)</th>
                <th className="py-2.5 px-3">Auditing Implication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {['Logistic Regression', 'Decision Tree', 'Random Forest'].map((mName) => {
                const stdAcc = (data.std_models[mName]?.accuracy || 0) * 100;
                const audAcc = (data.aud_models[mName]?.accuracy || 0) * 100;
                const delta = audAcc - stdAcc;
                return (
                  <tr key={mName} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{mName}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {stdAcc.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-rose-700">
                      {audAcc.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-700">
                      +{delta.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {delta > 30 ? (
                        <span className="text-rose-700 font-medium">Critical demographic memorization</span>
                      ) : (
                        <span className="text-amber-700 font-medium">Moderate demographic sensitivity</span>
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
