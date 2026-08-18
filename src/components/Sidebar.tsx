import React from 'react';
import {
  LayoutDashboard,
  Database,
  Table,
  Sparkles,
  MessageSquareText,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  sourcesCount: number;
  normalizationStatus: 'pending' | 'analyzed' | 'normalized';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isMobileOpen,
  setIsMobileOpen,
  sourcesCount,
  normalizationStatus,
}) => {
  const { t } = useLanguage();

  const navItems = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: LayoutDashboard,
    },
    {
      id: 'sources',
      label: t.dataSources,
      icon: Database,
      badge: sourcesCount > 0 ? `${sourcesCount}` : undefined,
    },
    {
      id: 'normalize',
      label: t.aiNormalize,
      icon: Sparkles,
      badge: normalizationStatus === 'normalized' ? 'Ready' : 'AI',
      badgeColor: normalizationStatus === 'normalized' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
    },
    {
      id: 'explorer',
      label: t.dataExplorer,
      icon: Table,
    },
    {
      id: 'ask',
      label: t.askAi,
      icon: MessageSquareText,
      badge: t.betaTag,
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
  ];

  const handleSelect = (id: string) => {
    onNavigate(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-[64px] left-0 z-40 h-[calc(100vh-64px)] w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Section Header */}
          <div className="px-3 pt-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t.navTitle}
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors group cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-blue-200/60 text-blue-900'
                          : item.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition ${
                        isActive ? 'text-blue-700 opacity-100' : 'text-slate-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info card */}
        <div className="pt-4 border-t border-slate-100">
          <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2">
            <p className="text-xs font-semibold uppercase opacity-60">{t.groundedSearch}</p>
            <p className="text-xs leading-relaxed text-slate-300">
              {t.groundedSearchDesc}
            </p>
            <button
              onClick={() => handleSelect('ask')}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {t.openConsole}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

