import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './components/pages/DashboardPage';
import { DataSourcesPage } from './components/pages/DataSourcesPage';
import { AiNormalizePage } from './components/pages/AiNormalizePage';
import { DataExplorerPage } from './components/pages/DataExplorerPage';
import { AskAiPage } from './components/pages/AskAiPage';

import {
  DataSource,
  FieldMapping,
  CanonicalFieldKey,
  AIInsight,
} from './types';
import { INITIAL_DEMO_SOURCES } from './data/demoData';
import {
  getDefaultMappingsForSources,
  applyMappingsToSources,
  detectDuplicateOrganizations,
  detectDuplicateParticipants,
  generateCalculatedAIInsights,
  addRecordToSources,
  deleteRecordFromSources,
  deleteMultipleRecordsFromSources,
  deleteSourceFromWorkspace,
} from './utils/dataEngine';
import {
  loadWorkspaceFromIndexedDb,
  saveWorkspaceToIndexedDb,
} from './utils/indexedDb';
import { useLanguage } from './context/LanguageContext';

function calculateInsights(sources: DataSource[], mappings: FieldMapping[], language: 'vi' | 'en' = 'vi'): AIInsight[] {
  const workspaceRecords = applyMappingsToSources(sources, mappings);
  const workspaceOrgs = detectDuplicateOrganizations(workspaceRecords);
  const workspaceParticipants = detectDuplicateParticipants(workspaceRecords);
  return generateCalculatedAIInsights(workspaceRecords, workspaceOrgs, workspaceParticipants, language);
}

export default function App() {
  const { lang } = useLanguage();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Core Data State
  const [sources, setSources] = useState<DataSource[]>(INITIAL_DEMO_SOURCES);
  const [mappings, setMappings] = useState<FieldMapping[]>(() =>
    getDefaultMappingsForSources(INITIAL_DEMO_SOURCES)
  );
  const [isNormalized, setIsNormalized] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);

  // Derived Consolidated Dataset
  const records = useMemo(() => {
    return applyMappingsToSources(sources, mappings);
  }, [sources, mappings]);

  // Derived Entity Resolution Groups
  const orgGroups = useMemo(() => {
    return detectDuplicateOrganizations(records);
  }, [records]);

  const participantGroups = useMemo(() => {
    return detectDuplicateParticipants(records);
  }, [records]);

  // AI Executive Insights State
  const [insights, setInsights] = useState<AIInsight[]>(() =>
    calculateInsights(INITIAL_DEMO_SOURCES, getDefaultMappingsForSources(INITIAL_DEMO_SOURCES), 'vi')
  );

  // Update insights when language changes
  useEffect(() => {
    setInsights(calculateInsights(sources, mappings, lang));
  }, [lang]);

  // Restore the last workspace from IndexedDB after the browser app starts.
  useEffect(() => {
    let cancelled = false;

    const hydrateWorkspace = async () => {
      try {
        const persisted = await loadWorkspaceFromIndexedDb();
        if (cancelled || !persisted) return;

        const restoredMappings = persisted.mappings.length
          ? persisted.mappings
          : getDefaultMappingsForSources(persisted.sources);

        setSources(persisted.sources);
        setMappings(restoredMappings);
        setIsNormalized(persisted.isNormalized);
        setInsights(calculateInsights(persisted.sources, restoredMappings));
      } catch (error) {
        // IndexedDB can be disabled by browser/privacy settings. The app should
        // remain usable in memory instead of failing to start.
        console.warn('IndexedDB workspace restore skipped:', error);
      } finally {
        if (!cancelled) setIsStorageHydrated(true);
      }
    };

    hydrateWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist imported sources (including fullRows), mappings and normalization
  // state. Writes are serialized inside indexedDb.ts to avoid stale saves.
  useEffect(() => {
    if (!isStorageHydrated) return;

    saveWorkspaceToIndexedDb({
      sources,
      mappings,
      isNormalized,
    }).catch((error) => {
      console.warn('IndexedDB workspace save skipped:', error);
    });
  }, [sources, mappings, isNormalized, isStorageHydrated]);

  // Reset / Load Demo Dataset Handler
  const handleLoadDemo = () => {
    setSources(INITIAL_DEMO_SOURCES);
    const demoMappings = getDefaultMappingsForSources(INITIAL_DEMO_SOURCES);
    setMappings(demoMappings);
    setIsNormalized(true);
    setInsights(calculateInsights(INITIAL_DEMO_SOURCES, demoMappings));
  };

  // Add Custom Google Sheet Source
  const handleAddSource = (newSource: DataSource) => {
    const updatedSources = [...sources, newSource];
    setSources(updatedSources);

    const newMappings = getDefaultMappingsForSources([newSource]);
    setMappings((prev) => [...prev, ...newMappings]);
    setIsNormalized(false);
  };

  // Delete Data Source
  const handleDeleteSource = (sourceId: string) => {
    const { updatedSources, updatedMappings } = deleteSourceFromWorkspace(
      sources,
      mappings,
      sourceId
    );
    setSources(updatedSources);
    setMappings(updatedMappings);
    setInsights(calculateInsights(updatedSources, updatedMappings));
  };

  // Add Individual Attendee Record
  const handleAddRecord = (recordData: {
    participant_name: string;
    organization_name: string;
    email: string;
    position: string;
    event_name: string;
    source_id?: string;
  }) => {
    const { updatedSources, updatedMappings } = addRecordToSources(
      sources,
      mappings,
      recordData
    );
    setSources(updatedSources);
    setMappings(updatedMappings);
    setInsights(calculateInsights(updatedSources, updatedMappings));
  };

  // Delete Individual Attendee Record
  const handleDeleteRecord = (recordId: string) => {
    const updatedSources = deleteRecordFromSources(sources, recordId, records);
    setSources(updatedSources);
    setInsights(calculateInsights(updatedSources, mappings));
  };

  // Delete Multiple Attendee Records
  const handleDeleteMultipleRecords = (recordIds: string[]) => {
    const updatedSources = deleteMultipleRecordsFromSources(sources, recordIds, records);
    setSources(updatedSources);
    setInsights(calculateInsights(updatedSources, mappings));
  };

  // Update Individual Mapping
  const handleUpdateMapping = (
    sourceId: string,
    sourceField: string,
    canonicalField: CanonicalFieldKey
  ) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.sourceId === sourceId && m.sourceField === sourceField) {
          return {
            ...m,
            canonicalField,
            status: 'user_modified',
            confidence: 100,
            reasoning: `Manually set to ${canonicalField} by user.`,
          };
        }
        return m;
      })
    );
  };

  // Call Gemini Server Endpoint for Schema Analysis
  const handleAnalyzeWithGemini = async (selectedSourceIds: string[]) => {
    setIsAnalyzing(true);
    try {
      const targetSources = sources.filter((s) => selectedSourceIds.includes(s.id));
      const response = await fetch('/api/gemini/analyze-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: targetSources }),
      });

      const rawResponse = await response.text();
      const trimmedResponse = rawResponse.trim();

      if (
        trimmedResponse.startsWith('<!doctype') ||
        trimmedResponse.startsWith('<!DOCTYPE') ||
        trimmedResponse.startsWith('<html')
      ) {
        throw new Error('Gemini API route is unavailable in this preview. Using the existing heuristic mappings.');
      }

      let data: any = {};
      try {
        data = trimmedResponse ? JSON.parse(trimmedResponse) : {};
      } catch {
        throw new Error('Gemini schema endpoint returned an invalid response.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Gemini schema analysis failed.');
      }

      if (data.mappings && Array.isArray(data.mappings)) {
        setMappings((prevMappings) => {
          const updatedMap = new Map<string, FieldMapping>(
            prevMappings.map((m) => [`${m.sourceId}::${m.sourceField}`, m])
          );

          data.mappings.forEach((resMapping: any) => {
            const key = `${resMapping.sourceId}::${resMapping.sourceField}`;
            const existing = updatedMap.get(key);
            if (existing) {
              const updatedItem: FieldMapping = {
                sourceId: existing.sourceId,
                sourceName: existing.sourceName,
                sourceField: existing.sourceField,
                sampleValues: existing.sampleValues,
                canonicalField: resMapping.canonicalField as CanonicalFieldKey,
                confidence: resMapping.confidence || 95,
                reasoning: resMapping.reasoning || 'Mapped by Gemini AI semantic engine.',
                status: 'auto',
              };
              updatedMap.set(key, updatedItem);
            }
          });

          return Array.from(updatedMap.values());
        });
      }
    } catch (err: any) {
      console.error('Error in analyze with Gemini:', err);
      alert('Gemini Schema Analysis notice: ' + (err.message || 'Used heuristic baseline mapping.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm Normalization
  const handleConfirmNormalization = () => {
    setIsNormalized(true);
    setCurrentPage('explorer');
  };

  // Refresh AI Insights via Server Endpoint
  const handleRefreshInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const datasetMetrics = {
        totalRecords: records.length,
        uniqueParticipants: participantGroups.length,
        uniqueOrganizations: orgGroups.length,
        duplicateOrgClusters: orgGroups.filter((g) => g.variations.length > 1).length,
        crossEventParticipants: participantGroups.filter((p) => p.isCrossEvent).length,
      };

      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetMetrics, language: lang }),
      });

      const rawResponse = await res.text();
      const trimmedResponse = rawResponse.trim();

      if (
        trimmedResponse.startsWith('<!doctype') ||
        trimmedResponse.startsWith('<!DOCTYPE') ||
        trimmedResponse.startsWith('<html')
      ) {
        throw new Error('Insights API route is unavailable in this preview.');
      }

      const data = trimmedResponse ? JSON.parse(trimmedResponse) : {};
      if (!res.ok) {
        throw new Error(data.error || 'Failed to refresh AI insights.');
      }

      if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        setInsights(
          data.insights.map((ins: any, idx: number) => ({
            id: `gemini-ins-${idx}`,
            title: ins.title,
            metric: ins.metric,
            description: ins.description,
            type: 'organization',
            calculatedFact: ins.description,
            actionableRecommendation: ins.actionableRecommendation,
          }))
        );
      }
    } catch (err) {
      console.error('Insights refresh notice:', err);
      setInsights(generateCalculatedAIInsights(records, orgGroups, participantGroups, lang));
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Header */}
      <Header
        onLoadDemo={handleLoadDemo}
        isDemoLoaded={sources.length === INITIAL_DEMO_SOURCES.length}
        activeSourcesCount={sources.length}
        totalRecordsCount={records.length}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onNavigate={setCurrentPage}
      />

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          sourcesCount={sources.length}
          normalizationStatus={isNormalized ? 'normalized' : 'analyzed'}
        />

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {currentPage === 'dashboard' && (
            <DashboardPage
              sources={sources}
              records={records}
              orgGroups={orgGroups}
              participantGroups={participantGroups}
              insights={insights}
              onNavigate={setCurrentPage}
              onRefreshInsights={handleRefreshInsights}
              isGeneratingInsights={isGeneratingInsights}
            />
          )}

          {currentPage === 'sources' && (
            <DataSourcesPage
              sources={sources}
              onAddSource={handleAddSource}
              onDeleteSource={handleDeleteSource}
              onLoadDemo={handleLoadDemo}
              onNavigate={setCurrentPage}
            />
          )}

          {currentPage === 'normalize' && (
            <AiNormalizePage
              sources={sources}
              mappings={mappings}
              onUpdateMapping={handleUpdateMapping}
              onAnalyzeWithGemini={handleAnalyzeWithGemini}
              onConfirmNormalization={handleConfirmNormalization}
              isAnalyzing={isAnalyzing}
              isNormalized={isNormalized}
            />
          )}

          {currentPage === 'explorer' && (
            <DataExplorerPage
              records={records}
              sources={sources}
              orgGroups={orgGroups}
              participantGroups={participantGroups}
              onAddRecord={handleAddRecord}
              onDeleteRecord={handleDeleteRecord}
              onDeleteMultipleRecords={handleDeleteMultipleRecords}
            />
          )}

          {currentPage === 'ask' && <AskAiPage records={records} />}
        </main>
      </div>
    </div>
  );
}
