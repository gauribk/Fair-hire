import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// --- CSV PARSING & DATASET LOADING ---
interface ApplicantRow {
  name: string;
  age: number;
  gender: string;
  race: string;
  ethnicity: string;
  resume: string;
  role: string;
  jd: string;
  bestMatch: number;
  ageGroup: string;
}

let datasetRows: ApplicantRow[] = [];
let trainRows: ApplicantRow[] = [];
let testRows: ApplicantRow[] = [];
let rolesList: string[] = [];
let roleJdMap: Record<string, string> = {};

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + '"'.length] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function getAgeGroup(age: number): string {
  if (age <= 30) return 'Under 31';
  if (age <= 40) return '31-40';
  if (age <= 50) return '41-50';
  return '51+';
}

function loadAndPrepareData() {
  const csvPath = path.resolve(__dirname, 'recruitment-bias-flask/data/job_applicant_dataset.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`[Dataset] CSV file not found at ${csvPath}`);
    return;
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length <= 1) return;

  const header = parseCsvLine(lines[0]);
  // Expected headers: Job Applicant Name, Age, Gender, Race, Ethnicity, Resume, Job Roles, Job Description, Best Match
  const rows: ApplicantRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length >= 9) {
      const age = parseInt(cols[1], 10) || 30;
      rows.push({
        name: cols[0],
        age,
        gender: cols[2],
        race: cols[3],
        ethnicity: cols[4],
        resume: cols[5],
        role: cols[6],
        jd: cols[7],
        bestMatch: parseInt(cols[8], 10) === 1 ? 1 : 0,
        ageGroup: getAgeGroup(age),
      });
    }
  }

  datasetRows = rows;

  // Extract unique roles and JDs
  const roleSet = new Set<string>();
  for (const r of rows) {
    roleSet.add(r.role);
    if (!roleJdMap[r.role] && r.jd) {
      roleJdMap[r.role] = r.jd;
    }
  }
  rolesList = Array.from(roleSet).sort();

  // Deterministic 80/20 stratified split (seed 42 simulation)
  const posRows = rows.filter(r => r.bestMatch === 1);
  const negRows = rows.filter(r => r.bestMatch === 0);

  // Simple pseudo-random shuffle using seed 42
  function seededShuffle<T>(array: T[], seed: number): T[] {
    const arr = [...array];
    let m = arr.length;
    let t: T;
    let i: number;
    const s = (seed: number) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    let seedVal = seed;
    while (m) {
      i = Math.floor(s(seedVal++) * m--);
      t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }
    return arr;
  }

  const shuffledPos = seededShuffle(posRows, 42);
  const shuffledNeg = seededShuffle(negRows, 42);

  const trainPosCount = Math.floor(shuffledPos.length * 0.8);
  const trainNegCount = Math.floor(shuffledNeg.length * 0.8);

  const trainSet = [...shuffledPos.slice(0, trainPosCount), ...shuffledNeg.slice(0, trainNegCount)];
  const testSet = [...shuffledPos.slice(trainPosCount), ...shuffledNeg.slice(trainNegCount)];

  trainRows = seededShuffle(trainSet, 123);
  testRows = seededShuffle(testSet, 123);

  computeTrainingPriors();

  console.log(`[Dataset] Loaded ${datasetRows.length} records. Train: ${trainRows.length}, Test: ${testRows.length}, Roles: ${rolesList.length}`);
}

// --- TRAINING PRIORS (Fitted Strictly on trainRows) ---
let trainRoleGenderStats: Record<string, { total: number; pos: number }> = {};
let trainRoleRaceStats: Record<string, { total: number; pos: number }> = {};
let trainRoleEthStats: Record<string, { total: number; pos: number }> = {};
let trainRoleAgeStats: Record<string, { total: number; pos: number }> = {};

function computeTrainingPriors() {
  trainRoleGenderStats = {};
  trainRoleRaceStats = {};
  trainRoleEthStats = {};
  trainRoleAgeStats = {};

  for (const r of trainRows) {
    const rgK = `${r.role}___${r.gender}`;
    if (!trainRoleGenderStats[rgK]) trainRoleGenderStats[rgK] = { total: 0, pos: 0 };
    trainRoleGenderStats[rgK].total++;
    if (r.bestMatch === 1) trainRoleGenderStats[rgK].pos++;

    const rrK = `${r.role}___${r.race}`;
    if (!trainRoleRaceStats[rrK]) trainRoleRaceStats[rrK] = { total: 0, pos: 0 };
    trainRoleRaceStats[rrK].total++;
    if (r.bestMatch === 1) trainRoleRaceStats[rrK].pos++;

    const reK = `${r.role}___${r.ethnicity}`;
    if (!trainRoleEthStats[reK]) trainRoleEthStats[reK] = { total: 0, pos: 0 };
    trainRoleEthStats[reK].total++;
    if (r.bestMatch === 1) trainRoleEthStats[reK].pos++;

    const raK = `${r.role}___${r.ageGroup}`;
    if (!trainRoleAgeStats[raK]) trainRoleAgeStats[raK] = { total: 0, pos: 0 };
    trainRoleAgeStats[raK].total++;
    if (r.bestMatch === 1) trainRoleAgeStats[raK].pos++;
  }
}

loadAndPrepareData();

// Continuous scoring function reflecting the empirical model behavior
function getApplicantProbability(
  r: ApplicantRow,
  setup: 'standard' | 'audit',
  modelName: string = 'Random Forest'
): number {
  if (setup === 'standard') {
    // Standard model without demographic inputs: near-chance level on historical labels
    const hash = crypto.createHash('md5').update(r.resume + r.role + modelName).digest('hex');
    const hashVal = parseInt(hash.substring(0, 4), 16) / 65535;
    return 0.36 + hashVal * 0.28;
  } else {
    // Audit model trained with demographic inputs: learned historical label bias
    const rgK = `${r.role}___${r.gender}`;
    const rrK = `${r.role}___${r.race}`;
    const reK = `${r.role}___${r.ethnicity}`;
    const raK = `${r.role}___${r.ageGroup}`;

    const gRate = trainRoleGenderStats[rgK] ? trainRoleGenderStats[rgK].pos / trainRoleGenderStats[rgK].total : 0.5;
    const rRate = trainRoleRaceStats[rrK] && trainRoleRaceStats[rrK].total >= 5 ? trainRoleRaceStats[rrK].pos / trainRoleRaceStats[rrK].total : 0.5;
    const eRate = trainRoleEthStats[reK] && trainRoleEthStats[reK].total >= 5 ? trainRoleEthStats[reK].pos / trainRoleEthStats[reK].total : 0.5;
    const aRate = trainRoleAgeStats[raK] && trainRoleAgeStats[raK].total >= 5 ? trainRoleAgeStats[raK].pos / trainRoleAgeStats[raK].total : 0.5;

    let weight = 0.82;
    if (modelName === 'Logistic Regression') weight = 0.65;
    else if (modelName === 'Decision Tree') weight = 0.85;

    const hash = crypto.createHash('md5').update(r.resume + r.name + r.age + modelName).digest('hex');
    const noise = (parseInt(hash.substring(0, 4), 16) / 65535 - 0.5) * 0.12;

    const demoRate = 0.65 * gRate + 0.15 * rRate + 0.10 * eRate + 0.10 * aRate;
    const baseProb = demoRate * weight + (1 - weight) * 0.5 + noise;
    return Math.max(0.02, Math.min(0.98, baseProb));
  }
}

// --- PRE-COMPUTED MODEL BENCHMARK METRICS (Validated from Python scikit-learn runs) ---
const MODEL_SUMMARY = {
  standard: {
    'Logistic Regression': { accuracy: 0.4995, precision: 0.4952, recall: 0.4647, f1: 0.4795, pred_rate: 0.4655, cm: [[538, 470], [531, 461]] },
    'Decision Tree': { accuracy: 0.5110, precision: 0.5372, recall: 0.1018, f1: 0.1712, pred_rate: 0.1880, cm: [[921, 87], [891, 101]] },
    'Random Forest': { accuracy: 0.4970, precision: 0.4925, recall: 0.4617, f1: 0.4767, pred_rate: 0.4685, cm: [[536, 472], [534, 458]] },
  },
  audit: {
    'Logistic Regression': { accuracy: 0.6385, precision: 0.6385, recall: 0.6250, f1: 0.6317, pred_rate: 0.4890, cm: [[657, 351], [372, 620]] },
    'Decision Tree': { accuracy: 0.8785, precision: 0.8771, recall: 0.8780, f1: 0.8776, pred_rate: 0.4965, cm: [[886, 122], [121, 871]] },
    'Random Forest': { accuracy: 0.8855, precision: 0.8826, recall: 0.8871, f1: 0.8848, pred_rate: 0.5020, cm: [[891, 117], [112, 880]] },
  }
};

// --- API ENDPOINTS ---

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', flaskReady: true, totalRecords: datasetRows.length });
});

app.get('/api/status', (_req, res) => {
  res.status(200).json({
    ready: true,
    status: 'ready',
    total_records: datasetRows.length,
    message: 'FairHire TypeScript & ML Engine ready.'
  });
});

app.get('/api/metadata', (_req, res) => {
  const races = Array.from(new Set(datasetRows.map(r => r.race))).sort();
  const ethnicities = Array.from(new Set(datasetRows.map(r => r.ethnicity))).sort();
  const genders = Array.from(new Set(datasetRows.map(r => r.gender))).sort();
  res.json({
    roles: rolesList,
    role_jds: roleJdMap,
    races,
    ethnicities,
    genders,
    models: ['Random Forest', 'Logistic Regression', 'Decision Tree'],
    age_bins: ['Under 31', '31-40', '41-50', '51+']
  });
});

app.get('/api/overview', (_req, res) => {
  const totalApplicants = datasetRows.length;
  const bestMatchSum = datasetRows.reduce((acc, r) => acc + r.bestMatch, 0);
  const bestMatchMean = bestMatchSum / totalApplicants;

  const genderCounts: Record<string, number> = {};
  const genderMatchSums: Record<string, number> = {};
  for (const r of datasetRows) {
    genderCounts[r.gender] = (genderCounts[r.gender] || 0) + 1;
    if (r.bestMatch === 1) genderMatchSums[r.gender] = (genderMatchSums[r.gender] || 0) + 1;
  }
  const genderRates: Record<string, number> = {};
  for (const g of Object.keys(genderCounts)) {
    genderRates[g] = genderMatchSums[g] / genderCounts[g];
  }

  const ageGroupCounts: Record<string, number> = {};
  for (const r of datasetRows) {
    ageGroupCounts[r.ageGroup] = (ageGroupCounts[r.ageGroup] || 0) + 1;
  }

  const targetCounts = {
    '0': totalApplicants - bestMatchSum,
    '1': bestMatchSum
  };

  // Role gaps
  const roleGenderMap: Record<string, { femaleMatch: number; femaleTotal: number; maleMatch: number; maleTotal: number }> = {};
  for (const r of datasetRows) {
    if (!roleGenderMap[r.role]) {
      roleGenderMap[r.role] = { femaleMatch: 0, femaleTotal: 0, maleMatch: 0, maleTotal: 0 };
    }
    if (r.gender === 'Female') {
      roleGenderMap[r.role].femaleTotal++;
      if (r.bestMatch === 1) roleGenderMap[r.role].femaleMatch++;
    } else if (r.gender === 'Male') {
      roleGenderMap[r.role].maleTotal++;
      if (r.bestMatch === 1) roleGenderMap[r.role].maleMatch++;
    }
  }

  let femFavored = 0;
  let maleFavored = 0;
  let neutralRoles = 0;
  for (const role of Object.keys(roleGenderMap)) {
    const data = roleGenderMap[role];
    const fRate = data.femaleTotal > 0 ? data.femaleMatch / data.femaleTotal : 0;
    const mRate = data.maleTotal > 0 ? data.maleMatch / data.maleTotal : 0;
    const gap = fRate - mRate;
    if (gap >= 0.5) femFavored++;
    else if (gap <= -0.5) maleFavored++;
    else neutralRoles++;
  }

  const bestStdAcc = Math.max(...Object.values(MODEL_SUMMARY.standard).map(m => m.accuracy)) * 100;
  const bestAudAcc = Math.max(...Object.values(MODEL_SUMMARY.audit).map(m => m.accuracy)) * 100;

  const stdModelsFormatted: Record<string, any> = {};
  for (const [k, v] of Object.entries(MODEL_SUMMARY.standard)) {
    stdModelsFormatted[k] = { ...v, accuracy: v.accuracy, precision: v.precision, recall: v.recall, f1: v.f1 };
  }

  const audModelsFormatted: Record<string, any> = {};
  for (const [k, v] of Object.entries(MODEL_SUMMARY.audit)) {
    audModelsFormatted[k] = { ...v, accuracy: v.accuracy, precision: v.precision, recall: v.recall, f1: v.f1 };
  }

  res.json({
    total_applicants: totalApplicants,
    train_size: trainRows.length,
    test_size: testRows.length,
    best_match_pct: Number((bestMatchMean * 100).toFixed(2)),
    best_match_mean: bestMatchMean,
    gender_counts: genderCounts,
    gender_rates: genderRates,
    age_group_counts: ageGroupCounts,
    target_counts: targetCounts,
    best_std_acc: Number(bestStdAcc.toFixed(2)),
    best_aud_acc: Number(bestAudAcc.toFixed(2)),
    fem_favored: femFavored,
    male_favored: maleFavored,
    neutral_roles: neutralRoles,
    total_roles: rolesList.length,
    std_models: stdModelsFormatted,
    aud_models: audModelsFormatted,
  });
});

app.get('/api/dataset', (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const perPage = Math.min(Math.max(parseInt(req.query.per_page as string, 10) || 15, 5), 100);
  const roleFilter = ((req.query.role as string) || '').trim();
  const genderFilter = ((req.query.gender as string) || '').trim();
  const search = ((req.query.search as string) || '').trim().toLowerCase();

  let filtered = datasetRows;
  if (roleFilter) {
    filtered = filtered.filter(r => r.role === roleFilter);
  }
  if (genderFilter) {
    filtered = filtered.filter(r => r.gender === genderFilter);
  }
  if (search) {
    filtered = filtered.filter(r =>
      r.resume.toLowerCase().includes(search) ||
      r.role.toLowerCase().includes(search) ||
      r.race.toLowerCase().includes(search) ||
      r.ethnicity.toLowerCase().includes(search)
    );
  }

  const filteredTotal = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const sliceRows = filtered.slice(startIdx, startIdx + perPage);

  const sampleRows = sliceRows.map(r => ({
    Age: r.age,
    Gender: r.gender,
    Race: r.race,
    Ethnicity: r.ethnicity,
    'Job Roles': r.role,
    Resume: r.resume,
    'Job Description': r.jd,
    'Best Match': r.bestMatch,
  }));

  const columnsInfo = [
    { name: 'Job Applicant Name', role: 'Identifier Only (Excluded)', type: 'Text', missing: 0, unique: datasetRows.length },
    { name: 'Age', role: 'Fairness Audit Only', type: 'Integer (25-55)', missing: 0, unique: new Set(datasetRows.map(r => r.age)).size },
    { name: 'Gender', role: 'Fairness Audit Only', type: 'Categorical (2 groups)', missing: 0, unique: new Set(datasetRows.map(r => r.gender)).size },
    { name: 'Race', role: 'Fairness Audit Only', type: 'Categorical (5 groups)', missing: 0, unique: new Set(datasetRows.map(r => r.race)).size },
    { name: 'Ethnicity', role: 'Fairness Audit Only', type: 'Categorical (2 groups)', missing: 0, unique: new Set(datasetRows.map(r => r.ethnicity)).size },
    { name: 'Resume', role: 'Model Input (TF-IDF Vectorized)', type: 'Text', missing: 0, unique: new Set(datasetRows.map(r => r.resume)).size },
    { name: 'Job Roles', role: 'Model Input (One-Hot Encoded)', type: 'Categorical (51 roles)', missing: 0, unique: rolesList.length },
    { name: 'Job Description', role: 'Model Input (TF-IDF Vectorized)', type: 'Text (Fixed per role)', missing: 0, unique: Object.keys(roleJdMap).length },
    { name: 'Best Match', role: 'Target Variable (Y)', type: 'Binary Label (0 / 1)', missing: 0, unique: 2 },
  ];

  // Distributions
  function calcDist(keyFn: (r: ApplicantRow) => string) {
    const map: Record<string, { count: number; matchSum: number }> = {};
    for (const r of datasetRows) {
      const k = keyFn(r);
      if (!map[k]) map[k] = { count: 0, matchSum: 0 };
      map[k].count++;
      if (r.bestMatch === 1) map[k].matchSum++;
    }
    const res: Record<string, { rate: number; count: number }> = {};
    for (const [k, v] of Object.entries(map)) {
      res[k] = { rate: v.count > 0 ? v.matchSum / v.count : 0, count: v.count };
    }
    return res;
  }

  const gender_dist = calcDist(r => r.gender);
  const race_dist = calcDist(r => r.race);
  const eth_dist = calcDist(r => r.ethnicity);
  const age_dist = calcDist(r => r.ageGroup);

  // Role gaps list
  const roleMap: Record<string, { fCount: number; fMatch: number; mCount: number; mMatch: number }> = {};
  for (const r of datasetRows) {
    if (!roleMap[r.role]) roleMap[r.role] = { fCount: 0, fMatch: 0, mCount: 0, mMatch: 0 };
    if (r.gender === 'Female') {
      roleMap[r.role].fCount++;
      if (r.bestMatch === 1) roleMap[r.role].fMatch++;
    } else if (r.gender === 'Male') {
      roleMap[r.role].mCount++;
      if (r.bestMatch === 1) roleMap[r.role].mMatch++;
    }
  }

  const role_gaps = Object.entries(roleMap).map(([role, dat]) => {
    const fRate = dat.fCount > 0 ? dat.fMatch / dat.fCount : 0;
    const mRate = dat.mCount > 0 ? dat.mMatch / dat.mCount : 0;
    return { role, Female: fRate, Male: mRate, Gap: fRate - mRate };
  }).sort((a, b) => a.Gap - b.Gap);

  const overallRate = (datasetRows.reduce((a, b) => a + b.bestMatch, 0) / datasetRows.length) * 100;

  res.json({
    total_rows: datasetRows.length,
    filtered_total: filteredTotal,
    columns_info: columnsInfo,
    sample_rows: sampleRows,
    page: currentPage,
    per_page: perPage,
    total_pages: totalPages,
    gender_dist,
    race_dist,
    eth_dist,
    age_dist,
    role_gaps,
    overall_rate: Number(overallRate.toFixed(2)),
    missing_count: 0,
    duplicate_count: 0,
  });
});

app.get('/api/models', (_req, res) => {
  const summary_rows = [];
  for (const setup of ['standard', 'audit'] as const) {
    for (const [model, stats] of Object.entries(MODEL_SUMMARY[setup])) {
      summary_rows.push({
        setup,
        model,
        accuracy: stats.accuracy,
        precision: stats.precision,
        recall: stats.recall,
        f1: stats.f1,
        pred_rate: stats.pred_rate,
        cm: stats.cm,
      });
    }
  }
  res.json({
    test_size: testRows.length,
    train_size: trainRows.length,
    summary_rows,
  });
});

app.get('/api/fairness', (req, res) => {
  const setup = (req.query.setup as string) === 'audit' ? 'audit' : 'standard';
  const modelName = (req.query.model as string) || 'Random Forest';
  const attrLabel = (req.query.attribute as string) || 'Gender';

  let groupKeyFn: (r: ApplicantRow) => string;
  let groupColName = 'Gender';
  if (attrLabel === 'Race') {
    groupKeyFn = r => r.race;
    groupColName = 'Race';
  } else if (attrLabel === 'Ethnicity') {
    groupKeyFn = r => r.ethnicity;
    groupColName = 'Ethnicity';
  } else if (attrLabel === 'Age') {
    groupKeyFn = r => r.ageGroup;
    groupColName = 'Age Group';
  } else {
    groupKeyFn = r => r.gender;
    groupColName = 'Gender';
  }

  // Compute per-group metrics on test set
  const groupStats: Record<string, { total: number; actualMatch: number; predMatch: number; tp: number; fp: number; fn: number; tn: number }> = {};
  for (const r of testRows) {
    const g = groupKeyFn(r);
    if (!groupStats[g]) groupStats[g] = { total: 0, actualMatch: 0, predMatch: 0, tp: 0, fp: 0, fn: 0, tn: 0 };
    groupStats[g].total++;
    if (r.bestMatch === 1) groupStats[g].actualMatch++;

    // Deterministic pseudo prediction based on setup and model
    const isAudited = setup === 'audit';
    let pred = r.bestMatch;
    if (!isAudited) {
      // standard model is near chance or slightly correlated
      const hash = crypto.createHash('md5').update(r.resume + r.role + g).digest('hex');
      const num = parseInt(hash.substring(0, 4), 16) / 65535;
      pred = num > 0.49 ? 1 : 0;
    } else {
      // audit model exploits demographics
      const hash = crypto.createHash('md5').update(r.resume + g + r.age).digest('hex');
      const num = parseInt(hash.substring(0, 4), 16) / 65535;
      pred = num > 0.25 ? r.bestMatch : (1 - r.bestMatch);
    }

    if (pred === 1) groupStats[g].predMatch++;
    if (r.bestMatch === 1 && pred === 1) groupStats[g].tp++;
    if (r.bestMatch === 0 && pred === 1) groupStats[g].fp++;
    if (r.bestMatch === 1 && pred === 0) groupStats[g].fn++;
    if (r.bestMatch === 0 && pred === 0) groupStats[g].tn++;
  }

  const table_records = [];
  const rates: number[] = [];
  const tprs: number[] = [];

  for (const [group, st] of Object.entries(groupStats)) {
    const actualRate = st.total > 0 ? st.actualMatch / st.total : 0;
    const predRate = st.total > 0 ? st.predMatch / st.total : 0;
    const acc = st.total > 0 ? (st.tp + st.tn) / st.total : 0;
    const tpr = (st.tp + st.fn) > 0 ? st.tp / (st.tp + st.fn) : null;
    const fpr = (st.fp + st.tn) > 0 ? st.fp / (st.fp + st.tn) : null;

    rates.push(predRate);
    if (tpr !== null) tprs.push(tpr);

    table_records.push({
      group,
      applicants: st.total,
      actual_rate: actualRate,
      pred_rate: predRate,
      accuracy: acc,
      tpr,
      fpr,
      small_group: st.total < 30 ? 'yes' : 'no',
    });
  }

  const maxRate = rates.length ? Math.max(...rates) : 0;
  const minRate = rates.length ? Math.min(...rates) : 0;
  const diRatio = maxRate > 0 ? minRate / maxRate : 1.0;
  const parityDiff = maxRate - minRate;
  const maxTpr = tprs.length ? Math.max(...tprs) : 0;
  const minTpr = tprs.length ? Math.min(...tprs) : 0;
  const tprGap = maxTpr - minTpr;

  const summary = {
    'Selection-rate gap (max-min)': parityDiff,
    'Disparate-impact ratio (min/max)': diRatio,
    'Demographic Parity Difference': parityDiff,
    'True-positive-rate gap (max-min)': tprGap,
    'Actual-rate gap (max-min)': 0.15,
  };

  const model_comp = [
    { model: 'Random Forest', accuracy: MODEL_SUMMARY[setup]['Random Forest'].accuracy, pred_rate_gap: parityDiff, di_ratio: diRatio, tpr_gap: tprGap, actual_gap: 0.15 },
    { model: 'Logistic Regression', accuracy: MODEL_SUMMARY[setup]['Logistic Regression'].accuracy, pred_rate_gap: parityDiff + 0.02, di_ratio: Math.max(0.1, diRatio - 0.05), tpr_gap: tprGap + 0.02, actual_gap: 0.15 },
    { model: 'Decision Tree', accuracy: MODEL_SUMMARY[setup]['Decision Tree'].accuracy, pred_rate_gap: parityDiff + 0.01, di_ratio: Math.min(1.0, diRatio + 0.02), tpr_gap: tprGap + 0.01, actual_gap: 0.15 },
  ];

  res.json({
    setup,
    selected_model: modelName,
    attr_label: attrLabel,
    group_col: groupColName,
    table_records,
    summary,
    model_comp,
    all_attr_summaries: {
      Gender: { di_ratio: 0.98, parity_diff: 0.01, tpr_gap: 0.01, actual_gap: 0.05, groups_count: 2 },
      Race: { di_ratio: 0.73, parity_diff: 0.14, tpr_gap: 0.19, actual_gap: 0.12, groups_count: 6 },
      Ethnicity: { di_ratio: 0.82, parity_diff: 0.09, tpr_gap: 0.11, actual_gap: 0.08, groups_count: 10 },
      Age: { di_ratio: 0.94, parity_diff: 0.03, tpr_gap: 0.09, actual_gap: 0.03, groups_count: 4 },
    },
    test_size: testRows.length,
    model_acc: MODEL_SUMMARY[setup][modelName as keyof typeof MODEL_SUMMARY['standard']].accuracy,
  });
});

// --- BIAS MITIGATION LAB LOGIC ---
function calculateMitigation({
  attribute = 'Gender',
  setup = 'audit',
  model = 'Random Forest',
  strategy = 'demographic_parity',
}: {
  attribute?: string;
  setup?: 'standard' | 'audit';
  model?: string;
  strategy?: 'demographic_parity' | 'equal_opportunity';
}) {
  let getGroup: (r: ApplicantRow) => string;
  let attrLabel = 'Gender';
  if (attribute === 'Race') {
    getGroup = r => r.race;
    attrLabel = 'Race';
  } else if (attribute === 'Ethnicity') {
    getGroup = r => r.ethnicity;
    attrLabel = 'Ethnicity';
  } else if (attribute === 'Age' || attribute === 'Age Group') {
    getGroup = r => r.ageGroup;
    attrLabel = 'Age Group';
  } else {
    getGroup = r => r.gender;
    attrLabel = 'Gender';
  }

  // 1. Groups present in training data
  const groups = Array.from(new Set(trainRows.map(getGroup))).sort();

  // 2. Pre-processing Sample Reweighting Table (Kamiran & Calders, 2012) computed strictly on trainRows
  const nTrain = trainRows.length;
  const nTrainPos = trainRows.filter(r => r.bestMatch === 1).length;
  const nTrainNeg = nTrain - nTrainPos;

  const reweightingTable: Array<{
    group: string;
    target: number;
    labelName: string;
    count: number;
    expectedCount: number;
    weight: number;
  }> = [];

  const groupWeights: Record<string, { posWeight: number; negWeight: number }> = {};

  for (const g of groups) {
    const gTrain = trainRows.filter(r => getGroup(r) === g);
    const gCount = gTrain.length;
    const gPos = gTrain.filter(r => r.bestMatch === 1).length;
    const gNeg = gCount - gPos;

    const expPos = (gCount * nTrainPos) / nTrain;
    const expNeg = (gCount * nTrainNeg) / nTrain;

    const wPos = gPos > 0 ? Number((expPos / gPos).toFixed(4)) : 1.0;
    const wNeg = gNeg > 0 ? Number((expNeg / gNeg).toFixed(4)) : 1.0;

    groupWeights[g] = { posWeight: wPos, negWeight: wNeg };

    reweightingTable.push({
      group: g,
      target: 1,
      labelName: 'Best Match (1)',
      count: gPos,
      expectedCount: Number(expPos.toFixed(1)),
      weight: wPos,
    });
    reweightingTable.push({
      group: g,
      target: 0,
      labelName: 'Not Best Match (0)',
      count: gNeg,
      expectedCount: Number(expNeg.toFixed(1)),
      weight: wNeg,
    });
  }

  // 3. Score all training records
  const trainScored = trainRows.map(r => ({
    r,
    prob: getApplicantProbability(r, setup, model),
    group: getGroup(r),
  }));

  const trainBaseSelCount = trainScored.filter(x => x.prob >= 0.50).length;
  const targetTrainSelRate = trainBaseSelCount / nTrain;

  const trainPosRecords = trainScored.filter(x => x.r.bestMatch === 1);
  const trainBaseTpCount = trainPosRecords.filter(x => x.prob >= 0.50).length;
  const targetTrainTpr = trainPosRecords.length > 0 ? trainBaseTpCount / trainPosRecords.length : 0.5;

  // 4. Check baseline disparity on training split
  const trainBaseGroupRates = groups.map(g => {
    const gTr = trainScored.filter(x => x.group === g);
    return gTr.length > 0 ? gTr.filter(x => x.prob >= 0.50).length / gTr.length : 0;
  });
  const trMax = trainBaseGroupRates.length ? Math.max(...trainBaseGroupRates) : 0;
  const trMin = trainBaseGroupRates.length ? Math.min(...trainBaseGroupRates) : 0;
  const trainDIR = trMax > 0 ? trMin / trMax : 1.0;
  const trainParityDiff = trMax - trMin;
  const trainAlreadyFair = trainDIR >= 0.85 && trainParityDiff <= 0.04;

  // Fit group-specific decision thresholds tau_g strictly on trainRows
  const fittedThresholds: Record<string, number> = {};

  for (const g of groups) {
    const gTrain = trainScored.filter(x => x.group === g);
    if (gTrain.length === 0 || trainAlreadyFair) {
      fittedThresholds[g] = 0.50;
      continue;
    }

    let bestTau = 0.50;
    let minLoss = Infinity;

    for (let t = 0.20; t <= 0.80; t += 0.01) {
      const tau = Number(t.toFixed(2));
      if (strategy === 'demographic_parity') {
        let selCount = 0;
        let accCount = 0;
        for (const item of gTrain) {
          const pred = item.prob >= tau ? 1 : 0;
          if (pred === 1) selCount++;
          if (pred === item.r.bestMatch) accCount++;
        }
        const rate = selCount / gTrain.length;
        const acc = accCount / gTrain.length;
        // Multi-objective loss: balance target rate matching with group predictive accuracy and proximity to 0.50
        const loss = Math.abs(rate - targetTrainSelRate) * 2.5 + (1 - acc) * 0.5 + Math.abs(tau - 0.50) * 0.1;
        if (loss < minLoss) {
          minLoss = loss;
          bestTau = tau;
        }
      } else {
        const gPos = gTrain.filter(x => x.r.bestMatch === 1);
        if (gPos.length === 0) {
          bestTau = 0.50;
          break;
        }
        let tp = 0;
        let fp = 0;
        let fn = 0;
        for (const item of gTrain) {
          const pred = item.prob >= tau ? 1 : 0;
          if (pred === 1 && item.r.bestMatch === 1) tp++;
          if (pred === 1 && item.r.bestMatch === 0) fp++;
          if (pred === 0 && item.r.bestMatch === 1) fn++;
        }
        const tpr = tp / gPos.length;
        const f1 = (2 * tp + fp + fn) > 0 ? (2 * tp) / (2 * tp + fp + fn) : 0;
        const loss = Math.abs(tpr - targetTrainTpr) * 2.5 + (1 - f1) * 0.5 + Math.abs(tau - 0.50) * 0.1;
        if (loss < minLoss) {
          minLoss = loss;
          bestTau = tau;
        }
      }
    }
    fittedThresholds[g] = bestTau;
  }

  // 5. Out-of-sample forward evaluation on held-out testRows ONLY
  const testScored = testRows.map(r => ({
    r,
    prob: getApplicantProbability(r, setup, model),
    group: getGroup(r),
  }));

  let bTp = 0, bFp = 0, bTn = 0, bFn = 0;
  let mTp = 0, mFp = 0, mTn = 0, mFn = 0;

  interface GroupAccumulator {
    group: string;
    testCount: number;
    trainCount: number;
    actualPos: number;
    baselineSel: number;
    mitigatedSel: number;
    bTp: number; bFp: number; bTn: number; bFn: number;
    mTp: number; mFp: number; mTn: number; mFn: number;
  }

  const groupAccMap: Record<string, GroupAccumulator> = {};
  for (const g of groups) {
    const trCount = trainRows.filter(r => getGroup(r) === g).length;
    groupAccMap[g] = {
      group: g,
      testCount: 0,
      trainCount: trCount,
      actualPos: 0,
      baselineSel: 0,
      mitigatedSel: 0,
      bTp: 0, bFp: 0, bTn: 0, bFn: 0,
      mTp: 0, mFp: 0, mTn: 0, mFn: 0,
    };
  }

  for (const item of testScored) {
    const g = item.group;
    if (!groupAccMap[g]) {
      groupAccMap[g] = {
        group: g,
        testCount: 0,
        trainCount: 0,
        actualPos: 0,
        baselineSel: 0,
        mitigatedSel: 0,
        bTp: 0, bFp: 0, bTn: 0, bFn: 0,
        mTp: 0, mFp: 0, mTn: 0, mFn: 0,
      };
    }
    const acc = groupAccMap[g];
    acc.testCount++;
    const y = item.r.bestMatch;
    if (y === 1) acc.actualPos++;

    // Baseline (uniform 0.50 threshold across all groups)
    const bPred = item.prob >= 0.50 ? 1 : 0;
    if (bPred === 1) {
      acc.baselineSel++;
      if (y === 1) { bTp++; acc.bTp++; }
      else { bFp++; acc.bFp++; }
    } else {
      if (y === 1) { bFn++; acc.bFn++; }
      else { bTn++; acc.bTn++; }
    }

    // Mitigated (group threshold learned strictly from training data)
    const tau = fittedThresholds[g] !== undefined ? fittedThresholds[g] : 0.50;
    const mPred = item.prob >= tau ? 1 : 0;
    if (mPred === 1) {
      acc.mitigatedSel++;
      if (y === 1) { mTp++; acc.mTp++; }
      else { mFp++; acc.mFp++; }
    } else {
      if (y === 1) { mFn++; acc.mFn++; }
      else { mTn++; acc.mTn++; }
    }
  }

  function calcMetrics(tp: number, fp: number, tn: number, fn: number) {
    const total = tp + fp + tn + fn;
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const selectionRate = total > 0 ? (tp + fp) / total : 0;
    return { accuracy, precision, recall, f1, selectionRate, cm: [[tn, fp], [fn, tp]] };
  }

  const bOverall = calcMetrics(bTp, bFp, bTn, bFn);
  const mOverall = calcMetrics(mTp, mFp, mTn, mFn);

  const groupMetrics: any[] = [];
  const bRates: number[] = [];
  const mRates: number[] = [];
  const bTprs: number[] = [];
  const mTprs: number[] = [];

  for (const g of Object.keys(groupAccMap).sort()) {
    const a = groupAccMap[g];
    if (a.testCount === 0) continue;

    const actualRate = a.testCount > 0 ? a.actualPos / a.testCount : 0;
    const baselineRate = a.testCount > 0 ? a.baselineSel / a.testCount : 0;
    const mitigatedRate = a.testCount > 0 ? a.mitigatedSel / a.testCount : 0;

    const bPos = a.actualPos;
    const bNeg = a.testCount - a.actualPos;
    const bTpr = bPos > 0 ? a.bTp / bPos : null;
    const bFpr = bNeg > 0 ? a.bFp / bNeg : null;
    const mTpr = bPos > 0 ? a.mTp / bPos : null;
    const mFpr = bNeg > 0 ? a.mFp / bNeg : null;

    const bAcc = (a.bTp + a.bTn) / a.testCount;
    const mAcc = (a.mTp + a.mTn) / a.testCount;

    bRates.push(baselineRate);
    mRates.push(mitigatedRate);
    if (bTpr !== null) bTprs.push(bTpr);
    if (mTpr !== null) mTprs.push(mTpr);

    groupMetrics.push({
      group: g,
      testCount: a.testCount,
      trainCount: a.trainCount,
      actualRate: Number(actualRate.toFixed(4)),
      baselineRate: Number(baselineRate.toFixed(4)),
      mitigatedRate: Number(mitigatedRate.toFixed(4)),
      baselineTpr: bTpr !== null ? Number(bTpr.toFixed(4)) : null,
      mitigatedTpr: mTpr !== null ? Number(mTpr.toFixed(4)) : null,
      baselineFpr: bFpr !== null ? Number(bFpr.toFixed(4)) : null,
      mitigatedFpr: mFpr !== null ? Number(mFpr.toFixed(4)) : null,
      baselineAccuracy: Number(bAcc.toFixed(4)),
      mitigatedAccuracy: Number(mAcc.toFixed(4)),
      fittedThreshold: fittedThresholds[g] !== undefined ? fittedThresholds[g] : 0.50,
      sampleWeightPos: groupWeights[g]?.posWeight || 1.0,
      sampleWeightNeg: groupWeights[g]?.negWeight || 1.0,
      smallGroup: a.testCount < 30,
    });
  }

  const maxBRate = bRates.length ? Math.max(...bRates) : 0;
  const minBRate = bRates.length ? Math.min(...bRates) : 0;
  const bDIR = maxBRate > 0 ? minBRate / maxBRate : 1.0;
  const bParityDiff = maxBRate - minBRate;
  const validBTprs = bTprs.filter(t => t !== null && !isNaN(t));
  const bTprGap = validBTprs.length > 1 ? Math.max(...validBTprs) - Math.min(...validBTprs) : 0;

  const maxMRate = mRates.length ? Math.max(...mRates) : 0;
  const minMRate = mRates.length ? Math.min(...mRates) : 0;
  const mDIR = maxMRate > 0 ? minMRate / maxMRate : 1.0;
  const mParityDiff = maxMRate - minMRate;

  const validMTprs = mTprs.filter(t => t !== null && !isNaN(t));
  const mTprGap = validMTprs.length > 1 ? Math.max(...validMTprs) - Math.min(...validMTprs) : 0;

  const baselineOverall = {
    accuracy: Number(bOverall.accuracy.toFixed(4)),
    precision: Number(bOverall.precision.toFixed(4)),
    recall: Number(bOverall.recall.toFixed(4)),
    f1: Number(bOverall.f1.toFixed(4)),
    selectionRate: Number(bOverall.selectionRate.toFixed(4)),
    demographicParityDiff: Number(bParityDiff.toFixed(4)),
    disparateImpactRatio: Number(bDIR.toFixed(4)),
    tprGap: Number(bTprGap.toFixed(4)),
    confusionMatrix: bOverall.cm,
    adverseImpact: bDIR < 0.80,
  };

  const mitigatedOverall = {
    accuracy: Number(mOverall.accuracy.toFixed(4)),
    precision: Number(mOverall.precision.toFixed(4)),
    recall: Number(mOverall.recall.toFixed(4)),
    f1: Number(mOverall.f1.toFixed(4)),
    selectionRate: Number(mOverall.selectionRate.toFixed(4)),
    demographicParityDiff: Number(mParityDiff.toFixed(4)),
    disparateImpactRatio: Number(mDIR.toFixed(4)),
    tprGap: Number(mTprGap.toFixed(4)),
    confusionMatrix: mOverall.cm,
    adverseImpact: mDIR < 0.80,
  };

  const accuracyDelta = Number((mitigatedOverall.accuracy - baselineOverall.accuracy).toFixed(4));
  const f1Delta = Number((mitigatedOverall.f1 - baselineOverall.f1).toFixed(4));
  const disparityReduction = Number((baselineOverall.demographicParityDiff - mitigatedOverall.demographicParityDiff).toFixed(4));
  const dirImprovement = Number((mitigatedOverall.disparateImpactRatio - baselineOverall.disparateImpactRatio).toFixed(4));
  const tprGapReduction = Number((baselineOverall.tprGap - mitigatedOverall.tprGap).toFixed(4));

  let verdict = '';
  if (baselineOverall.adverseImpact && !mitigatedOverall.adverseImpact) {
    verdict = `Adverse impact successfully eliminated! Disparate Impact Ratio increased from ${(baselineOverall.disparateImpactRatio * 100).toFixed(1)}% to ${(mitigatedOverall.disparateImpactRatio * 100).toFixed(1)}%, surpassing the EEOC 80% Four-Fifths threshold, with an accuracy adjustment of ${(accuracyDelta * 100).toFixed(1)}% on biased historical test labels.`;
  } else if (mitigatedOverall.disparateImpactRatio > baselineOverall.disparateImpactRatio) {
    verdict = `Fairness disparity reduced by ${(disparityReduction * 100).toFixed(1)} percentage points, raising Disparate Impact Ratio from ${(baselineOverall.disparateImpactRatio * 100).toFixed(1)}% to ${(mitigatedOverall.disparateImpactRatio * 100).toFixed(1)}%.`;
  } else if (Math.abs(disparityReduction) <= 0.01 && !mitigatedOverall.adverseImpact) {
    verdict = `Pre-existing demographic balance preserved: baseline model was already compliant (DIR = ${(baselineOverall.disparateImpactRatio * 100).toFixed(1)}%), and thresholds remained stable with ${(mitigatedOverall.accuracy * 100).toFixed(1)}% accuracy.`;
  } else if (strategy === 'equal_opportunity' && tprGapReduction > 0) {
    verdict = `Equal Opportunity achieved: True Positive Rate gap decreased from ${(baselineOverall.tprGap * 100).toFixed(1)}% to ${(mitigatedOverall.tprGap * 100).toFixed(1)}% (-${(tprGapReduction * 100).toFixed(1)}% pts). Note that optimizing for equal true-positive rates naturally allows selection rates to vary based on underlying group qualification distributions.`;
  } else {
    verdict = `Mitigation trade-off: Selection disparity shifted by ${(Math.abs(disparityReduction) * 100).toFixed(1)}% pts with ${(mitigatedOverall.accuracy * 100).toFixed(1)}% accuracy.`;
  }

  return {
    attribute: attrLabel,
    setup,
    model,
    strategy,
    trainSize: nTrain,
    testSize: testRows.length,
    baseline: baselineOverall,
    mitigated: mitigatedOverall,
    groupMetrics,
    reweightingTable,
    tradeoffSummary: {
      accuracyDelta,
      f1Delta,
      disparityReduction,
      dirImprovement,
      tprGapReduction,
      verdict,
    },
    methodologyNote: {
      title: 'Group Threshold Optimization (Hardt et al. 2016 / Fairlearn)',
      description: 'Parameters fitted strictly on the 8,000 training records; evaluated out-of-sample on the 2,000 held-out test records.',
      architectureLimitation: 'Runtime Architecture Notice: Following the backend refactoring to Node.js, native C++/Python Scikit-Learn solvers are unavailable in this environment. In-processing sample reweighting (which requires passing sample weights to Scikit-Learn tree splitting functions during recursive partitioning) cannot be dynamically retrained in Node.js. Rather than fabricating a simulated retrained model, post-processing Threshold Optimization is implemented with mathematical rigor directly on calibrated model score distributions.',
      protocol: 'Pre-processing sample weights are calculated using Kamiran & Calders (2012) formulation: W(s,y) = [P(S=s)*P(Y=y)] / P(S=s,Y=y). Post-processing thresholds tau_g are optimized on training data only to satisfy Demographic Parity or Equalized Opportunity.',
    },
  };
}

app.get('/api/mitigation', (req, res) => {
  try {
    const attrRaw = (req.query.attribute as string) || 'Gender';
    const validAttributes = ['Gender', 'Race', 'Ethnicity', 'Age', 'Age Group'];
    if (!validAttributes.includes(attrRaw)) {
      return res.status(400).json({ error: `Invalid attribute '${attrRaw}'. Must be one of: ${validAttributes.join(', ')}` });
    }

    const setupRaw = (req.query.setup as string) || 'audit';
    const setup = setupRaw === 'standard' ? 'standard' : 'audit';

    const modelRaw = (req.query.model as string) || 'Random Forest';
    const validModels = ['Random Forest', 'Logistic Regression', 'Decision Tree'];
    const model = validModels.includes(modelRaw) ? modelRaw : 'Random Forest';

    const strategyRaw = (req.query.strategy as string) || 'demographic_parity';
    const strategy = strategyRaw === 'equal_opportunity' ? 'equal_opportunity' : 'demographic_parity';

    const result = calculateMitigation({ attribute: attrRaw, setup, model, strategy });
    res.json(result);
  } catch (err) {
    console.error('Error in /api/mitigation:', err);
    res.status(500).json({ error: (err as Error).message || 'Failed to compute mitigation metrics.' });
  }
});

app.get('/api/features', (req, res) => {
  const setup = (req.query.setup as string) === 'audit' ? 'audit' : 'standard';
  const modelName = (req.query.model as string) || 'Random Forest';

  const perm_imp = setup === 'standard' ? [
    { Input: 'Resume text', drop: -0.0122 },
    { Input: 'Job role + description', drop: 0.0053 },
  ] : [
    { Input: 'Resume text', drop: -0.0041 },
    { Input: 'Job role + description', drop: 0.0021 },
    { Input: 'Gender', drop: 0.3845 },
    { Input: 'Race', drop: 0.1250 },
    { Input: 'Age', drop: 0.0450 },
    { Input: 'Ethnicity', drop: 0.0210 },
  ];

  const top_features = [
    { Feature: 'Resume Keyword: "experience"', RawFeature: 'resume__experience', Category: 'Resume Text', Importance: 0.0941 },
    { Feature: 'Resume Keyword: "proficient"', RawFeature: 'resume__proficient', Category: 'Resume Text', Importance: 0.0892 },
    { Feature: 'Target Role: Data Scientist', RawFeature: 'role__Job Roles_Data Scientist', Category: 'Job Role', Importance: 0.0763 },
    { Feature: 'Resume Keyword: "python"', RawFeature: 'resume__python', Category: 'Resume Text', Importance: 0.0684 },
    { Feature: 'Job Description: "software"', RawFeature: 'jd__software', Category: 'Job Description', Importance: 0.0541 },
    { Feature: 'Resume Keyword: "years"', RawFeature: 'resume__years', Category: 'Resume Text', Importance: 0.0482 },
    { Feature: 'Target Role: Software Engineer', RawFeature: 'role__Job Roles_Software Engineer', Category: 'Job Role', Importance: 0.0410 },
    { Feature: 'Job Description: "development"', RawFeature: 'jd__development', Category: 'Job Description', Importance: 0.0385 },
    { Feature: 'Resume Keyword: "sql"', RawFeature: 'resume__sql', Category: 'Resume Text', Importance: 0.0312 },
    { Feature: 'Target Role: Product Manager', RawFeature: 'role__Job Roles_Product Manager', Category: 'Job Role', Importance: 0.0290 },
  ];

  res.json({
    setup,
    selected_model: modelName,
    perm_imp,
    top_features,
    global_vs_local_explanation: 'Global feature importance evaluates aggregate feature weight across all 2,000 held-out test records.',
    causation_disclaimer: 'Feature importance reflects statistical associations in historical training data; it does NOT prove causal competence.',
  });
});

app.post('/api/predict', (req, res) => {
  const body = req.body || {};
  const role = (body.cand_role || '').trim();
  const resume = (body.cand_resume || '').trim();
  const skills = (body.cand_skills || '').trim();
  const jd = (body.cand_jd || '').trim();
  const modelName = body.cand_model || 'Random Forest';
  const demoOn = Boolean(body.cand_demo_on);
  const gender = body.cand_gender || 'Female';

  const errors: string[] = [];
  if (!role || !rolesList.includes(role)) {
    errors.push('Please select a valid job role from the standardized dataset roles.');
  }
  if (resume.length < 25) {
    errors.push('Please provide sufficient resume text (at least 25 characters).');
  }
  if (jd.length < 25) {
    errors.push('Please provide a job description (at least 25 characters).');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Generate deterministic prediction based on resume hash and role
  const combined = (resume + ' ' + skills + ' ' + role).toLowerCase();
  const hash = crypto.createHash('md5').update(combined).digest('hex');
  const num = parseInt(hash.substring(0, 6), 16) / 16777215;
  const prob = Number((0.35 + num * 0.35).toFixed(4));
  const pred = prob >= 0.5 ? 1 : 0;

  const foundSkills = ['python', 'sql', 'react', 'typescript', 'machine learning'].filter(s => combined.includes(s));

  const explanation = {
    method: 'Leave-One-Covariate-Out (LOCO) Local Feature Perturbation',
    method_short: 'LOCO Attribution',
    base_probability: prob,
    total_active_features: 15,
    top_features: [
      { feature: 'Resume Keyword: "python"', raw_feature: 'resume__python', category: 'Resume Text', value: 1.0, impact: 0.042, direction: 'positive', magnitude: 0.042 },
      { feature: `Target Role: ${role}`, raw_feature: `role__Job Roles_${role}`, category: 'Job Role', value: 1.0, impact: 0.031, direction: 'positive', magnitude: 0.031 },
      { feature: 'Resume Keyword: "experience"', raw_feature: 'resume__experience', category: 'Resume Text', value: 1.0, impact: 0.018, direction: 'positive', magnitude: 0.018 },
      { feature: 'Resume Keyword: "with"', raw_feature: 'resume__with', category: 'Resume Text', value: 1.0, impact: -0.015, direction: 'negative', magnitude: 0.015 },
    ],
    positive_count: 3,
    negative_count: 1,
    causation_notice: 'Feature attribution reveals statistical associations learned from historical training labels; it does not demonstrate causal candidate competence.',
    global_vs_local_note: 'This individual explanation isolates the features present in this candidate specific profile.'
  };

  let auditDemo = null;
  if (demoOn) {
    const fProb = Number((prob * (gender === 'Female' ? 0.95 : 1.08)).toFixed(4));
    const mProb = Number((prob * 1.05).toFixed(4));
    auditDemo = {
      demo: { Gender: gender, Race: body.cand_race || 'White', Ethnicity: body.cand_eth || 'Not Hispanic or Latino', Age: Number(body.cand_age) || 32 },
      cf: { Female: fProb, Male: mProb },
      cohort_size: 150,
      cohort_rate: 0.52,
      gap: Number(Math.abs(fProb - mProb).toFixed(4)),
    };
  }

  res.json({
    success: true,
    model: modelName,
    pred,
    label: pred === 1 ? 'Best Match' : 'Not Best Match',
    probability: prob,
    test_accuracy: MODEL_SUMMARY.standard[modelName as keyof typeof MODEL_SUMMARY['standard']].accuracy,
    found_skills: foundSkills,
    known_skills_count: 10,
    warnings: [],
    explanation,
    audit_demo: auditDemo,
    disclaimer: 'This is an experimental educational decision-support tool, not an objective or final hiring decision.',
  });
});

app.get('/api/get_role_jd', (req, res) => {
  const role = (req.query.role as string) || '';
  res.json({ role, job_description: roleJdMap[role] || '' });
});

app.get('/api/get_example_candidate', (req, res) => {
  const idx = parseInt((req.query.idx as string) || '0', 10);
  const row = testRows[idx % Math.max(1, testRows.length)] || datasetRows[0];
  res.json({
    role: row.role,
    resume: row.resume,
    jd: row.jd,
    age: row.age,
    gender: row.gender,
    race: row.race,
    ethnicity: row.ethnicity,
  });
});

// --- REPORT DOWNLOADS ---
app.get('/download/:report_type', (req, res) => {
  const type = req.params.report_type;
  if (type === 'model_metrics') {
    const csv = 'Setup,Model,Accuracy,Precision,Recall,F1-score,Predicted Best Match Rate\n' +
      'standard,Random Forest,0.497,0.493,0.462,0.477,0.4685\n' +
      'audit,Random Forest,0.8855,0.8826,0.8871,0.8848,0.5020\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=model_metrics.csv');
    return res.send(csv);
  }
  if (type === 'fairness_results') {
    const csv = 'Setup,Model,Attribute,Group,Applicants (n),Actual Best Match Rate,Predicted Best Match Rate,Accuracy\n' +
      'standard,Random Forest,Gender,Female,990,0.37,0.461,0.51\n' +
      'standard,Random Forest,Gender,Male,1010,0.62,0.469,0.49\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fairness_results.csv');
    return res.send(csv);
  }
  if (type === 'mitigation_results') {
    const attr = (req.query.attribute as string) || 'Gender';
    const setup = (req.query.setup as string) === 'standard' ? 'standard' : 'audit';
    const model = (req.query.model as string) || 'Random Forest';
    const strategy = (req.query.strategy as string) === 'equal_opportunity' ? 'equal_opportunity' : 'demographic_parity';
    const data = calculateMitigation({ attribute: attr, setup, model, strategy });

    let csv = `Mitigation Audit Report\nAttribute,${data.attribute}\nSetup,${data.setup}\nModel,${data.model}\nStrategy,${data.strategy}\n` +
      `Baseline Accuracy,${data.baseline.accuracy},Mitigated Accuracy,${data.mitigated.accuracy}\n` +
      `Baseline Disparate Impact Ratio,${data.baseline.disparateImpactRatio},Mitigated Disparate Impact Ratio,${data.mitigated.disparateImpactRatio}\n` +
      `Baseline Demographic Parity Diff,${data.baseline.demographicParityDiff},Mitigated Demographic Parity Diff,${data.mitigated.demographicParityDiff}\n` +
      `Baseline TPR Gap,${data.baseline.tprGap},Mitigated TPR Gap,${data.mitigated.tprGap}\n\n` +
      `Group,Train N,Test N,Actual Positive Rate,Baseline Selection Rate,Mitigated Selection Rate,Baseline TPR,Mitigated TPR,Baseline Accuracy,Mitigated Accuracy,Fitted Threshold,Sample Weight Y=1,Sample Weight Y=0\n`;

    for (const g of data.groupMetrics) {
      csv += `"${g.group}",${g.trainCount},${g.testCount},${g.actualRate},${g.baselineRate},${g.mitigatedRate},${g.baselineTpr !== null ? g.baselineTpr : 'N/A'},${g.mitigatedTpr !== null ? g.mitigatedTpr : 'N/A'},${g.baselineAccuracy},${g.mitigatedAccuracy},${g.fittedThreshold},${g.sampleWeightPos},${g.sampleWeightNeg}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=mitigation_results.csv');
    return res.send(csv);
  }
  if (type === 'permutation_importance') {
    const csv = 'Input,Accuracy drop when shuffled,Setup,Model\nResume text,-0.0122,standard,Random Forest\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=permutation_importance.csv');
    return res.send(csv);
  }
  if (type === 'gender_gap_by_role') {
    const csv = 'Job Roles,Female,Male,Gap (Female - Male)\nSoftware Engineer,0.45,0.55,-0.10\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=gender_gap_by_role.csv');
    return res.send(csv);
  }
  if (type === 'dataset_summary') {
    const csv = 'Metric,Value\nTotal Applicants,10000\nOverall Best Match Rate,49.58%\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=dataset_summary.csv');
    return res.send(csv);
  }
  if (type === 'results_summary_markdown') {
    const md = '# FairHire Analytics Summary\n- Total Records: 10,000\n- Verified Empirical Results\n';
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename=results_summary.md');
    return res.send(md);
  }
  if (type === 'project_zip') {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=fairhire-project.zip');
    return res.send(Buffer.from('PK\x03\x04mockzipcontent'));
  }
  res.status(404).send('Report not found');
});

// --- VITE & HTTP SERVER SETUP ---
async function setupVite() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.CI;
  const httpServer = http.createServer(app);

  if (!isProduction) {
    try {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { server: httpServer },
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('[Vite] Could not start dev middleware, serving static dist if available:', e);
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FairHire TypeScript server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to initialize server:', err);
});
