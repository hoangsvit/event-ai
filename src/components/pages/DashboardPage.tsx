import React from 'react';
import {
  Calendar,
  Users,
  Building2,
  Database,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  DataSource,
  NormalizedRecord,
  DuplicateOrgGroup,
  DuplicateParticipantGroup,
  AIInsight,
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface DashboardPageProps {
  sources: DataSource[];
  records: NormalizedRecord[];
  orgGroups: DuplicateOrgGroup[];
  participantGroups: DuplicateParticipantGroup[];
  insights: AIInsight[];
  onNavigate: (page: string) => void;
  onRefreshInsights: () => void;
  isGeneratingInsights: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  sources,
  records,
  orgGroups,
  participantGroups,
  insights,
  onNavigate,
  onRefreshInsights,
  isGeneratingInsights,
}) => {
  const { t } = useLanguage();

  // Calculated stats
  const totalRecordsCount = records.length;
  const uniqueParticipantsCount = participantGroups.length;
  const uniqueOrgsCount = orgGroups.length;
  const totalSourcesCount = sources.length;

  // Events count & breakdowns
  const eventsMap: Map<string, number> = new Map();
  records.forEach((r) => {
    if (r.event_name) {
      eventsMap.set(r.event_name, (eventsMap.get(r.event_name) || 0) + 1);
    }
  });
  const eventsArray = Array.from(eventsMap.entries()).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / (totalRecordsCount || 1)) * 100),
  }));

  const totalEventsCount = eventsArray.length || 3;

  // Duplicate Org Candidates
  const duplicateOrgCandidates = orgGroups.filter((g) => g.variations.length > 1);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 4 TOP STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Events */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{t.totalEvents}</p>
            <h3 className="text-3xl font-bold text-slate-900">{totalEventsCount}</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{t.totalEventsDesc}</p>
        </div>

        {/* Participants */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{t.participants}</p>
            <h3 className="text-3xl font-bold text-slate-900">{uniqueParticipantsCount}</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {totalRecordsCount} {t.participantsDesc}
          </p>
        </div>

        {/* Organizations */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{t.organizations}</p>
            <h3 className="text-3xl font-bold text-slate-900">{uniqueOrgsCount}</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {duplicateOrgCandidates.length} {t.organizationsDesc}
          </p>
        </div>

        {/* Data Sources */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{t.sourcesCard}</p>
            <h3 className="text-3xl font-bold text-slate-900">{totalSourcesCount}</h3>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> {t.synchronized}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Participants by Event & Top Organizations */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-700">{t.participantsByEvent}</h4>
              <p className="text-xs text-slate-400">{t.participantsDistDesc}</p>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">{t.liveData}</span>
          </div>

          <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
            {/* Event Distribution Progress Bars */}
            <div className="space-y-4">
              {eventsArray.map((ev, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600 font-semibold">{ev.name}</span>
                    <span className="text-slate-400">{ev.count} {t.attendees} ({ev.percentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-blue-500 w-[90%]' : idx === 1 ? 'bg-indigo-400 w-[55%]' : 'bg-slate-400 w-[38%]'
                      }`}
                      style={{ width: `${Math.max(ev.percentage, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Top Participating Organizations Table */}
            <div className="pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-xs font-bold text-slate-400 uppercase">{t.topOrgs}</h5>
                <button
                  onClick={() => onNavigate('explorer')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {t.viewAll} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-400 font-semibold">
                    <th className="pb-3">{t.companyName}</th>
                    <th className="pb-3">{t.events}</th>
                    <th className="pb-3 text-right">{t.participants}</th>
                  </tr>
                </thead>
                <tbody>
                  {orgGroups.slice(0, 5).map((group, idx) => (
                    <tr key={idx} className="text-sm border-t border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="py-3 font-medium text-slate-900">{group.primaryName}</td>
                      <td className="py-3 text-slate-500 text-xs">{group.events.length}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{group.totalRecords}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Insights + Data Quality */}
        <div className="space-y-6">
          {/* AI Insights Widget */}
          <div className="bg-blue-600 rounded-2xl p-5 shadow-lg text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-100" />
                <h4 className="font-bold text-sm uppercase tracking-tight">{t.aiInsights}</h4>
              </div>
              <button
                onClick={onRefreshInsights}
                disabled={isGeneratingInsights}
                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md font-medium text-white transition disabled:opacity-50"
              >
                {t.refresh}
              </button>
            </div>

            <ul className="space-y-3 text-sm">
              {insights.map((ins) => (
                <li key={ins.id} className="p-3 bg-white/10 rounded-xl leading-snug">
                  <span className="font-bold block text-blue-100 mb-1">{ins.title}</span>
                  <p className="text-xs text-blue-50 leading-relaxed">{ins.description}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Data Quality Widget */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-700 text-sm">{t.dataQuality}</h4>
              <span className="text-green-500 font-bold text-sm">96%</span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full">
              <div className="h-full bg-green-500 w-[96%] rounded-full"></div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-400 font-bold uppercase">{t.recentImports}</p>

              {sources.map((src) => (
                <div key={src.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                    GS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{src.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {src.rowCount} {t.rows} · {t.standardized}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('normalize')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {t.runAiNormalize}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

