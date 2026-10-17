import {
  ServerStatus,
  OverviewData,
  DatasetData,
  ModelSummaryItem,
  FairnessData,
  FeaturesData,
  PredictionResult,
  MetadataInfo,
  MitigationData,
} from './types';

const API_BASE = '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.errors && Array.isArray(errData.errors)) {
        errorMsg = errData.errors.join(', ');
      } else if (errData.message) {
        errorMsg = errData.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function checkServerStatus(): Promise<ServerStatus> {
  try {
    return await fetchJson<ServerStatus>('/api/status');
  } catch (err) {
    return {
      ready: false,
      status: 'error',
      message: (err as Error).message || 'Unable to connect to backend service.',
    };
  }
}

export async function fetchMetadata(): Promise<MetadataInfo> {
  return fetchJson<MetadataInfo>('/api/metadata');
}

export async function fetchOverview(): Promise<OverviewData> {
  return fetchJson<OverviewData>('/api/overview');
}

export async function fetchDataset(params: {
  page?: number;
  per_page?: number;
  role?: string;
  gender?: string;
  search?: string;
}): Promise<DatasetData> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.per_page) searchParams.set('per_page', String(params.per_page));
  if (params.role) searchParams.set('role', params.role);
  if (params.gender) searchParams.set('gender', params.gender);
  if (params.search) searchParams.set('search', params.search);

  return fetchJson<DatasetData>(`/api/dataset?${searchParams.toString()}`);
}

export async function fetchModels(): Promise<{
  test_size: number;
  train_size: number;
  summary_rows: ModelSummaryItem[];
}> {
  return fetchJson<{
    test_size: number;
    train_size: number;
    summary_rows: ModelSummaryItem[];
  }>('/api/models');
}

export async function fetchFairness(params: {
  setup: 'standard' | 'audit';
  model: string;
  attribute: string;
}): Promise<FairnessData> {
  const searchParams = new URLSearchParams({
    setup: params.setup,
    model: params.model,
    attribute: params.attribute,
  });
  return fetchJson<FairnessData>(`/api/fairness?${searchParams.toString()}`);
}

export async function fetchFeatures(params: {
  setup: 'standard' | 'audit';
  model: string;
}): Promise<FeaturesData> {
  const searchParams = new URLSearchParams({
    setup: params.setup,
    model: params.model,
  });
  return fetchJson<FeaturesData>(`/api/features?${searchParams.toString()}`);
}

export async function fetchMitigation(params: {
  attribute?: string;
  setup?: 'standard' | 'audit';
  model?: string;
  strategy?: 'demographic_parity' | 'equal_opportunity';
}): Promise<MitigationData> {
  const searchParams = new URLSearchParams();
  if (params.attribute) searchParams.set('attribute', params.attribute);
  if (params.setup) searchParams.set('setup', params.setup);
  if (params.model) searchParams.set('model', params.model);
  if (params.strategy) searchParams.set('strategy', params.strategy);
  return fetchJson<MitigationData>(`/api/mitigation?${searchParams.toString()}`);
}

export async function submitPrediction(payload: {
  cand_role: string;
  cand_resume: string;
  cand_skills: string;
  cand_jd: string;
  cand_model: string;
  cand_demo_on: boolean;
  cand_age: number;
  cand_gender: string;
  cand_race: string;
  cand_eth: string;
}): Promise<PredictionResult> {
  return fetchJson<PredictionResult>('/api/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchExampleCandidate(idx: number): Promise<{
  role: string;
  resume: string;
  jd: string;
  age: number;
  gender: string;
  race: string;
  ethnicity: string;
}> {
  return fetchJson(`/api/get_example_candidate?idx=${idx}`);
}

export async function fetchRoleJobDescription(role: string): Promise<{
  role: string;
  job_description: string;
}> {
  return fetchJson(`/api/get_role_jd?role=${encodeURIComponent(role)}`);
}
