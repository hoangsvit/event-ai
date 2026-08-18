import React, { useState, useMemo } from 'react';
import {
  Table,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Users,
  Building2,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  UserPlus,
  CheckSquare,
  Square,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  NormalizedRecord,
  DuplicateOrgGroup,
  DuplicateParticipantGroup,
  DataSource,
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface DataExplorerPageProps {
  records: NormalizedRecord[];
  sources: DataSource[];
  orgGroups: DuplicateOrgGroup[];
  participantGroups: DuplicateParticipantGroup[];
  onAddRecord?: (data: {
    participant_name: string;
    organization_name: string;
    email: string;
    position: string;
    event_name: string;
    source_id?: string;
  }) => void;
  onDeleteRecord?: (recordId: string) => void;
  onDeleteMultipleRecords?: (recordIds: string[]) => void;
}

export const DataExplorerPage: React.FC<DataExplorerPageProps> = ({
  records,
  sources,
  orgGroups,
  participantGroups,
  onAddRecord,
  onDeleteRecord,
  onDeleteMultipleRecords,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'records' | 'participants' | 'organizations' | 'events'>('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [sortColumn, setSortColumn] = useState<keyof NormalizedRecord>('participant_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selected row IDs for batch delete
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<NormalizedRecord | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Add Record Form State
  const [newParticipant, setNewParticipant] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newEvent, setNewEvent] = useState('');
  const [newSourceId, setNewSourceId] = useState(sources[0]?.id || 'default');
  const [formError, setFormError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Extract unique event names for filter dropdown
  const uniqueEvents = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.event_name && set.add(r.event_name));
    return Array.from(set);
  }, [records]);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          r.participant_name.toLowerCase().includes(query) ||
          r.organization_name.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.position.toLowerCase().includes(query) ||
          r.event_name.toLowerCase().includes(query);

        const matchesEvent = selectedEvent === 'all' || r.event_name === selectedEvent;
        const matchesSource = selectedSource === 'all' || r.source_id === selectedSource;

        return matchesSearch && matchesEvent && matchesSource;
      })
      .sort((a, b) => {
        const valA = (a[sortColumn] || '').toString().toLowerCase();
        const valB = (b[sortColumn] || '').toString().toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [records, searchQuery, selectedEvent, selectedSource, sortColumn, sortDirection]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const toggleSort = (col: keyof NormalizedRecord) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Checkbox toggle helpers
  const handleToggleSelectAllOnPage = () => {
    const pageIds = paginatedRecords.map((r) => r.id);
    const allPageSelected = pageIds.every((id) => selectedRecordIds.includes(id));

    if (allPageSelected) {
      setSelectedRecordIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedRecordIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRecord = (recordId: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };

  // Add Record Handler
  const handleSaveNewRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.trim()) {
      setFormError(t.participantNameReq || 'Participant name is required.');
      return;
    }

    if (onAddRecord) {
      onAddRecord({
        participant_name: newParticipant,
        organization_name: newOrg,
        email: newEmail,
        position: newPosition,
        event_name: newEvent || (sources.find((s) => s.id === newSourceId)?.name || 'Event 2026'),
        source_id: newSourceId,
      });

      setNotificationMsg(t.recordAddedSuccess || 'Record added successfully.');
      setTimeout(() => setNotificationMsg(''), 4000);
      setIsAddModalOpen(false);

      // Reset form
      setNewParticipant('');
      setNewOrg('');
      setNewEmail('');
      setNewPosition('');
      setNewEvent('');
      setFormError('');
    }
  };

  // Single Delete Handler
  const handleConfirmSingleDelete = () => {
    if (recordToDelete && onDeleteRecord) {
      onDeleteRecord(recordToDelete.id);
      setSelectedRecordIds((prev) => prev.filter((id) => id !== recordToDelete.id));
      setNotificationMsg(t.recordDeletedSuccess || 'Record deleted successfully.');
      setTimeout(() => setNotificationMsg(''), 4000);
    }
    setRecordToDelete(null);
  };

  // Batch Delete Handler
  const handleConfirmBatchDelete = () => {
    if (selectedRecordIds.length > 0 && onDeleteMultipleRecords) {
      onDeleteMultipleRecords(selectedRecordIds);
      setNotificationMsg(t.recordsDeletedSuccess || `Deleted ${selectedRecordIds.length} records.`);
      setTimeout(() => setNotificationMsg(''), 4000);
      setSelectedRecordIds([]);
    }
    setIsBatchDeleteConfirmOpen(false);
  };

  // CSV Export handler
  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Participant Name', 'Organization Name', 'Email', 'Position', 'Event Name', 'Source'];
    const csvRows = [headers.join(',')];

    filteredRecords.forEach((r) => {
      const row = [
        `"${r.participant_name.replace(/"/g, '""')}"`,
        `"${r.organization_name.replace(/"/g, '""')}"`,
        `"${r.email.replace(/"/g, '""')}"`,
        `"${r.position.replace(/"/g, '""')}"`,
        `"${r.event_name.replace(/"/g, '""')}"`,
        `"${r.source_name.replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Normalized_Event_Data_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const isAllPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedRecordIds.includes(r.id));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg('')} className="text-emerald-600 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-600" />
            <span>{t.explorerTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.explorerSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onAddRecord && (
            <button
              onClick={() => {
                setFormError('');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ {t.addRecord || 'Add Record'}</span>
            </button>
          )}

          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* EXPLORER TABS */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'records'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>{t.unifiedTableTab} ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'participants'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.uniqueParticipantsTab} ({participantGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('organizations')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'organizations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{t.orgsAndDuplicatesTab} ({orgGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'events'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t.eventsBreakdownTab} ({uniqueEvents.length})</span>
        </button>
      </div>

      {/* TAB 1: UNIFIED RECORDS TABLE */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
          {/* Controls: Search & Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Batch actions & Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {selectedRecordIds.length > 0 && onDeleteMultipleRecords && (
                <button
                  onClick={() => setIsBatchDeleteConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.deleteSelected || 'Delete Selected'} ({selectedRecordIds.length})</span>
                </button>
              )}

              <select
                value={selectedEvent}
                onChange={(e) => {
                  setSelectedEvent(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-700"
              >
                <option value="all">{t.allEvents} ({uniqueEvents.length})</option>
                {uniqueEvents.map((ev, i) => (
                  <option key={i} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>

              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-700"
              >
                <option value="all">{t.allSources}</option>
                {sources.map((src) => (
                  <option key={src.id} value={src.id}>
                    {src.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAllOnPage}
                      className="text-slate-400 hover:text-blue-600 transition"
                      title={isAllPageSelected ? t.clearSelection : t.selectAll}
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                    onClick={() => toggleSort('participant_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.colParticipant}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                    onClick={() => toggleSort('organization_name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.colOrganization}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">{t.colEmail}</th>
                  <th className="py-3 px-4">{t.colPosition}</th>
                  <th className="py-3 px-4">{t.colEvent}</th>
                  <th className="py-3 px-4">{t.colSource}</th>
                  {onDeleteRecord && <th className="py-3 px-4 text-center">{t.actions || 'Actions'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      {t.noRecordsMatch}
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => {
                    const isSelected = selectedRecordIds.includes(record.id);
                    return (
                      <tr
                        key={record.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleSelectRecord(record.id)}
                            className="text-slate-400 hover:text-blue-600 transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {record.participant_name || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {record.organization_name || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {record.email || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {record.position || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                            {record.event_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {record.source_name}
                        </td>
                        {onDeleteRecord && (
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setRecordToDelete(record)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title={t.deleteRecord || 'Delete record'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              {t.showingRecords} {paginatedRecords.length} {t.ofRecords} {filteredRecords.length} {t.recordsText}
              {selectedRecordIds.length > 0 && ` (${selectedRecordIds.length} selected)`}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold">
                {t.pageText} {currentPage} {t.ofText} {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARTICIPANTS TAB */}
      {activeTab === 'participants' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {t.uniqueParticipantsTab}
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {participantGroups.filter((p) => p.isCrossEvent).length} {t.attendedMultipleEvents}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4">{t.colParticipant}</th>
                  <th className="py-3 px-4">{t.colEmail}</th>
                  <th className="py-3 px-4">{t.colOrganization}</th>
                  <th className="py-3 px-4">{t.eventsAttended}</th>
                  <th className="py-3 px-4 text-center">{t.crossEventStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participantGroups.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {p.email}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {p.organizations.join(', ') || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {p.events.map((ev, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-semibold"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.isCrossEvent ? (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">
                          {t.vipMultiEvent} ({p.events.length})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px]">
                          {t.singleEvent}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORGANIZATIONS & DUPLICATES TAB */}
      {activeTab === 'organizations' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {t.orgsAndDuplicatesTab}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.variationsFoundDesc}
            </p>
          </div>

          <div className="space-y-4">
            {orgGroups.map((group, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      {group.primaryName}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                      {group.totalRecords} {t.totalAttendees}
                    </span>
                  </div>

                  {group.variations.length > 1 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {group.variations.length} {t.namingVariationsFound}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {t.standardizedName}
                    </span>
                  )}
                </div>

                {/* Variations details */}
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {group.variations.map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{v.name}</span>
                        <p className="text-[10px] text-slate-400">Source: {v.sourceName}</p>
                      </div>
                      <span className="font-mono font-bold text-slate-600 text-xs">
                        {v.count} {t.recordsText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EVENTS BREAKDOWN TAB */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {uniqueEvents.map((eventName, idx) => {
            const eventRecords = records.filter((r) => r.event_name === eventName);
            const eventOrgs = new Set(eventRecords.map((r) => r.organization_name).filter(Boolean));

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-xs">
                    {eventRecords.length} {t.attendees}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{eventName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {eventOrgs.size} {t.distinctOrgs}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="font-semibold text-slate-600">{t.sampleParticipants}:</span>
                  <div className="space-y-1">
                    {eventRecords.slice(0, 4).map((r, i) => (
                      <div key={i} className="flex justify-between text-slate-700 text-[11px]">
                        <span className="font-medium">{r.participant_name}</span>
                        <span className="text-slate-400">{r.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SINGLE RECORD DELETE MODAL */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.deleteRecord || 'Delete Record'}</h3>
                <p className="text-xs text-slate-500">{recordToDelete.participant_name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t.confirmDeleteRecord || 'Are you sure you want to delete this attendee record?'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                {t.deleteRecord || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {isBatchDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.deleteSelected || 'Delete Selected'}</h3>
                <p className="text-xs text-slate-500">{selectedRecordIds.length} records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t.confirmDeleteSelected?.replace('{count}', String(selectedRecordIds.length)) ||
                `Are you sure you want to delete ${selectedRecordIds.length} selected attendee records?`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                {t.deleteSelected || 'Delete'} ({selectedRecordIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD RECORD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.addRecordModalTitle || 'Add Attendee Record'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t.addRecordModalSubtitle || 'Enter participant details to add into your dataset'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewRecord} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {t.participantNameReq || 'Participant Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Nguyễn Văn An"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.organizationNameLabel || 'Organization / Company'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., FPT Software"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.emailLabel || 'Email Address'}
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., an.nguyen@fpt.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.positionLabel || 'Position / Title'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Senior AI Engineer"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.eventNameLabel || 'Event Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., AI Summit 2026"
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {sources.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.targetSourceLabel || 'Dataset Source'}
                  </label>
                  <select
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rowCount} rows)
                      </option>
                    ))}
                    <option value="create_new">{t.createNewSourceOption || '+ Create new dataset for this record'}</option>
                  </select>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  {t.saveRecord || 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

