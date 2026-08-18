import React, { useState, useRef } from 'react';
import {
  Database,
  Plus,
  RefreshCw,
  ExternalLink,
  Table,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Trash2,
  UploadCloud,
  FileUp,
  X,
  Clipboard,
  ClipboardPaste,
  FileText,
} from 'lucide-react';
import { DataSource, RawRow } from '../../types';
import { parseCSVToRawRows } from '../../utils/dataEngine';
import { useLanguage } from '../../context/LanguageContext';

class ApiRouteUnavailableError extends Error {}

interface GoogleSheetRef {
  spreadsheetId: string;
  gid?: string;
}

interface GvizResponse {
  status?: string;
  errors?: Array<{ message?: string; detailed_message?: string }>;
  table?: {
    cols?: Array<{ id?: string; label?: string }>;
    rows?: Array<{ c?: Array<{ v?: unknown; f?: string | null } | null> }>;
  };
}

function extractGoogleSheetRef(value: string): GoogleSheetRef {
  const input = value.trim();
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const rawIdMatch = /^[a-zA-Z0-9-_]{20,}$/.test(input);

  const spreadsheetId = urlMatch?.[1] || (rawIdMatch ? input : '');
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL or ID. Please paste a standard share link.');
  }

  let gid: string | undefined;
  if (urlMatch) {
    try {
      const parsed = new URL(input);
      gid =
        parsed.searchParams.get('gid') ||
        parsed.hash.match(/(?:^|[&#])gid=(\d+)/)?.[1] ||
        undefined;
    } catch {
      gid = input.match(/[?#&]gid=(\d+)/)?.[1];
    }
  }

  return { spreadsheetId, gid };
}

function valueToString(value: unknown, formattedValue?: string | null): string {
  if (formattedValue != null) return formattedValue;
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeColumns(columns: string[]): string[] {
  const seen = new Map<string, number>();

  return columns.map((column, index) => {
    const baseName = column.trim() || `Column ${index + 1}`;
    const count = seen.get(baseName) || 0;
    seen.set(baseName, count + 1);
    return count === 0 ? baseName : `${baseName} (${count + 1})`;
  });
}

function gvizTableToRows(payload: GvizResponse): { columns: string[]; rows: RawRow[] } {
  if (payload.status && payload.status !== 'ok') {
    const details = payload.errors?.[0]?.detailed_message || payload.errors?.[0]?.message;
    throw new Error(details || 'Google Sheets could not return this spreadsheet. Ensure link sharing is public.');
  }

  const table = payload.table;
  if (!table?.cols || !table.rows) {
    throw new Error('Spreadsheet returned an unexpected response.');
  }

  const columns = normalizeColumns(
    table.cols.map((column, index) => column.label || column.id || `Column ${index + 1}`)
  );

  const rows = table.rows
    .map((row) => {
      const result: RawRow = {};
      columns.forEach((indexCol, index) => {
        const cell = row.c?.[index];
        result[indexCol] = cell ? valueToString(cell.v, cell.f) : '';
      });
      return result;
    })
    .filter((row) => Object.values(row).some((value) => value.trim() !== ''));

  return { columns, rows };
}

async function fetchSheetThroughApi(sheetUrl: string): Promise<{ columns: string[]; rows: RawRow[] }> {
  let response: Response;

  try {
    response = await fetch('/api/sheets/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sheetUrl }),
    });
  } catch {
    throw new ApiRouteUnavailableError('Google Sheets API route is unavailable.');
  }

  const rawResponse = await response.text();
  const trimmed = rawResponse.trim();

  if (
    response.status === 404 ||
    response.status === 405 ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html')
  ) {
    throw new ApiRouteUnavailableError('Google Sheets API route returned HTML instead of JSON.');
  }

  let data: any;
  try {
    data = trimmed ? JSON.parse(trimmed) : {};
  } catch {
    throw new ApiRouteUnavailableError('Google Sheets API route returned a non-JSON response.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Failed to connect Google Sheet.');
  }

  if (typeof data.rawCsv !== 'string') {
    throw new ApiRouteUnavailableError('Google Sheets API response is missing CSV data.');
  }

  return parseCSVToRawRows(data.rawCsv);
}

function fetchSheetThroughGviz(
  spreadsheetId: string,
  gid?: string
): Promise<{ columns: string[]; rows: RawRow[] }> {
  return new Promise((resolve, reject) => {
    const callbackName = `__eventDataHubSheet_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement('script');
    let timeoutId: number | undefined;

    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      script.remove();
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (payload: GvizResponse) => {
      try {
        resolve(gvizTableToRows(payload));
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    const query = new URLSearchParams();
    query.set('tqx', `responseHandler:${callbackName}`);
    query.set('headers', '1');
    if (gid) query.set('gid', gid);

    script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${query.toString()}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(
        new Error(
          'Unable to access Google Sheet. Ensure the spreadsheet is public and try again.'
        )
      );
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheet request timed out. Please try again.'));
    }, 15000);

    document.head.appendChild(script);
  });
}

async function loadPublicGoogleSheet(
  sheetUrl: string
): Promise<{ columns: string[]; rows: RawRow[] }> {
  const { spreadsheetId, gid } = extractGoogleSheetRef(sheetUrl);

  try {
    return await fetchSheetThroughApi(sheetUrl);
  } catch (error) {
    if (!(error instanceof ApiRouteUnavailableError)) {
      throw error;
    }

    return fetchSheetThroughGviz(spreadsheetId, gid);
  }
}

interface DataSourcesPageProps {
  sources: DataSource[];
  onAddSource: (newSource: DataSource) => void;
  onDeleteSource?: (sourceId: string) => void;
  onLoadDemo: () => void;
  onNavigate: (page: string) => void;
}

export const DataSourcesPage: React.FC<DataSourcesPageProps> = ({
  sources,
  onAddSource,
  onDeleteSource,
  onLoadDemo,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'sheet' | 'csv'>('sheet');
  const [csvSubTab, setCsvSubTab] = useState<'upload' | 'paste'>('upload');
  const [pastedCsvText, setPastedCsvText] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sourceToDelete, setSourceToDelete] = useState<DataSource | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { columns, rows } = await loadPublicGoogleSheet(sheetUrl);

      if (columns.length === 0 || rows.length === 0) {
        throw new Error('Spreadsheet appears to be empty or unreadable.');
      }

      const newSource: DataSource = {
        id: `src-custom-${Date.now()}`,
        name: customName.trim() || `Connected Sheet ${sources.length + 1}`,
        sheetName: 'Sheet1',
        rowCount: rows.length,
        columnCount: columns.length,
        columns,
        sampleRows: rows.slice(0, 4),
        fullRows: rows,
        status: 'connected',
        lastSynced: 'Just now',
        url: sheetUrl,
        isDemo: false,
      };

      onAddSource(newSource);
      setIsModalOpen(false);
      setSheetUrl('');
      setCustomName('');
      setSuccessMsg(t.uploadSuccess || 'Data source added successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting spreadsheet. Ensure link is public.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File content is empty.');

        const { columns, rows } = parseCSVToRawRows(text);
        if (columns.length === 0 || rows.length === 0) {
          throw new Error('CSV file has no valid columns or rows.');
        }

        const sourceName = customName.trim() || file.name.replace(/\.[^/.]+$/, '') || `Uploaded CSV ${sources.length + 1}`;
        const newSource: DataSource = {
          id: `src-csv-${Date.now()}`,
          name: sourceName,
          sheetName: file.name,
          rowCount: rows.length,
          columnCount: columns.length,
          columns,
          sampleRows: rows.slice(0, 4),
          fullRows: rows,
          status: 'connected',
          lastSynced: 'Just now',
          isDemo: false,
        };

        onAddSource(newSource);
        setIsModalOpen(false);
        setCustomName('');
        setSuccessMsg(t.uploadSuccess || 'CSV uploaded successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error reading CSV file.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file from disk.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleImportPastedCsv = () => {
    if (!pastedCsvText.trim()) {
      setErrorMsg('Vui lòng dán nội dung CSV trước khi nhập.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { columns, rows } = parseCSVToRawRows(pastedCsvText);
      if (columns.length === 0 || rows.length === 0) {
        throw new Error('Dữ liệu CSV không hợp lệ hoặc rỗng. Vui lòng kiểm tra lại dòng tiêu đề và các giá trị.');
      }

      const sourceName =
        customName.trim() || `CSV Data ${sources.length + 1}`;
      const newSource: DataSource = {
        id: `src-csv-${Date.now()}`,
        name: sourceName,
        sheetName: 'Pasted_CSV',
        rowCount: rows.length,
        columnCount: columns.length,
        columns,
        sampleRows: rows.slice(0, 4),
        fullRows: rows,
        status: 'connected',
        lastSynced: 'Just now',
        isDemo: false,
      };

      onAddSource(newSource);
      setIsModalOpen(false);
      setPastedCsvText('');
      setCustomName('');
      setSuccessMsg(t.uploadSuccess || 'Đã thêm dữ liệu CSV thành công.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xử lý dữ liệu CSV.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedCsvText(text);
          setErrorMsg('');
        }
      }
    } catch {
      // Permission prompt fallback
    }
  };

  const handleInsertSampleCsv = () => {
    const sample = `Họ và tên,Đơn vị công tác,Email,Chức vụ,Sự kiện\nNguyễn Hoàng Nam,FPT Software,nam.nguyen@fpt.com,Kỹ sư AI Trưởng,AI Summit Vietnam 2026\nTrần Mai Anh,VNG Corporation,anh.tran@vng.com.vn,Product Manager,Vietnam Cloud AI Forum 2026\nLê Quốc Bảo,Viettel AI,bao.le@viettel.com.vn,Nghiên cứu viên LLM,AI Summit Vietnam 2026\nPhạm Thuỳ Dương,MoMo Tech,duong.pham@mservice.com.vn,Data Lead,Fintech & AI Innovation 2026`;
    setPastedCsvText(sample);
    if (!customName.trim()) {
      setCustomName('Danh sách sự kiện mẫu');
    }
  };

  const confirmDelete = () => {
    if (sourceToDelete && onDeleteSource) {
      onDeleteSource(sourceToDelete.id);
      setSuccessMsg(t.sourceDeleted || 'Data source deleted.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
    setSourceToDelete(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 truncate">
            <Database className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="truncate">{t.dataSourcesTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.dataSourcesSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onLoadDemo}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>{t.loadDemoAction}</span>
          </button>

          <button
            onClick={() => {
              setModalTab('csv');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <FileUp className="w-3.5 h-3.5 shrink-0" />
            <span>+ {t.uploadCsv}</span>
          </button>

          <button
            onClick={() => {
              setModalTab('sheet');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ {t.addGoogleSheet}</span>
          </button>
        </div>
      </div>

      {/* SCHEMA INCONSISTENCY EXPLANATION BANNER */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t.demoDataLoaded}</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          {t.demoNotice}
        </p>
      </div>

      {/* DATA SOURCES GRID */}
      {sources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{t.noSourcesYet}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add your first dataset from Google Sheets, upload a CSV file, or reload demo datasets.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onLoadDemo}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              {t.loadDemoAction}
            </button>
            <button
              onClick={() => {
                setModalTab('csv');
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
            >
              {t.uploadCsv}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition p-5 sm:p-6 flex flex-col justify-between space-y-5 min-w-0 overflow-hidden group h-full"
            >
              {/* Source Header */}
              <div className="space-y-4 min-w-0">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate" title={source.name}>
                        {source.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate" title={source.sheetName}>
                        {source.sheetName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                    {onDeleteSource && (
                      <button
                        onClick={() => setSourceToDelete(source)}
                        title={t.deleteSource || 'Delete source'}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats pill */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">{t.rows}</span>
                    <p className="font-bold text-slate-900 text-sm">{source.rowCount}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">{t.columns}</span>
                    <p className="font-bold text-slate-900 text-sm">{source.columnCount}</p>
                  </div>
                </div>

                {/* Column headers list */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Detected Column Schema</span>
                    <span className="text-[10px] font-medium text-slate-400">({source.columns.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {source.columns.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono font-medium border border-slate-200/60 max-w-full truncate"
                        title={col}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer timestamp & action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2">
                <span className="truncate text-[11px]">Synced {source.lastSynced}</span>
                <button
                  onClick={() => onNavigate('normalize')}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 shrink-0 text-xs"
                >
                  <span>{t.runAiNormalize}</span> <Sparkles className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action CTA to Page 3 */}
      {sources.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="min-w-0">
            <h3 className="text-base font-bold">{t.normalizeTitle}</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              {t.normalizeSubtitle}
            </p>
          </div>
          <button
            onClick={() => onNavigate('normalize')}
            className="px-5 py-2.5 bg-white text-blue-700 font-bold text-xs rounded-xl shadow-sm hover:bg-blue-50 transition shrink-0"
          >
            {t.runAiNormalize}
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {sourceToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">{t.deleteSource}</h3>
                <p className="text-xs text-slate-500 truncate">{sourceToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t.confirmDeleteSource}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSourceToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                {t.deleteSource}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DATA SOURCE MODAL (GOOGLE SHEETS OR CSV) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalTab === 'sheet' ? t.addGoogleSheet : t.uploadCsv}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setModalTab('sheet');
                  setErrorMsg('');
                }}
                className={`pb-2 border-b-2 transition ${
                  modalTab === 'sheet'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Google Sheets
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab('csv');
                  setErrorMsg('');
                }}
                className={`pb-2 border-b-2 transition ${
                  modalTab === 'csv'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.uploadCsv} (.csv)
              </button>
            </div>

            {modalTab === 'sheet' ? (
              <form onSubmit={handleConnectSheet} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.pasteSheetUrl}
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.sheetNameLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Vietnam Tech Expo 2026"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.pasteSheetUrl} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    {t.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.fetchingSheet}</span>
                      </>
                    ) : (
                      <span>{t.connectSheet}</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Sub-tab selection: Upload File vs Paste Raw CSV */}
                <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvSubTab('upload');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      csvSubTab === 'upload'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{t.csvTabUpload}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCsvSubTab('paste');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      csvSubTab === 'paste'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>{t.csvTabPaste}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.sheetNameLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Regional Workshop Registrations"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {csvSubTab === 'upload' ? (
                  /* Dropzone area */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 transition rounded-2xl p-8 text-center cursor-pointer space-y-2"
                  >
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      {t.dragDropCsv}
                    </p>
                    <p className="text-[11px] text-slate-400">Supports standard UTF-8 CSV</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                ) : (
                  /* Paste Raw CSV Area */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t.pasteCsvContent}</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition border border-slate-200"
                        >
                          <Clipboard className="w-3 h-3" />
                          <span>Dán Clipboard</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleInsertSampleCsv}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-md transition border border-amber-200"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Dán mẫu</span>
                        </button>
                        {pastedCsvText && (
                          <button
                            type="button"
                            onClick={() => setPastedCsvText('')}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-red-600 px-1.5 py-1 rounded-md transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      rows={6}
                      value={pastedCsvText}
                      onChange={(e) => setPastedCsvText(e.target.value)}
                      placeholder={t.pasteCsvPlaceholder}
                      className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed text-slate-800"
                    />

                    {pastedCsvText.trim() && (
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                        <span className="font-medium">
                          ✓ Đã nhận diện: {pastedCsvText.split(/\r?\n/).filter(Boolean).length - 1 > 0 ? `${pastedCsvText.split(/\r?\n/).filter(Boolean).length - 1} dòng dữ liệu` : '1 dòng'}
                        </span>
                        <span className="text-[11px] text-blue-600">
                          {pastedCsvText.split(/\r?\n/)[0]?.split(',').length || 1} cột
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex justify-end items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    {t.cancel}
                  </button>

                  {csvSubTab === 'paste' && (
                    <button
                      type="button"
                      onClick={handleImportPastedCsv}
                      disabled={isLoading || !pastedCsvText.trim()}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t.importCsvText}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

