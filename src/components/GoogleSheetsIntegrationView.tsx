import React, { useState, useEffect } from 'react';
import { Student, Teacher, Room, AttendanceRecord, SchoolSettings } from '../types';
import { storageService } from '../services/storageService';
import { googleSheetsService } from '../services/googleSheetsService';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Link2,
  Copy,
  Layers,
  Users,
  Home,
  Check,
  Code2,
  Download,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Table,
  Database,
  Search,
} from 'lucide-react';

interface GoogleSheetsIntegrationViewProps {
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  records: AttendanceRecord[];
  settings: SchoolSettings;
  onRefresh: () => void;
}

export const GoogleSheetsIntegrationView: React.FC<GoogleSheetsIntegrationViewProps> = ({
  students,
  teachers,
  rooms,
  records,
  settings,
  onRefresh,
}) => {
  const defaultUrl =
    settings.googleSheetWebhookUrl ||
    'https://script.google.com/macros/s/AKfycbwbvxqA1vroExtxAiYBQXtCSizoZwjb4EMJ1ezgKQEDuVuoKgFtzkgZbwebEFIJer4b/exec';

  const [webhookUrl, setWebhookUrl] = useState<string>(defaultUrl);
  const [customSheetUrl, setCustomSheetUrl] = useState<string>(settings.googleSheetUrl || '');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Sheet Test & Preview State
  const [activeSheetTab, setActiveSheetTab] = useState<'MASTER_SANTRI' | 'MASTER_GURU' | 'MASTER_KAMAR' | 'POST_TEST'>('MASTER_SANTRI');
  const [sheetPreviewData, setSheetPreviewData] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');

  // POST Test Form State
  const [postTargetSheet, setPostTargetSheet] = useState<string>('MASTER_SANTRI');
  const [postJsonBody, setPostJsonBody] = useState<string>(
    JSON.stringify(
      {
        nama_santri: 'Ahmad Fauzi',
        nip_pondok: '121232760046268999',
        kelas: '1-1',
        jk: 'L',
        tempat: 'QN2',
        idb: '26999',
        no_kartu: '1002435754449999',
        qr_code: 'CAZHIDP3TEST999',
        id_izin: 'QN2/L/1.1/9999',
      },
      null,
      2
    )
  );
  const [postResult, setPostResult] = useState<any>(null);
  const [isPosting, setIsPosting] = useState<boolean>(false);

  // Auto-fetch preview on tab change
  const handleFetchSheetPreview = async (sheetName: string) => {
    setIsPreviewLoading(true);
    setSheetPreviewData([]);
    try {
      const res = await googleSheetsService.fetchSheet(sheetName, webhookUrl);
      if (res.success && Array.isArray(res.data)) {
        setSheetPreviewData(res.data);
      } else {
        setSyncStatus({
          type: 'error',
          message: res.message || `Gagal membaca ${sheetName}`,
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        message: err.message || `Gagal memuat ${sheetName}`,
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeSheetTab !== 'POST_TEST') {
      handleFetchSheetPreview(activeSheetTab);
    }
  }, [activeSheetTab]);

  // Full Central Sync (MASTER_SANTRI, MASTER_GURU, MASTER_KAMAR)
  const handleSyncAllMaster = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });

    try {
      const result = await googleSheetsService.syncAllMasterData(webhookUrl);
      if (result.success) {
        setSyncStatus({
          type: 'success',
          message: result.message,
        });

        const updatedSettings: SchoolSettings = {
          ...settings,
          googleSheetWebhookUrl: webhookUrl.trim(),
          lastGoogleSync: new Date().toISOString(),
        };
        storageService.saveSettings(updatedSettings);
        await storageService.fetchFromServer();
        onRefresh();

        // Refresh active preview
        if (activeSheetTab !== 'POST_TEST') {
          handleFetchSheetPreview(activeSheetTab);
        }
      } else {
        setSyncStatus({
          type: 'error',
          message: result.message || 'Gagal sinkronisasi data master Google Sheets.',
        });
      }
    } catch (e: any) {
      setSyncStatus({
        type: 'error',
        message: e.message || 'Kendala jaringan saat sinkronisasi Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Push All Data (including attendance records) via Webhook
  const handlePushAllWebhook = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });

    try {
      const result = await googleSheetsService.syncViaWebhook(webhookUrl, {
        students,
        teachers,
        rooms,
        records,
        settings,
      });

      if (result.success) {
        setSyncStatus({
          type: 'success',
          message: result.message,
        });
        const updatedSettings: SchoolSettings = {
          ...settings,
          googleSheetWebhookUrl: webhookUrl.trim(),
          lastGoogleSync: new Date().toISOString(),
        };
        storageService.saveSettings(updatedSettings);
        onRefresh();
      } else {
        setSyncStatus({
          type: 'error',
          message: result.message,
        });
      }
    } catch (e: any) {
      setSyncStatus({
        type: 'error',
        message: e.message || 'Gagal mengirim data ke Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Submit POST Test to Google Sheets
  const handleSendPostTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    setPostResult(null);

    try {
      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(postJsonBody);
      } catch {
        parsedPayload = { text: postJsonBody };
      }

      const res = await googleSheetsService.saveToSheet(postTargetSheet, parsedPayload, webhookUrl);
      setPostResult(res);

      if (res.success) {
        setSyncStatus({
          type: 'success',
          message: `Berhasil mengirim data baru via POST ke sheet ${postTargetSheet} dengan properti {"sheet": "${postTargetSheet}"}!`,
        });
      } else {
        setSyncStatus({
          type: 'error',
          message: res.message || `Gagal mengirim ke ${postTargetSheet}`,
        });
      }
    } catch (err: any) {
      setPostResult({ success: false, error: err.message });
      setSyncStatus({
        type: 'error',
        message: err.message || 'Gagal mengirim via POST',
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDownloadExcel = () => {
    googleSheetsService.exportMultiSheetExcel({
      students,
      teachers,
      rooms,
      records,
      settings,
    });
  };

  const filteredPreview = sheetPreviewData.filter((row) => {
    if (!previewSearch) return true;
    const str = JSON.stringify(row).toLowerCase();
    return str.includes(previewSearch.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <Database className="w-3.5 h-3.5" />
            <span>Google Sheets Web App Database Terpusat</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Pusat Integrasi Database Google Sheets
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Data aplikasi disinkronkan secara terpusat langsung dengan file <strong>DB_MASTER</strong> di Google Drive via Google Apps Script Web App. 
            Mendukung query parameter <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono">?sheet=NAMA_SHEET</code> pada GET dan properti <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono">"sheet": "NAMA_SHEET"</code> pada request POST.
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
            <button
              onClick={handleSyncAllMaster}
              disabled={isSyncing || !webhookUrl}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Tarik Semua Master Data (Santri, Guru, Kamar)</span>
            </button>

            <button
              onClick={handlePushAllWebhook}
              disabled={isSyncing || !webhookUrl}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-teal-700/80 hover:bg-teal-600 text-white font-bold text-xs border border-teal-500/40 transition-all cursor-pointer"
            >
              <ArrowUpFromLine className="w-4 h-4 text-emerald-300" />
              <span>Kirim Seluruh Data ke Sheets</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer backdrop-blur-xs"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Unduh Rekap Excel</span>
            </button>
          </div>
        </div>

        {/* Status / Timestamp */}
        {settings.lastGoogleSync && (
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-emerald-200">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              Sinkronisasi Terakhir:{' '}
              <strong className="text-white">
                {new Date(settings.lastGoogleSync).toLocaleString('id-ID', {
                  dateStyle: 'full',
                  timeStyle: 'medium',
                })}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Sync Status Alert */}
      {syncStatus.type && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 animate-in fade-in ${
            syncStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {syncStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="space-y-1">
            <p className="font-bold">{syncStatus.message}</p>
          </div>
        </div>
      )}

      {/* 3 Master Sheets Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: MASTER_SANTRI */}
        <div
          onClick={() => setActiveSheetTab('MASTER_SANTRI')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
            activeSheetTab === 'MASTER_SANTRI'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-emerald-700 tracking-wider">Sheet MASTER_SANTRI</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {students.length} Santri
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            no, nip_pondok, nama_santri, kelas, jk, tempat, idb, no_kartu, qr_code, id_izin
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <span>GET ?sheet=MASTER_SANTRI</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 2: MASTER_GURU */}
        <div
          onClick={() => setActiveSheetTab('MASTER_GURU')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
            activeSheetTab === 'MASTER_GURU'
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">Sheet MASTER_GURU</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {teachers.length} Asatidz / Guru
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            no, kode_guru, nama_guru, jk, status, jabatan, ket
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
            <span>GET ?sheet=MASTER_GURU</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 3: MASTER_KAMAR */}
        <div
          onClick={() => setActiveSheetTab('MASTER_KAMAR')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
            activeSheetTab === 'MASTER_KAMAR'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-amber-700 tracking-wider">Sheet MASTER_KAMAR</span>
            <Home className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {rooms.length} Kamar Asrama
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            no, nama_kamar, lokasi, kode_kamar, jk
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
            <span>GET ?sheet=MASTER_KAMAR</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Web App URL Configuration */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-600" />
          <span>Endpoint Google Apps Script Web App URL:</span>
        </h3>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            placeholder="https://script.google.com/macros/s/.../exec"
          />
          <button
            onClick={() => {
              const updatedSettings: SchoolSettings = {
                ...settings,
                googleSheetWebhookUrl: webhookUrl.trim(),
              };
              storageService.saveSettings(updatedSettings);
              setSyncStatus({
                type: 'success',
                message: 'URL Google Apps Script Web App tersimpan.',
              });
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Simpan URL
          </button>
        </div>
      </div>

      {/* Interactive Sheet Inspector & Live Query View */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 sm:pb-0">
            <button
              onClick={() => setActiveSheetTab('MASTER_SANTRI')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSheetTab === 'MASTER_SANTRI'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>MASTER_SANTRI</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('MASTER_GURU')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSheetTab === 'MASTER_GURU'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>MASTER_GURU</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('MASTER_KAMAR')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSheetTab === 'MASTER_KAMAR'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>MASTER_KAMAR</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('POST_TEST')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSheetTab === 'POST_TEST'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Data Baru (POST)</span>
            </button>
          </div>

          {activeSheetTab !== 'POST_TEST' && (
            <button
              onClick={() => handleFetchSheetPreview(activeSheetTab)}
              disabled={isPreviewLoading}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 mb-3 sm:mb-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPreviewLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Sheet</span>
            </button>
          )}
        </div>

        {/* Tab Content 1-3: Sheet Data Table Inspector */}
        {activeSheetTab !== 'POST_TEST' ? (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Pratinjau Live: {activeSheetTab}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs">
                    {sheetPreviewData.length} baris terbaca
                  </span>
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Endpoint: {webhookUrl}?sheet={activeSheetTab}
                </p>
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari data sheet..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {isPreviewLoading ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs font-medium">Memuat data dari sheet {activeSheetTab}...</p>
              </div>
            ) : filteredPreview.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      {Object.keys(filteredPreview[0] || {}).map((col) => (
                        <th key={col} className="px-3.5 py-2.5 font-mono uppercase text-[11px] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredPreview.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        {Object.keys(filteredPreview[0] || {}).map((col) => (
                          <td key={col} className="px-3.5 py-2 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                            {String(row[col] !== undefined && row[col] !== null ? row[col] : '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Table className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Tidak ada data ditemukan untuk sheet ini.</p>
              </div>
            )}
          </div>
        ) : (
          /* Tab Content 4: POST Test Tool */
          <div className="p-4 sm:p-6 space-y-5">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Pengujian Simpan Data via POST dengan properti "sheet"
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengirimkan JSON Body yang menyertakan properti <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-700">"sheet": "NAMA_SHEET"</code> ke Google Apps Script Web App.
              </p>
            </div>

            <form onSubmit={handleSendPostTest} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Target Sheet:
                </label>
                <select
                  value={postTargetSheet}
                  onChange={(e) => {
                    const sheet = e.target.value;
                    setPostTargetSheet(sheet);
                    if (sheet === 'MASTER_SANTRI') {
                      setPostJsonBody(
                        JSON.stringify(
                          {
                            nama_santri: 'Ahmad Fauzi',
                            nip_pondok: '121232760046268999',
                            kelas: '1-1',
                            jk: 'L',
                            tempat: 'QN2',
                            idb: '26999',
                            no_kartu: '1002435754449999',
                            qr_code: 'CAZHIDP3TEST999',
                            id_izin: 'QN2/L/1.1/9999',
                          },
                          null,
                          2
                        )
                      );
                    } else if (sheet === 'MASTER_GURU') {
                      setPostJsonBody(
                        JSON.stringify(
                          {
                            kode_guru: 'GR263',
                            nama_guru: 'Ust. Ahmad Dahlan, S.Pd.',
                            jk: 'L',
                            status: 'AKTIF',
                            jabatan: 'Guru Fiqih',
                            ket: '081234567890',
                          },
                          null,
                          2
                        )
                      );
                    } else if (sheet === 'MASTER_KAMAR') {
                      setPostJsonBody(
                        JSON.stringify(
                          {
                            nama_kamar: 'AL MUSTHOFA ROOM',
                            lokasi: 'QN2',
                            kode_kamar: 'QN2-KM57',
                            jk: 'L',
                          },
                          null,
                          2
                        )
                      );
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MASTER_SANTRI">MASTER_SANTRI</option>
                  <option value="MASTER_GURU">MASTER_GURU</option>
                  <option value="MASTER_KAMAR">MASTER_KAMAR</option>
                  <option value="REKAP_PRESENSI">REKAP_PRESENSI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Body JSON (Data yang dikirim):
                </label>
                <textarea
                  rows={8}
                  value={postJsonBody}
                  onChange={(e) => setPostJsonBody(e.target.value)}
                  className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPosting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isPosting ? 'animate-spin' : ''}`} />
                <span>{isPosting ? 'Mengirim...' : `Kirim Data ke Sheet ${postTargetSheet}`}</span>
              </button>
            </form>

            {postResult && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-800">Respon dari Google Apps Script:</p>
                <pre className="text-[11px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto">
                  {JSON.stringify(postResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
