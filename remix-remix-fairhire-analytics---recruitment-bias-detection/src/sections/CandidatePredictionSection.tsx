import React, { useState } from 'react';
import { MetadataInfo, PredictionResult } from '../types';
import {
  submitPrediction,
  fetchExampleCandidate,
  fetchRoleJobDescription,
} from '../api';
import {
  UserCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Shuffle,
  RefreshCw,
  Send,
  Info,
} from 'lucide-react';

interface CandidatePredictionSectionProps {
  metadata: MetadataInfo;
}

export const CandidatePredictionSection: React.FC<CandidatePredictionSectionProps> = ({
  metadata,
}) => {
  const [role, setRole] = useState<string>(metadata.roles[0] || 'Software Engineer');
  const [resume, setResume] = useState<string>(
    'Proficient in Python, React, TypeScript, machine learning pipelines, and cloud backend architecture with 5 years experience designing scalable web services.'
  );
  const [skills, setSkills] = useState<string>('Python, TypeScript, React, SQL, scikit-learn');
  const [jd, setJd] = useState<string>(
    metadata.role_jds[metadata.roles[0] || 'Software Engineer'] ||
      'Design, develop, test, deploy, maintain, and enhance scalable software solutions.'
  );
  const [selectedModel, setSelectedModel] = useState<string>('Random Forest');

  // Demographic attributes for optional segregated counterfactual audit
  const [demoOn, setDemoOn] = useState<boolean>(true);
  const [age, setAge] = useState<number>(32);
  const [gender, setGender] = useState<string>('Female');
  const [race, setRace] = useState<string>('Asian');
  const [ethnicity, setEthnicity] = useState<string>('Not Hispanic or Latino');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [exampleIdx, setExampleIdx] = useState<number>(0);

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setRole(selected);
    const standardJd = metadata.role_jds[selected];
    if (standardJd) {
      setJd(standardJd);
    } else {
      try {
        const res = await fetchRoleJobDescription(selected);
        if (res.job_description) setJd(res.job_description);
      } catch (err) {
        console.error('Error fetching role JD:', err);
      }
    }
  };

  const handleLoadExample = async () => {
    setIsLoading(true);
    try {
      const nextIdx = exampleIdx + 1;
      setExampleIdx(nextIdx);
      const ex = await fetchExampleCandidate(nextIdx);
      setRole(ex.role);
      setResume(ex.resume);
      setSkills('Technical skills matching profile');
      setJd(ex.jd);
      setAge(ex.age);
      setGender(ex.gender);
      setRace(ex.race);
      setEthnicity(ex.ethnicity);
      setFormErrors([]);
    } catch (err) {
      console.error('Error loading candidate example:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];
    if (!role) errors.push('Please select a valid job role.');
    if (resume.trim().length < 25) {
      errors.push('Resume text must be at least 25 characters long.');
    }
    if (jd.trim().length < 25) {
      errors.push('Job description must be at least 25 characters long.');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await submitPrediction({
        cand_role: role,
        cand_resume: resume,
        cand_skills: skills,
        cand_jd: jd,
        cand_model: selectedModel,
        cand_demo_on: demoOn,
        cand_age: age,
        cand_gender: gender,
        cand_race: race,
        cand_eth: ethnicity,
      });
      setResult(res);
    } catch (err) {
      setFormErrors([(err as Error).message || 'Prediction failed. Check backend connection.']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Candidate Evaluation & Real-Time Scoring
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Test candidate credentials against the trained scikit-learn pipeline with optional counterfactual bias audit.
          </p>
        </div>

        <button
          onClick={handleLoadExample}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5 text-blue-600" />
          <span>Load Random Test Candidate</span>
        </button>
      </div>

      {/* Main Grid: Form on Left, Live Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSubmit} className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Candidate Information & Job Requisition
              </h3>
              <span className="text-xs text-slate-400">Step 1 of 2</span>
            </div>

            {formErrors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                {formErrors.map((err, idx) => (
                  <div key={idx} className="text-xs font-medium text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Role & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Target Job Role
                </label>
                <select
                  value={role}
                  onChange={handleRoleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                >
                  {metadata.roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Trained ML Architecture
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                >
                  {metadata.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resume Text */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Candidate Resume Text (Model Input)
                </label>
                <span className="text-[11px] text-slate-400">Min 25 chars</span>
              </div>
              <textarea
                rows={4}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Enter candidate professional summary, projects, and work history..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600 resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Additional Skills */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Key Skills / Technologies
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Comma-separated skills (e.g. Python, SQL, AWS)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Job Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Job Description Text
                </label>
                <span className="text-[11px] text-slate-400">Benchmark description</span>
              </div>
              <textarea
                rows={3}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Role requirements and job description..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-600 resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Optional Counterfactual Demographic Audit Panel */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Segregated Demographic Audit (Counterfactual Evaluation)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoOn}
                    onChange={(e) => setDemoOn(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {demoOn && (
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    Note: The standard prediction completely excludes these fields. When enabled, the audit pipeline tests whether the model assigns different probabilities to the identical resume under Male vs Female demographic labels.
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs"
                      >
                        {metadata.genders.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700">Age ({age})</label>
                      <input
                        type="number"
                        min={18}
                        max={70}
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value) || 30)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700">Race</label>
                      <select
                        value={race}
                        onChange={(e) => setRace(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs"
                      >
                        {metadata.races.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700">Ethnicity</label>
                      <select
                        value={ethnicity}
                        onChange={(e) => setEthnicity(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs"
                      >
                        {metadata.ethnicities.map((eth) => (
                          <option key={eth} value={eth}>
                            {eth}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Model Inference...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Run Fairness Prediction & Audit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Results Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {result ? (
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">
                  Model Prediction Output
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {result.model}
                </span>
              </div>

              {/* Outcome Badge & Probability */}
              <div className="space-y-3">
                <div className={`p-4 rounded-xl border text-center space-y-1 ${
                  result.pred === 1
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}>
                  <div className="text-xs font-semibold text-slate-500">
                    Standard Pipeline Decision
                  </div>
                  <div className="text-2xl font-bold tracking-tight">
                    {result.label}
                  </div>
                  <div className="text-xs text-slate-600 font-mono tabular-nums">
                    Match Confidence: {(result.probability * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Reject (0.0)</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {(result.probability * 100).toFixed(1)}%
                    </span>
                    <span>Best Match (1.0)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.probability >= 0.5 ? 'bg-emerald-600' : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.max(5, result.probability * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Model Context Note */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between text-slate-800 font-semibold">
                  <span>Model Baseline Reliability</span>
                  <span className="font-mono tabular-nums">
                    {(result.test_accuracy * 100).toFixed(1)}% Test Acc
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  The standard model operates near chance level because historical recruitment labels contain negligible signal from qualification texts.
                </p>
              </div>

              {/* Explainable AI (XAI): Individual Prediction Explanation */}
              {result.explanation && (
                <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Individual Prediction Explanation (Local XAI)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Attribution Method: <strong className="text-slate-800">{result.explanation.method_short}</strong>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      {result.explanation.total_active_features} Active Features
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Shows which specific features present in this candidate's profile pushed the predicted probability toward Best Match (<span className="text-emerald-700 font-semibold">+</span>) or toward Rejection (<span className="text-rose-700 font-semibold">-</span>).
                  </p>

                  {/* Top Local Feature Drivers */}
                  <div className="space-y-2 pt-1">
                    {result.explanation.top_features.map((item, idx) => {
                      const isPositive = item.direction === 'positive';
                      const impactDisplay = (Math.abs(item.impact) * 100).toFixed(2);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border text-xs space-y-1 transition-colors bg-slate-50 border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900 truncate pr-2">
                              {item.feature}
                            </span>
                            <span
                              className={`font-mono font-bold shrink-0 ${
                                isPositive ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isPositive ? `+${impactDisplay}%` : `-${impactDisplay}%`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Category: {item.category}</span>
                            <span className={isPositive ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                              {isPositive ? 'Pushes toward Selection ↑' : 'Pushes toward Rejection ↓'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Local vs Global Distinction & Causation Notice */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Global vs. Local Distinction</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      {result.explanation.global_vs_local_note}
                    </p>
                    <div className="pt-1 text-amber-800 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{result.explanation.causation_notice}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Skills Detection Check */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Role Benchmark Skills Detected ({result.found_skills.length} of {result.known_skills_count})
                </div>
                {result.found_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.found_skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    No standardized skills for this role were identified in the resume text.
                  </div>
                )}
              </div>

              {/* Counterfactual Audit Result (if enabled) */}
              {result.audit_demo && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Counterfactual Audit Evaluation</span>
                    </span>
                    <span className="text-[11px] font-mono text-indigo-900 font-bold">
                      Gap: {(result.audit_demo.gap * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-center">
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                      <div className="text-slate-500 text-[11px]">Female Score</div>
                      <div className="text-base font-bold text-blue-700 font-mono tabular-nums mt-0.5">
                        {(result.audit_demo.cf.Female * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                      <div className="text-slate-500 text-[11px]">Male Score</div>
                      <div className="text-base font-bold text-slate-800 font-mono tabular-nums mt-0.5">
                        {(result.audit_demo.cf.Male * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {result.audit_demo.cohort_rate !== null && (
                    <div className="text-[11px] text-slate-600">
                      Historical cohort rate for {gender} {role}s in dataset:{' '}
                      <strong className="font-mono tabular-nums text-slate-900">
                        {(result.audit_demo.cohort_rate * 100).toFixed(1)}%
                      </strong>{' '}
                      (n = {result.audit_demo.cohort_size})
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory Governance Disclaimer */}
              <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Decision-Support Disclaimer</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  {result.disclaimer}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-xs text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Awaiting Candidate Evaluation</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Fill in the candidate credentials on the left or click "Load Random Test Candidate" to run live machine learning inference.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
