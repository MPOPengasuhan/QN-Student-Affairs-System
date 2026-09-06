import React, { useState } from 'react';
import { Student, AttendanceRecord, SchoolSettings, UserAccount, Room } from '../types';
import { storageService } from '../services/storageService';
import * as XLSX from 'xlsx';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  HeartPulse,
  Download,
  Search,
  Calendar,
  ArrowLeft,
  Filter,
  ShieldCheck,
  Home,
  User,
  AlertCircle,
} from 'lucide-react';
import { getTodayDateStr } from '../data/mockData';

interface WaliKelasDashboardViewProps {
  currentUser: UserAccount;
  students: Student[];
  records: AttendanceRecord[];
  settings: SchoolSettings;
  rooms?: Room[];
  onBackToPortal?: () => void;
  onBack?: () => void;
  onRefresh: () => void;
}

export const WaliKelasDashboardView: React.FC<WaliKelasDashboardViewProps> = ({
  currentUser,
  students,
  records,
  settings,
  rooms,
  onBackToPortal,
  onBack,
  onRefresh,
}) => {
  const handleBack = onBackToPortal || onBack || (() => {});
  
  // Available classes in system
  const allClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean).sort();
  
  // Fixed class for this Wali Kelas (cannot change or view other classes)
  const rawClass = (currentUser.positionDetail || '').replace(/^wali\s*kelas\s*/i, '').trim();
  const fixedClass = allClasses.find((c) => String(c).toLowerCase() === rawClass.toLowerCase()) || rawClass || (allClasses[0] ? String(allClasses[0]) : '1A');

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPresence, setFilterPresence] = useState<'ALL' | 'DONE' | 'PENDING'>('ALL');

  // Rooms and Supervisor mapping
  const currentRooms = rooms || storageService.getRooms();
  const roomMap = new Map<string, Room>();
  currentRooms.forEach((r) => roomMap.set(r.roomNumber, r));

  // Filter students ONLY in this Wali Kelas's fixed class
  const classStudents = students.filter(
    (s) => s.className.toLowerCase().trim() === fixedClass.toLowerCase().trim()
  );

  // Attendance records for selected date
  const dateRecords = records.filter((r) => r.date === selectedDate);
  const recordMap = new Map<string, AttendanceRecord>();
  dateRecords.forEach((r) => recordMap.set(r.studentId, r));

  // Monitoring counts
  let presencedCount = 0;
  let pendingCount = 0;
  let hadirCount = 0;
  let terlambatCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let alpaCount = 0;

  classStudents.forEach((st) => {
    const rec = recordMap.get(st.id);
    if (rec && rec.status && rec.status !== 'alpa') {
      presencedCount++;
      if (rec.status === 'hadir') hadirCount++;
      if (rec.status === 'terlambat') terlambatCount++;
      if (rec.status === 'sakit') sakitCount++;
      if (rec.status === 'izin') izinCount++;
    } else if (rec && rec.status === 'alpa') {
      presencedCount++;
      alpaCount++;
    } else {
      pendingCount++;
    }
  });

  const completionRate = classStudents.length > 0
    ? Math.round((presencedCount / classStudents.length) * 100)
    : 0;

  // Filtered student list for table
  const filteredStudents = classStudents.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.noKartu && s.noKartu.includes(q)) ||
      (s.roomName && s.roomName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    const rec = recordMap.get(s.id);
    const hasPresenced = Boolean(rec && rec.status);
    if (filterPresence === 'DONE') return hasPresenced;
    if (filterPresence === 'PENDING') return !hasPresenced;
    return true;
  });

  // Export class monitoring report to Excel
  const handleExportClassExcel = () => {
    const data = classStudents.map((s, idx) => {
      const rec = recordMap.get(s.id);
      const room = s.roomName ? roomMap.get(s.roomName) : undefined;
      const waliKamar = room?.supervisorName || (s.roomName ? 'Wali Kamar' : 'Belum Ditentukan');

      let statusDesc = 'Belum Dipresensi';
      if (rec?.status) {
        statusDesc = rec.status.toUpperCase();
        if (rec.timeIn) statusDesc += ` (${rec.timeIn})`;
      }

      return {
        NO: idx + 1,
        'NIP PONDOK': s.nis,
        'NAMA SANTRI': s.name,
        KELAS: s.className,
        JK: s.gender === 'L' ? 'Putra' : 'Putri',
        PONDOK: s.tempat || room?.location || '-',
        'KAMAR ASRAMA': s.roomName || 'Belum Ada Kamar',
        'WALI KAMAR TERHUBUNG': waliKamar,
        TANGGAL: selectedDate,
        'STATUS PRESENSI': statusDesc,
        'DICATAT OLEH': rec?.recordedBy || '-',
        KETERANGAN: rec?.notes || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 26 },
      { wch: 14 },
      { wch: 24 },
      { wch: 20 },
      { wch: 25 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Kelas_${fixedClass}`);
    XLSX.writeFile(wb, `Monitoring_Presensi_Kelas_${fixedClass}_${selectedDate}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              id="wali-kelas-back-btn"
              onClick={handleBack}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Kembali ke Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  DASHBOARD WALI KELAS
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  Kelas {fixedClass} (Fixed)
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  T.A {settings.academicYear} • Semester {settings.semester}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                Monitoring Presensi Kelas {fixedClass}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Wali Kelas: <strong className="text-slate-800">{currentUser.name}</strong> • Memantau kelengkapan presensi santri oleh Wali Kamar masing-masing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportClassExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Monitoring Kelas (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Date Selector & Monitoring Info Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Tanggal Monitoring:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterPresence('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPresence === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({classStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterPresence('DONE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPresence === 'DONE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sudah Dipresensi ({presencedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterPresence('PENDING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPresence === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Menunggu Wali Kamar ({pendingCount})
              </button>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Rombel Kelas: <span className="font-extrabold text-blue-700">{fixedClass}</span> (Akses Terkunci Khusus Kelas Anda)
          </div>
        </div>

        {/* Monitoring Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Santri Kelas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{classStudents.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Rombel {fixedClass}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs bg-emerald-50/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sudah Dipresensi</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{presencedCount}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">{completionRate}% selesai</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs bg-amber-50/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Menunggu Wali Kamar</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Belum scan QR malam</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs bg-blue-50/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Progres Presensi</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-sm font-black text-blue-700">{completionRate}%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Real-time sinkronisasi</p>
          </div>
        </div>

        {/* Monitoring Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daftar Santri Kelas {fixedClass} & Status Presensi Wali Kamar
              </h2>
              <p className="text-xs text-slate-500">
                Setiap santri dipresensi oleh Wali Kamar tempat mereka menginap. Wali Kelas bertindak sebagai monitoring.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari santri, NIP, kamar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-center w-12">No</th>
                  <th className="py-3 px-4">NIP / ID</th>
                  <th className="py-3 px-4">Nama Santri</th>
                  <th className="py-3 px-4">Kamar Asrama</th>
                  <th className="py-3 px-4">Wali Kamar Terhubung</th>
                  <th className="py-3 px-4">Status Presensi ({selectedDate})</th>
                  <th className="py-3 px-4">Jam & Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada data santri ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const rec = recordMap.get(st.id);
                    const status = rec?.status;
                    const room = st.roomName ? roomMap.get(st.roomName) : undefined;
                    const waliKamar = room?.supervisorName || (st.roomName ? 'Wali Kamar' : 'Belum Ada Kamar');

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">{st.nis}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {st.name}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {st.gender === 'L' ? 'Putra' : 'Putri'} • Pondok: {st.tempat || room?.location || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {st.roomName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                              <Home className="w-3.5 h-3.5 text-emerald-600" />
                              {st.roomName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-xs">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Belum Ada Kamar
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{waliKamar}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {status === 'hadir' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              HADIR
                            </span>
                          )}
                          {status === 'terlambat' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              TERLAMBAT
                            </span>
                          )}
                          {status === 'sakit' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <HeartPulse className="w-3.5 h-3.5 text-blue-600" />
                              SAKIT
                            </span>
                          )}
                          {status === 'izin' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              IZIN
                            </span>
                          )}
                          {status === 'alpa' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              ALPA
                            </span>
                          )}
                          {!status && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Menunggu Wali Kamar
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {rec ? (
                            <div>
                              <p className="font-mono text-slate-900 font-semibold">{rec.timeIn || '-'}</p>
                              <p className="text-[10px] text-slate-500">{rec.recordedBy || 'Wali Kamar'}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
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
    </div>
  );
};
