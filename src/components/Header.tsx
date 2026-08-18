import React from 'react';
import { Database, RefreshCw, Sparkles, Layers, Menu, X, CheckCircle2, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  onLoadDemo: () => void;
  isDemoLoaded: boolean;
  activeSourcesCount: number;
  totalRecordsCount: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadDemo,
  isDemoLoaded,
  activeSourcesCount,
  totalRecordsCount,
  isMobileOpen,
  setIsMobileOpen,
  onNavigate,
}) => {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          aria-label="Toggle navigation menu"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
            E
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              {t.appTitle}
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right Status & Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setLang('vi')}
            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
              lang === 'vi'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tiếng Việt"
          >
            <span>🇻🇳</span>
            <span>VI</span>
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
              lang === 'en'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="English"
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
        </div>

        {/* Active Data Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>
            <strong className="text-slate-900 font-semibold">{totalRecordsCount}</strong> {t.recordsInSources}{' '}
            <strong className="text-slate-900 font-semibold">{activeSourcesCount}</strong> {t.sources}
          </span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
        </div>

        {/* Load Demo Data Button */}
        <button
          onClick={onLoadDemo}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
            isDemoLoaded
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.loadDemo}</span>
          <span className="sm:hidden">{t.demoShort}</span>
        </button>

        {/* Competition & AI Status */}
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900">{t.competitionTag}</p>
          <p className="text-[10px] text-green-600 font-medium flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> {t.geminiActive}
          </p>
        </div>
      </div>
    </header>
  );
};

