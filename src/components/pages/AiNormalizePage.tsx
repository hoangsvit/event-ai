import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  Check,
  RotateCcw,
  Layers,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import { DataSource, FieldMapping, CanonicalFieldKey } from '../../types';
import { CANONICAL_FIELDS } from '../../data/demoData';
import { useLanguage } from '../../context/LanguageContext';

interface AiNormalizePageProps {
  sources: DataSource[];
  mappings: FieldMapping[];
  onUpdateMapping: (sourceId: string, sourceField: string, canonicalField: CanonicalFieldKey) => void;
  onAnalyzeWithGemini: (selectedSourceIds: string[]) => Promise<void>;
  onConfirmNormalization: () => void;
  isAnalyzing: boolean;
  isNormalized: boolean;
}

export const AiNormalizePage: React.FC<AiNormalizePageProps> = ({
  sources,
  mappings,
  onUpdateMapping,
  onAnalyzeWithGemini,
  onConfirmNormalization,
  isAnalyzing,
  isNormalized,
}) => {
  const { t } = useLanguage();
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    sources.map((s) => s.id)
  );

  const toggleSourceSelect = (id: string) => {
    if (selectedSourceIds.includes(id)) {
      if (selectedSourceIds.length > 1) {
        setSelectedSourceIds(selectedSourceIds.filter((s) => s !== id));
      }
    } else {
      setSelectedSourceIds([...selectedSourceIds, id]);
    }
  };

  const activeMappings = mappings.filter((m) => selectedSourceIds.includes(m.sourceId));

  // Group mappings by Canonical Field for the visual flow diagram
  const groupedMappings: Record<string, FieldMapping[]> = {
    organization_name: [],
    participant_name: [],
    email: [],
    position: [],
    event_name: [],
    ignore: [],
  };

  activeMappings.forEach((m) => {
    if (groupedMappings[m.canonicalField]) {
      groupedMappings[m.canonicalField].push(m);
    } else {
      groupedMappings.ignore.push(m);
    }
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Page Title & Explanation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {t.normalizeTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t.normalizeSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onAnalyzeWithGemini(selectedSourceIds)}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.analyzingWithGemini}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.analyzeWithGemini}</span>
                </>
              )}
            </button>

            <button
              onClick={onConfirmNormalization}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>{t.confirmAndNormalize}</span>
            </button>
          </div>
        </div>

        {/* Source selector check boxes */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-600" /> {t.targetSources}
          </span>
          {sources.map((source) => {
            const isChecked = selectedSourceIds.includes(source.id);
            return (
              <button
                key={source.id}
                onClick={() => toggleSourceSelect(source.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-2 ${
                  isChecked
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] ${
                    isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300'
                  }`}
                >
                  {isChecked && '✓'}
                </div>
                <span>{source.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONFIRMATION NOTIFICATION BANNER */}
      {isNormalized && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>
              {t.mappingsConfirmedBanner}
            </span>
          </div>
          <span className="text-[11px] bg-emerald-100 px-2.5 py-1 rounded-full font-bold">
            {t.dataExplorerReady}
          </span>
        </div>
      )}

      {/* VISUAL MAPPING FLOW DIAGRAM */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>{t.schemaTreeTitle}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {t.schemaTreeDesc}
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-full font-mono">
            {activeMappings.length} {t.columnLinks}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CANONICAL_FIELDS.filter((f) => f.key !== 'ignore').map((canonical) => {
            const mappedSources = groupedMappings[canonical.key] || [];
            return (
              <div
                key={canonical.key}
                className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-3"
              >
                {/* Canonical Target Header */}
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    canonical: {canonical.key}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {mappedSources.length} {t.mapped}
                  </span>
                </div>

                {/* Source Field Connectors */}
                <div className="space-y-2 text-xs">
                  {mappedSources.length === 0 ? (
                    <div className="text-slate-500 text-[11px] italic">{t.noFieldsMapped}</div>
                  ) : (
                    mappedSources.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-slate-700/50"
                      >
                        <div className="truncate space-y-0.5">
                          <div className="font-semibold text-slate-200">{m.sourceField}</div>
                          <div className="text-[10px] text-slate-400 truncate">{m.sourceName}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-blue-400">
                            {m.confidence}%
                          </span>
                          <span className="text-slate-500">─┐</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED INTERACTIVE MAPPING TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>{t.detailedTableTitle}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {t.detailedTableDesc}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/80">
                <th className="py-3 px-4">{t.colSourceField}</th>
                <th className="py-3 px-4">{t.colSampleValues}</th>
                <th className="py-3 px-4">{t.colCanonicalTarget}</th>
                <th className="py-3 px-4 text-center">{t.colConfidence}</th>
                <th className="py-3 px-4">{t.colReasoning}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeMappings.map((mapping, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  {/* Source name & column */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 font-mono text-xs">
                      {mapping.sourceField}
                    </div>
                    <div className="text-[11px] text-slate-500">{mapping.sourceName}</div>
                  </td>

                  {/* Sample values */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {mapping.sampleValues.map((val, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono truncate max-w-[140px]"
                          title={val}
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Canonical Selector */}
                  <td className="py-3.5 px-4">
                    <select
                      value={mapping.canonicalField}
                      onChange={(e) =>
                        onUpdateMapping(
                          mapping.sourceId,
                          mapping.sourceField,
                          e.target.value as CanonicalFieldKey
                        )
                      }
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {CANONICAL_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} ({f.key})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Gemini Confidence */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                      <span>{mapping.confidence}%</span>
                    </div>
                  </td>

                  {/* Reasoning */}
                  <td className="py-3.5 px-4 text-slate-500 text-xs leading-normal max-w-sm">
                    {mapping.reasoning}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM ACTION BUTTONS */}
      <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-200/80 rounded-2xl">
        <div className="text-xs text-slate-600">
          <strong className="text-slate-900 font-semibold">{t.userSafeguard}</strong> {t.safeguardNotice}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onAnalyzeWithGemini(selectedSourceIds)}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
          >
            {t.rerunAnalysis}
          </button>

          <button
            onClick={onConfirmNormalization}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            {t.confirmDataset}
          </button>
        </div>
      </div>
    </div>
  );
};

