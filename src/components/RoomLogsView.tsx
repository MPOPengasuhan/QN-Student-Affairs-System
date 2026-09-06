import React, { useState, useMemo } from 'react';
import { ActivityLog, Room, Student } from '../types';
import * as XLSX from 'xlsx';
import {
  ClipboardPen,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Home,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  RefreshCw,
} from 'lucide-react';
import { getTodayDateStr } from '../data/mockData';

interface RoomLogsViewProps {
  logs: ActivityLog[];
  rooms?: Room[];
  students?: Student[];
  onRefresh: () => void;
}

export const RoomLogsView: React.FC<RoomLogsViewProps> = ({ logs, rooms, students, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'FORM' | 'TAMBAH' | 'HAPUS' | 'PINDAH' | 'RESET'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS'>('ALL');

  const todayStr = getTodayDateStr();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Filter logs related to rooms and room members
  const roomLogs = useMemo(() => {
    return logs.filter((log) => {
      const isRoomRelated =
        log.type === 'kamar' ||
        log.category === 'pendataan_kamar' ||
        log.action.toLowerCase().includes('kamar') ||
        log.description.toLowerCase().includes('kamar') ||
        log.action.toLowerCase().includes('room');

      if (!isRoomRelated) return false;

      // Filter by action
      if (actionFilter === 'FORM') {
        const isForm =
          log.action.includes('ASSIGN_DIRECT') ||
          log.action.includes('PENDATAAN') ||
          log.action.includes('SUBMIT_FORM') ||
          log.description.toLowerCase().includes('form pendataan');
        if (!isForm) return false;
      } else if (actionFilter === 'TAMBAH') {
        if (!log.action.toLowerCase().includes('tambah') && !log.description.toLowerCase().includes('ditambahkan')) {
          return false;
        }
      } else if (actionFilter === 'HAPUS') {
        if (!log.action.toLowerCase().includes('hapus') && !log.description.toLowerCase().includes('dikeluarkan')) {
          return false;
        }
      } else if (actionFilter === 'PINDAH') {
        if (!log.action.toLowerCase().includes('pindah') && !log.description.toLowerCase().includes('dipindahkan')) {
          return false;
        }
      } else if (actionFilter === 'RESET') {
        if (!log.action.toLowerCase().includes('reset') && !log.description.toLowerCase().includes('kosongkan')) {
          return false;
        }
      }

      // Filter by date
      if (dateFilter === 'TODAY') {
        const logDate = log.timestamp.slice(0, 10);
        if (logDate !== todayStr) return false;
      } else if (dateFilter === '7DAYS') {
        const logDate = new Date(log.timestamp);
        if (logDate < sevenDaysAgo) return false;
      }

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          log.action.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.performedBy.toLowerCase().includes(q) ||
          (log.metadata?.roomName && String(log.metadata.roomName).toLowerCase().includes(q)) ||
          (log.metadata?.studentName && String(log.metadata.studentName).toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, actionFilter, dateFilter, searchQuery, todayStr, sevenDaysAgo]);

  // Quick stats
  const formCount = logs.filter(
    (l) =>
      l.action.includes('ASSIGN_DIRECT') ||
      l.action.includes('PENDATAAN') ||
      l.description.toLowerCase().includes('form pendataan')
  ).length;

  const memberChangesCount = logs.filter(
    (l) =>
      l.action.toLowerCase().includes('tambah') ||
      l.action.toLowerCase().includes('hapus') ||
      l.action.toLowerCase().includes('pindah') ||
      l.description.toLowerCase().includes('dikeluarkan') ||
      l.description.toLowerCase().includes('ditambahkan')
  ).length;

  const resetCount = logs.filter(
    (l) => l.action.toLowerCase().includes('reset') || l.description.toLowerCase().includes('kosongkan')
  ).length;

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = roomLogs.map((log, index) => ({
      No: index + 1,
      Waktu: new Date(log.timestamp).toLocaleString('id-ID'),
      Aktivitas: log.action,
      Kamar: log.metadata?.roomName || log.metadata?.fromRoom || '-',
      Santri: log.metadata?.studentName || '-',
      Keterangan: log.description,
      'Dilakukan Oleh': log.performedBy,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Log Kamar');
    XLSX.writeFile(workbook, `Log_Pengisian_Kamar_${todayStr}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              AUDIT TRAIL KAMAR
            </span>
            <span className="text-xs text-slate-400 font-medium">Biro Pengasuhan & Asrama</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ClipboardPen className="w-5 h-5 text-emerald-600" />
            Log Pengisian Kamar & Anggota Kamar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekam jejak digital seluruh pengisian form kamar oleh wali kamar, penambahan, penghapusan, dan mutasi santri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Segarkan Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">TOTAL LOG KAMAR</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{roomLogs.length}</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <ClipboardPen className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">FORM PENDATAAN MASUK</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{formCount}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">MUTASI & ANGGOTA</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-blue-600">{memberChangesCount}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">RESET KAMAR</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-black text-rose-600">{resetCount}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama santri, kamar, atau musyrif/wali kamar..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter */}
            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDateFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Semua Waktu
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('TODAY')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === 'TODAY' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('7DAYS')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === '7DAYS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                7 Hari Terakhir
              </button>
            </div>
          </div>
        </div>

        {/* Action filter pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Jenis Aksi:
          </span>
          {[
            { id: 'ALL', label: 'Semua Aksi' },
            { id: 'FORM', label: 'Form Pendataan Mandiri' },
            { id: 'TAMBAH', label: 'Tambah Anggota' },
            { id: 'HAPUS', label: 'Keluarkan Anggota' },
            { id: 'PINDAH', label: 'Pindah Kamar' },
            { id: 'RESET', label: 'Reset Kamar' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActionFilter(cat.id as any)}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                actionFilter === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Jenis Aksi</th>
                <th className="py-3 px-4">Kamar</th>
                <th className="py-3 px-4">Deskripsi Perubahan</th>
                <th className="py-3 px-4">Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <ClipboardPen className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-bold text-slate-600">Belum ada riwayat aktivitas kamar</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Log pengisian kamar, penambahan anggota, dan mutasi santri akan otomatis tercatat di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                roomLogs.map((log) => {
                  const isReset = log.action.toLowerCase().includes('reset') || log.description.toLowerCase().includes('kosongkan');
                  const isForm = log.action.includes('ASSIGN_DIRECT') || log.action.includes('PENDATAAN');
                  const isDelete = log.action.toLowerCase().includes('hapus') || log.description.toLowerCase().includes('dikeluarkan');
                  const isAdd = log.action.toLowerCase().includes('tambah') || log.description.toLowerCase().includes('ditambahkan');
                  const isMove = log.action.toLowerCase().includes('pindah') || log.description.toLowerCase().includes('dipindahkan');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-700 font-medium">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            isReset
                              ? 'bg-rose-100 text-rose-800'
                              : isForm
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDelete
                              ? 'bg-amber-100 text-amber-800'
                              : isAdd
                              ? 'bg-blue-100 text-blue-800'
                              : isMove
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isReset && <RotateCcw className="w-3 h-3" />}
                          {isForm && <CheckCircle2 className="w-3 h-3" />}
                          {isDelete && <AlertTriangle className="w-3 h-3" />}
                          {isAdd && <Users className="w-3 h-3" />}
                          {isMove && <Home className="w-3 h-3" />}
                          <span>{log.action}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {log.metadata?.roomName ||
                              log.metadata?.fromRoom ||
                              log.metadata?.targetRoomName ||
                              '-'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-slate-800 font-medium leading-relaxed">{log.description}</p>
                        {log.metadata && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                            {log.metadata.studentName && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                Santri: {log.metadata.studentName}
                              </span>
                            )}
                            {log.metadata.fromRoom && log.metadata.toRoom && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                {log.metadata.fromRoom} &rarr; {log.metadata.toRoom}
                              </span>
                            )}
                            {log.metadata.cctvStatus && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                                CCTV: {log.metadata.cctvStatus}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.performedBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
