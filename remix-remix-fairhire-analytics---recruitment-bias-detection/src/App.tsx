import React, { useState, useEffect } from 'react';
import {
  NavigationTab,
  OverviewData,
  DatasetData,
  ModelSummaryItem,
  FairnessData,
  FeaturesData,
  MetadataInfo,
  ServerStatus,
} from './types';
import {
  checkServerStatus,
  fetchOverview,
  fetchDataset,
  fetchModels,
  fetchFairness,
  fetchFeatures,
  fetchMetadata,
} from './api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { ReportsModal } from './components/ReportsModal';
import { OverviewSection } from './sections/OverviewSection';
import { DatasetSection } from './sections/DatasetSection';
import { ModelPerformanceSection } from './sections/ModelPerformanceSection';
import { FairnessSection } from './sections/FairnessSection';
import { MitigationSection } from './sections/MitigationSection';
import { FeatureImportanceSection } from './sections/FeatureImportanceSection';
import { CandidatePredictionSection } from './sections/CandidatePredictionSection';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);

  // App initialization states
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    ready: false,
    status: 'initializing',
    message: 'Connecting to ML backend...',
  });
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Core Data Stores
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [datasetData, setDatasetData] = useState<DatasetData | null>(null);
  const [modelsData, setModelsData] = useState<{
    test_size: number;
    train_size: number;
    summary_rows: ModelSummaryItem[];
  } | null>(null);
  const [fairnessData, setFairnessData] = useState<FairnessData | null>(null);
  const [featuresData, setFeaturesData] = useState<FeaturesData | null>(null);
  const [metadata, setMetadata] = useState<MetadataInfo | null>(null);

  // Check backend server status and initialize data once models are ready
  const checkAndInit = async () => {
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const status = await checkServerStatus();
      setServerStatus(status);

      if (status.ready) {
        // Load all initial data concurrently
        const [ov, ds, md, fn, ft, meta] = await Promise.all([
          fetchOverview(),
          fetchDataset({ page: 1, per_page: 15 }),
          fetchModels(),
          fetchFairness({ setup: 'standard', model: 'Random Forest', attribute: 'Gender' }),
          fetchFeatures({ setup: 'standard', model: 'Random Forest' }),
          fetchMetadata(),
        ]);

        setOverviewData(ov);
        setDatasetData(ds);
        setModelsData(md);
        setFairnessData(fn);
        setFeaturesData(ft);
        setMetadata(meta);
        setIsLoadingData(false);
      } else {
        // Backend still initializing models; poll in 2.5s
        setTimeout(checkAndInit, 2500);
      }
    } catch (err) {
      setLoadError((err as Error).message || 'Failed to initialize application.');
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    checkAndInit();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenReports={() => setIsReportsOpen(true)}
        isBackendReady={serverStatus.ready}
      />

      {/* Main Workspace: Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenReports={() => setIsReportsOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {loadError ? (
              <ErrorState
                title="Backend Connection Error"
                message="Unable to communicate with the recruitment fairness analysis service."
                details={loadError}
                onRetry={checkAndInit}
              />
            ) : !serverStatus.ready || isLoadingData ? (
              <LoadingState
                message={serverStatus.message}
                onRetry={checkAndInit}
              />
            ) : (
              <>
                {activeTab === 'overview' && overviewData && (
                  <OverviewSection
                    data={overviewData}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'dataset' && datasetData && metadata && (
                  <DatasetSection
                    initialData={datasetData}
                    rolesList={metadata.roles}
                  />
                )}

                {activeTab === 'models' && modelsData && (
                  <ModelPerformanceSection
                    summaryRows={modelsData.summary_rows}
                    trainSize={modelsData.train_size}
                    testSize={modelsData.test_size}
                  />
                )}

                {activeTab === 'fairness' && fairnessData && (
                  <FairnessSection initialData={fairnessData} />
                )}

                {activeTab === 'mitigation' && (
                  <MitigationSection />
                )}

                {activeTab === 'features' && featuresData && (
                  <FeatureImportanceSection initialData={featuresData} />
                )}

                {activeTab === 'prediction' && metadata && (
                  <CandidatePredictionSection metadata={metadata} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Reports Export Modal */}
      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
      />
    </div>
  );
}
