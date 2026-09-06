import React, { useState } from 'react';
import { ActivityLog } from '../types';
import { storageService } from '../services/storageService';
import * as XLSX from 'xlsx';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  Download,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Home,
  QrCode,
  Video,
  X,
  RefreshCw,
} from 'lucide-react';
import { getTodayDateStr } from '../data/mockData';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
  onRefresh: () => void;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({
  logs,
  onRefresh,
}) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'presensi' | 'pendataan_kamar' | 'laporan_kamar' | 'user_system'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS'>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLog | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const todayStr = getTodayDateStr();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // 1. Category Filter
    if (activeCategory === 'presensi') {
      const isPresensi = log.category === 'presensi' || log.type === 'presensi';
      if (!isPresensi) return false;
    } else if (activeCategory === 'pendataan_kamar') {
      const isPendataan = log.category === 'pendataan_kamar' || log.type === 'kamar' || log.type === 'approval';
      if (!isPendataan) return false;
    } else if (activeCategory === 'laporan_kamar') {
      const isLaporan = log.category === 'laporan_kamar' || log.type === 'laporan_kamar' || log.action.toLowerCase().includes('laporan') || log.description.toLowerCase().includes('cctv');
      if (!isLaporan) return false;
    } else if (activeCategory === 'user_system') {
      const isUserSys = log.category === 'user' || log.category === 'system' || log.type === 'user' || log.type === 'system';
      if (!isUserSys) return false;
    }

    // 2. Date Filter
    if (dateFilter === 'TODAY') {
      const logDate = log.timestamp.slice(0, 10);
      if (logDate !== todayStr) return false;
    } else if (dateFilter === '7DAYS') {
      const logDate = new Date(log.timestamp);
      if (logDate < sevenDaysAgo) return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (log.title || log.action).toLowerCase().includes(q);
      const matchDesc = log.description.toLowerCase().includes(q);
      const matchUser = (log.performedBy || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchUser) return false;
    }

    return true;
  });

  const handleClearLogs = () => {
    setShowClearConfirmModal(true);
  };

  const handleExecuteClear = () => {
    storageService.clearActivityLogs();
    setShowClearConfirmModal(false);
    setFeedback('Seluruh riwayat log aktivitas berhasil dikosongkan!');
    setTimeout(() => setFeedback(null), 4000);
    onRefresh();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredLogs.map((l, idx) => ({
      NO: idx + 1,
      ID: l.id,
      WAKTU: new Date(l.timestamp).toLocaleString('id-ID'),
      KATEGORI: l.category || l.type,
      AKSI: l.title || l.action,
      KETERANGAN: l.description,
      'DILAKUKAN OLEH': l.performedBy || 'System',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 25 }, { wch: 50 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Log Aktivitas');
    XLSX.writeFile(wb, `Log_Aktivitas_QN_${activeCategory}_${todayStr}.xlsx`);
  };

  // Specialized Export for Log Pengisian Data Kamar
  const handleExportRoomAssignmentLogs = () => {
    const roomLogs = logs.filter(
      (l) =>
        l.category === 'pendataan_kamar' ||
        l.type === 'kamar' ||
        l.type === 'approval' ||
        l.action.toLowerCase().includes('kamar')
    );

    const data = roomLogs.map((l, idx) => {
      const meta = l.metadata || {};
      return {
        NO: idx + 1,
        'WAKTU LOG': new Date(l.timestamp).toLocaleString('id-ID'),
        AKSI: l.title || l.action,
        'NOMOR KAMAR': meta.roomName || '-',
        'PONDOK / LOKASI': meta.location ? `Pondok ${meta.location}` : '-',
        'JENIS KELAMIN': meta.gender === 'L' ? 'Putra' : meta.gender === 'P' ? 'Putri' : '-',
        'WALI KAMAR / MUSYRIF': meta.supervisorName || l.performedBy || '-',
        'JUMLAH SANTRI': meta.studentCount || meta.total || '-',
        'STATUS APPROVAL': meta.approvalStatus || meta.status || '-',
        'STATUS CCTV': meta.cctvStatus || '-',
        'STATUS CAZH ID': meta.cazhIdStatus || '-',
        'KENDALA / CATATAN': meta.kendalaNotes || meta.notes || l.description || '-',
        'DIVERIFIKASI OLEH': meta.approvedBy || l.performedBy || 'Admin',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 16 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
      { wch: 28 },
      { wch: 35 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Log Pengisian Data Kamar');
    XLSX.writeFile(wb, `Log_Pengisian_Data_Kamar_${todayStr}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['NO', 'Waktu', 'Kategori', 'Aksi', 'Keterangan', 'Aktor'];
    const rows = filteredLogs.map((l, idx) => [
      idx + 1,
      `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
      `"${l.category || l.type}"`,
      `"${(l.title || l.action).replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${(l.performedBy || 'System').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Log_Aktivitas_QN_${activeCategory}_${todayStr}.csv`;
    link.click();
  };

  // Count per category
  const presensiCount = logs.filter((l) => l.category === 'presensi' || l.type === 'presensi').length;
  const pendataanKamarCount = logs.filter((l) => l.category === 'pendataan_kamar' || l.type === 'kamar' || l.type === 'approval').length;
  const laporanKamarCount = logs.filter((l) => l.category === 'laporan_kamar' || l.type === 'laporan_kamar' || l.action.toLowerCase().includes('laporan') || l.description.toLowerCase().includes('cctv')).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Audit Log Aktivitas & Laporan Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Riwayat pencatatan presensi, log pendataan kamar santri, laporan CCTV/Cazh ID, dan approval pengasuhan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setFeedback('Sedang menyinkronkan data log dari Google Sheets LOG_ACTIVITY...');
              const res = await storageService.syncFromGoogleMaster();
              setFeedback(res.message);
              setTimeout(() => setFeedback(null), 4000);
              onRefresh();
            }}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkron Google Sheets</span>
          </button>
          <button
            type="button"
            onClick={handleExportRoomAssignmentLogs}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Unduh Log Pengisian Kamar (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Semua Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={handleClearLogs}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Log</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Selection */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory('ALL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Semua Log ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('presensi')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeCategory === 'presensi'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4 text-blue-400" />
          <span>Log Presensi ({presensiCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('pendataan_kamar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeCategory === 'pendataan_kamar'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span>Log Pendataan Kamar ({pendataanKamarCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('laporan_kamar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeCategory === 'laporan_kamar'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Video className="w-4 h-4 text-amber-400" />
          <span>Log Laporan Kamar ({laporanKamarCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('user_system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeCategory === 'user_system'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Log User & Sistem</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aksi, santri, kamar, keterangan, atau aktor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Rentang Waktu:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Riwayat</option>
              <option value="TODAY">Hari Ini ({todayStr})</option>
              <option value="7DAYS">7 Hari Terakhir</option>
            </select>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Tidak ada log aktivitas yang tercatat untuk filter ini.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const dateObj = new Date(log.timestamp);
              const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

              const isPresensi = log.category === 'presensi' || log.type === 'presensi';
              const isPendataan = log.category === 'pendataan_kamar' || log.type === 'kamar' || log.type === 'approval';
              const isLaporan = log.category === 'laporan_kamar' || log.type === 'laporan_kamar';

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLogDetail(log)}
                  className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4 text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${
                        isPresensi
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : isPendataan
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isLaporan
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {isPresensi
                        ? 'Presensi'
                        : isPendataan
                        ? 'Pendataan Kamar'
                        : isLaporan
                        ? 'Laporan Kamar'
                        : 'Sistem'}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">
                          {log.title || log.action}
                        </p>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-normal">
                        {log.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.performedBy || 'System'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {dateStr} {timeStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-400 hover:text-slate-600 text-[11px] font-semibold hidden sm:block">
                    Detail &rarr;
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  {selectedLogDetail.category || selectedLogDetail.type}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {selectedLogDetail.title || selectedLogDetail.action}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase text-[10px]">Keterangan Aktivitas:</p>
                <p className="text-slate-800 text-sm mt-0.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedLogDetail.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-bold text-slate-500 uppercase text-[10px]">Dilakukan Oleh</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedLogDetail.performedBy || 'System'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-bold text-slate-500 uppercase text-[10px]">Waktu Pencatatan</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">
                    {new Date(selectedLogDetail.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {selectedLogDetail.metadata && (
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[10px]">Data Tambahan (Metadata):</p>
                  <pre className="text-[11px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto mt-1 max-h-40">
                    {JSON.stringify(selectedLogDetail.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear Logs */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-extrabold text-slate-900">Kosongkan Riwayat Log?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus semua riwayat log presensi, aktivitas kamar, dan audit sistem secara permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-emerald-400 px-5 py-3 rounded-2xl shadow-xl border border-emerald-500/30 flex items-center gap-2.5 text-xs font-bold animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
