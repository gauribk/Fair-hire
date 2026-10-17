export type NavigationTab = 
  | 'overview' 
  | 'dataset' 
  | 'models' 
  | 'fairness' 
  | 'mitigation'
  | 'features' 
  | 'prediction';

export interface ColumnInfo {
  name: string;
  role: string;
  type: string;
  missing: number;
  unique: number;
}

export interface DistributionMetric {
  rate: number;
  count: number;
}

export interface RoleGap {
  role: string;
  Female: number;
  Male: number;
  Gap: number;
}

export interface ModelMetrics {
  Accuracy: number;
  Precision: number;
  Recall: number;
  'F1-score': number;
  confusion_matrix: number[][]; // [[TN, FP], [FN, TP]]
}

export interface ModelSummaryItem {
  setup: 'standard' | 'audit';
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  pred_rate: number;
  cm: number[][];
}

export interface OverviewData {
  total_applicants: number;
  train_size: number;
  test_size: number;
  best_match_pct: number;
  best_match_mean: number;
  gender_counts: Record<string, number>;
  gender_rates: Record<string, number>;
  age_group_counts: Record<string, number>;
  target_counts: Record<string, number>;
  best_std_acc: number;
  best_aud_acc: number;
  fem_favored: number;
  male_favored: number;
  neutral_roles: number;
  total_roles: number;
  std_models: Record<string, {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    pred_rate: number;
  }>;
  aud_models: Record<string, {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    pred_rate: number;
  }>;
}

export interface DatasetData {
  total_rows: number;
  filtered_total: number;
  columns_info: ColumnInfo[];
  sample_rows: Array<{
    Age: number;
    Gender: string;
    Race: string;
    Ethnicity: string;
    'Job Roles': string;
    Resume: string;
    'Job Description': string;
    'Best Match': number;
  }>;
  page: number;
  per_page: number;
  total_pages: number;
  gender_dist: Record<string, DistributionMetric>;
  race_dist: Record<string, DistributionMetric>;
  eth_dist: Record<string, DistributionMetric>;
  age_dist: Record<string, DistributionMetric>;
  role_gaps: RoleGap[];
  overall_rate: number;
  missing_count: number;
  duplicate_count: number;
}

export interface FairnessGroupRecord {
  group: string;
  applicants: number;
  actual_rate: number;
  pred_rate: number;
  accuracy: number;
  tpr: number | null;
  fpr: number | null;
  small_group: string;
}

export interface FairnessSummary {
  'Selection-rate gap (max-min)': number;
  'Disparate-impact ratio (min/max)': number;
  'Demographic Parity Difference': number;
  'True-positive-rate gap (max-min)': number;
  'Actual-rate gap (max-min)': number;
}

export interface ModelFairnessComp {
  model: string;
  accuracy: number;
  pred_rate_gap: number;
  di_ratio: number;
  tpr_gap: number;
  actual_gap: number;
}

export interface AttributeSummary {
  di_ratio: number;
  parity_diff: number;
  tpr_gap: number;
  actual_gap: number;
  groups_count: number;
}

export interface FairnessData {
  setup: 'standard' | 'audit';
  selected_model: string;
  attr_label: string;
  group_col: string;
  table_records: FairnessGroupRecord[];
  summary: FairnessSummary;
  model_comp: ModelFairnessComp[];
  all_attr_summaries: Record<string, AttributeSummary>;
  test_size: number;
  model_acc: number;
}

export interface PermutationImportanceItem {
  Input: string;
  drop: number;
}

export interface TopFeatureItem {
  Feature: string;
  RawFeature?: string;
  Category?: string;
  Importance: number;
}

export interface FeaturesData {
  setup: 'standard' | 'audit';
  selected_model: string;
  perm_imp: PermutationImportanceItem[];
  top_features: TopFeatureItem[];
  global_vs_local_explanation?: string;
  causation_disclaimer?: string;
}

export interface CandidateLocalFeature {
  feature: string;
  raw_feature: string;
  category: string;
  value: number;
  impact: number;
  direction: 'positive' | 'negative';
  magnitude: number;
}

export interface CandidateExplanation {
  method: string;
  method_short: string;
  base_probability: number;
  total_active_features: number;
  top_features: CandidateLocalFeature[];
  positive_count: number;
  negative_count: number;
  causation_notice: string;
  global_vs_local_note: string;
}

export interface PredictionResult {
  success: boolean;
  model: string;
  pred: number;
  label: string;
  probability: number;
  test_accuracy: number;
  found_skills: string[];
  known_skills_count: number;
  warnings: string[];
  disclaimer: string;
  explanation?: CandidateExplanation;
  audit_demo?: {
    demo: {
      Gender: string;
      Race: string;
      Ethnicity: string;
      Age: number;
    };
    cf: {
      Female: number;
      Male: number;
    };
    cohort_size: number;
    cohort_rate: number | null;
    gap: number;
    aud_explanation?: CandidateExplanation;
  } | null;
  errors?: string[];
}

export interface MetadataInfo {
  roles: string[];
  role_jds: Record<string, string>;
  races: string[];
  ethnicities: string[];
  genders: string[];
  models: string[];
  age_bins: string[];
}

export interface ServerStatus {
  ready: boolean;
  status: 'initializing' | 'ready' | 'error';
  total_records?: number;
  message?: string;
  error?: string | null;
}

export interface GroupMitigationMetric {
  group: string;
  testCount: number;
  trainCount: number;
  actualRate: number;
  baselineRate: number;
  mitigatedRate: number;
  baselineTpr: number | null;
  mitigatedTpr: number | null;
  baselineFpr: number | null;
  mitigatedFpr: number | null;
  baselineAccuracy: number;
  mitigatedAccuracy: number;
  fittedThreshold: number;
  sampleWeightPos: number;
  sampleWeightNeg: number;
  smallGroup: boolean;
}

export interface ModelOverallMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  selectionRate: number;
  demographicParityDiff: number;
  disparateImpactRatio: number;
  tprGap: number;
  confusionMatrix: number[][]; // [[TN, FP], [FN, TP]]
  adverseImpact: boolean;
}

export interface SampleReweightingRecord {
  group: string;
  target: number; // 0 or 1
  labelName: string;
  count: number;
  expectedCount: number;
  weight: number;
}

export interface MitigationData {
  attribute: string;
  setup: 'standard' | 'audit';
  model: string;
  strategy: 'demographic_parity' | 'equal_opportunity';
  trainSize: number;
  testSize: number;
  baseline: ModelOverallMetrics;
  mitigated: ModelOverallMetrics;
  groupMetrics: GroupMitigationMetric[];
  reweightingTable: SampleReweightingRecord[];
  tradeoffSummary: {
    accuracyDelta: number;
    f1Delta: number;
    disparityReduction: number;
    dirImprovement: number;
    tprGapReduction: number;
    verdict: string;
  };
  methodologyNote: {
    title: string;
    description: string;
    architectureLimitation: string;
    protocol: string;
  };
}
