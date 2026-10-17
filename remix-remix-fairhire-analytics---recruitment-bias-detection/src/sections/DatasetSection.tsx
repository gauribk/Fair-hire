import React, { useState, useEffect } from 'react';
import { DatasetData } from '../types';
import { fetchDataset } from '../api';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  AlertCircle,
  Filter,
  BarChart2,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface DatasetSectionProps {
  initialData: DatasetData;
  rolesList: string[];
}

export const DatasetSection: React.FC<DatasetSectionProps> = ({
  initialData,
  rolesList,
}) => {
  const [data, setData] = useState<DatasetData>(initialData);
  const [roleFilter, setRoleFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'schema' | 'demographics' | 'rolegaps'>('preview');

  const loadData = async (newPage: number, role: string, gender: string, q: string) => {
    setIsLoading(true);
    try {
      const res = await fetchDataset({
        page: newPage,
        per_page: 15,
        role,
        gender,
        search: q,
      });
      setData(res);
      setPage(res.page);
    } catch (err) {
      console.error('Error fetching dataset:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = e.target.value;
    setRoleFilter(r);
    loadData(1, r, genderFilter, search);
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const g = e.target.value;
    setGenderFilter(g);
    loadData(1, roleFilter, g, search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1, roleFilter, genderFilter, search);
  };

  const handleClearFilters = () => {
    setRoleFilter('');
    setGenderFilter('');
    setSearch('');
    loadData(1, '', '', '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Dataset Analysis & Governance Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Profiling 10,000 synthetic recruitment records across 51 job roles and 4 demographic attributes.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Records Explorer
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'schema' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Column Schema
          </button>
          <button
            onClick={() => setActiveTab('demographics')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'demographics' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Demographics
          </button>
          <button
            onClick={() => setActiveTab('rolegaps')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'rolegaps' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Role Disparity Matrix
          </button>
        </div>
      </div>

      {/* 4 Governance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs text-slate-500">Total Applicants</div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {data.total_rows.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Records in corpus</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs text-slate-500">Standardized Roles</div>
          <div className="text-xl font-bold text-blue-700 font-mono tabular-nums">
            {rolesList.length} Roles
          </div>
          <div className="text-[11px] text-slate-400">Fixed benchmark categories</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs text-slate-500">Missing Values (Nulls)</div>
          <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{data.missing_count} (0.0%)</span>
          </div>
          <div className="text-[11px] text-slate-400">Complete data integrity</div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs text-slate-500">Duplicate Records</div>
          <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{data.duplicate_count}</span>
          </div>
          <div className="text-[11px] text-slate-400">No duplicate rows</div>
        </div>
      </div>

      {/* TAB 1: RECORDS EXPLORER */}
      {activeTab === 'preview' && (
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              {/* Role filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Role:</span>
                <select
                  value={roleFilter}
                  onChange={handleRoleChange}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600 text-xs"
                >
                  <option value="">All 51 Roles</option>
                  {rolesList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Gender:</span>
                <select
                  value={genderFilter}
                  onChange={handleGenderChange}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600 text-xs"
                >
                  <option value="">All Genders</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              {(roleFilter || genderFilter || search) && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-1.5 text-xs text-rose-700 hover:text-rose-900 bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search resume keywords, roles..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 w-56"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {/* Table Header Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {data.sample_rows.length} of {data.filtered_total.toLocaleString()} filtered records
              (Page {data.page} of {data.total_pages})
            </span>
            <span className="text-slate-400">
              Target column "Best Match" (1 = Hired/Best Match, 0 = Rejected)
            </span>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3 whitespace-nowrap">Demographics</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Target Role</th>
                  <th className="py-2.5 px-3 whitespace-nowrap min-w-[280px]">Resume Skills Text</th>
                  <th className="py-2.5 px-3 whitespace-nowrap min-w-[240px]">Standard Job Description</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Target Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading filtered records...
                    </td>
                  </tr>
                ) : data.sample_rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No records found matching the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  data.sample_rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{row.Gender}, {row.Age}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {row.Race} · {row.Ethnicity}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <span className="font-medium text-slate-800">{row['Job Roles']}</span>
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-700">
                        <p className="line-clamp-2 leading-relaxed text-xs">
                          {row.Resume}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 align-top text-slate-500">
                        <p className="line-clamp-2 leading-relaxed text-xs">
                          {row['Job Description']}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 align-top text-right whitespace-nowrap font-mono tabular-nums">
                        {row['Best Match'] === 1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            1 (Best Match)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            0 (Not Match)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Page {data.page} of {data.total_pages}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadData(Math.max(1, data.page - 1), roleFilter, genderFilter, search)}
                disabled={data.page <= 1 || isLoading}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              <button
                onClick={() => loadData(Math.min(data.total_pages, data.page + 1), roleFilter, genderFilter, search)}
                disabled={data.page >= data.total_pages || isLoading}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLUMN SCHEMA */}
      {activeTab === 'schema' && (
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Feature Column Dictionary & Modeling Governance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict boundary enforcement: Personally identifiable information is omitted, and protected demographic features are isolated solely for audit purposes.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Governance Role in Audit</th>
                  <th className="py-2.5 px-3">Data Type / Format</th>
                  <th className="py-2.5 px-3 text-right">Missing</th>
                  <th className="py-2.5 px-3 text-right">Unique Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.columns_info.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                      {col.name}
                    </td>
                    <td className="py-2.5 px-3">
                      {col.role.includes('Target') ? (
                        <span className="font-semibold text-emerald-700">{col.role}</span>
                      ) : col.role.includes('Model Input') ? (
                        <span className="font-medium text-blue-700">{col.role}</span>
                      ) : col.role.includes('Fairness') ? (
                        <span className="font-medium text-amber-700">{col.role}</span>
                      ) : (
                        <span className="text-slate-400">{col.role}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{col.type}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {col.missing}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 font-semibold">
                      {col.unique.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEMOGRAPHICS BREAKDOWN */}
      {activeTab === 'demographics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Gender Breakdown & Historical Selection Rate
              </h3>
              <div className="space-y-3 pt-1">
                {Object.entries(data.gender_dist).map(([gender, stat]) => (
                  <div key={gender} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {gender} ({stat.count.toLocaleString()} applicants)
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {(stat.rate * 100).toFixed(1)}% match rate
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${stat.rate * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Group Distribution */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Age Group Distribution & Historical Selection Rate
              </h3>
              <div className="space-y-3 pt-1">
                {Object.entries(data.age_dist).map(([group, stat]) => (
                  <div key={group} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {group} ({stat.count.toLocaleString()} applicants)
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {(stat.rate * 100).toFixed(1)}% match rate
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${stat.rate * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Race Distribution */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Race Breakdown & Historical Selection Rate
              </h3>
              <div className="space-y-3 pt-1">
                {Object.entries(data.race_dist).map(([race, stat]) => (
                  <div key={race} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {race} ({stat.count.toLocaleString()} applicants)
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {(stat.rate * 100).toFixed(1)}% match rate
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${stat.rate * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ethnicity Distribution */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Ethnicity Breakdown & Historical Selection Rate
              </h3>
              <div className="space-y-3 pt-1">
                {Object.entries(data.eth_dist).map(([eth, stat]) => (
                  <div key={eth} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {eth} ({stat.count.toLocaleString()} applicants)
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {(stat.rate * 100).toFixed(1)}% match rate
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${stat.rate * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ROLE DISPARITY MATRIX */}
      {activeTab === 'rolegaps' && (
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Role-Level Historical Selection Disparity Matrix (51 Standardized Roles)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Empirical selection rate for Female vs Male applicants. A positive gap indicates the historical labels favored women, while negative values favored men.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Job Role</th>
                  <th className="py-2.5 px-3 text-right">Female Best Match Rate</th>
                  <th className="py-2.5 px-3 text-right">Male Best Match Rate</th>
                  <th className="py-2.5 px-3 text-right">Disparity Gap (F - M)</th>
                  <th className="py-2.5 px-3">Directional Bias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.role_gaps.map((rg, idx) => {
                  const fRate = rg.Female * 100;
                  const mRate = rg.Male * 100;
                  const gapPoints = rg.Gap * 100;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">{rg.role}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-800">
                        {fRate.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-800">
                        {mRate.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                        gapPoints >= 50 ? 'text-blue-700' : gapPoints <= -50 ? 'text-rose-700' : 'text-slate-600'
                      }`}>
                        {gapPoints > 0 ? `+${gapPoints.toFixed(1)}%` : `${gapPoints.toFixed(1)}%`}
                      </td>
                      <td className="py-2 px-3">
                        {gapPoints >= 50 ? (
                          <span className="text-blue-700 font-medium">Favors Female (&ge;50 pts)</span>
                        ) : gapPoints <= -50 ? (
                          <span className="text-rose-700 font-medium">Favors Male (&ge;50 pts)</span>
                        ) : (
                          <span className="text-slate-500 font-medium">Neutral (&lt;50 pts)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
