import React, { useState } from 'react';
import {
  Student,
  AttendanceRecord,
  DailySummary,
  ClassSummary,
  SchoolSettings,
  AttendanceStatus,
} from '../types';
import { storageService } from '../services/storageService';
import { getTodayDateStr } from '../data/mockData';
import {
  Users,
  CheckCircle2,
  ClockAlert,
  HeartPulse,
  UserX,
  TrendingUp,
  Filter,
  Calendar,
  Layers,
  ChevronRight,
  Edit3,
  Search,
  MessageSquare,
  Sparkles,
  QrCode,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface DashboardViewProps {
  students: Student[];
  records: AttendanceRecord[];
  dailySummary: DailySummary;
  classSummaries: ClassSummary[];
  settings: SchoolSettings;
  onRefresh: () => void;
  onNavigateToScanner: () => void;
  onNavigateToRekap: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  records,
  dailySummary,
  classSummaries,
  settings,
  onRefresh,
  onNavigateToScanner,
  onNavigateToRekap,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('hadir');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [copiedWA, setCopiedWA] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [dashboardFeedback, setDashboardFeedback] = useState<string | null>(null);

  const handleManualSync = () => {
    setIsSyncing(true);
    onRefresh();
    setTimeout(() => {
      setIsSyncing(false);
      setDashboardFeedback('Data berhasil disinkronkan dengan database cloud!');
      setTimeout(() => setDashboardFeedback(null), 3000);
    }, 600);
  };

  const handleConfirmResetRooms = () => {
    storageService.resetAllStudentRooms();
    setShowResetModal(false);
    onRefresh();
    setDashboardFeedback('Seluruh kamar santri berhasil dikosongkan. Siap untuk pendataan ulang!');
    setTimeout(() => setDashboardFeedback(null), 5000);
  };

  const today = getTodayDateStr();
  const todayRecords = records.filter((r) => r.date === today);

  // Filtered records for the live stream table
  const filteredRecords = todayRecords.filter((rec) => {
    const matchClass = selectedClass === 'SEMUA' || rec.className === selectedClass;
    const matchStatus = statusFilter === 'SEMUA' || rec.status === statusFilter;
    const matchSearch =
      rec.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.studentNis.includes(searchQuery);
    return matchClass && matchStatus && matchSearch;
  });

  // Students who haven't checked in yet today
  const attendedStudentIds = new Set(todayRecords.map((r) => r.studentId));
  const unrecordedStudents = students.filter((s) => !attendedStudentIds.has(s.id));

  // Distinct classes list
  const classList = ['SEMUA', ...Array.from(new Set(students.map((s) => s.className))).sort()];

  // Handle manual status update from admin modal
  const handleSaveManualStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const updated: AttendanceRecord = {
      ...editingRecord,
      status: manualStatus,
      notes: manualNotes || (manualStatus === 'sakit' ? 'Surat Sakit' : manualStatus === 'izin' ? 'Izin Orang Tua' : 'Diperbarui Admin'),
      syncedAt: new Date().toISOString(),
    };

    storageService.saveAttendanceRecord(updated);
    setEditingRecord(null);
    onRefresh();
  };

  // Quick mark student as Sakit/Izin if not yet scanned
  const handleQuickMarkStudent = (student: Student, status: AttendanceStatus) => {
    const now = new Date();
    const newRec: AttendanceRecord = {
      id: `att-manual-${Date.now()}-${student.id}`,
      studentId: student.id,
      studentNis: student.nis,
      studentName: student.name,
      className: student.className,
      date: today,
      timeIn: now.toTimeString().split(' ')[0],
      status,
      notes: `Dicatat oleh ${settings.operatorName || 'Admin'}`,
      recordedBy: settings.operatorName || 'Admin Kesiswaan',
      syncedAt: now.toISOString(),
    };
    storageService.saveAttendanceRecord(newRec);
    onRefresh();
  };

  // Generate formatted WhatsApp text report
  const handleCopyWhatsAppReport = () => {
    const text = `📢 *LAPORAN REKAP PRESENSI HARIAN*
🏫 *${settings.schoolName}*
📅 Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
⏰ Batas Masuk: ${settings.timeInLimit} WIB

📊 *Ringkasan Kehadiran:*
• Total Siswa: ${dailySummary.totalStudents} orang
• Hadir Tepat Waktu: ${dailySummary.presentCount} orang
• Terlambat: ${dailySummary.lateCount} orang
• Sakit: ${dailySummary.sickCount} orang
• Izin: ${dailySummary.leaveCount} orang
• Belum Presensi / Alpa: ${dailySummary.absentCount} orang
📈 *Tingkat Kehadiran:* ${dailySummary.attendanceRate}%

_Laporan otomatis sistem PresensiQR Cloud._`;

    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  return (
    <div id="dashboard-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">
              Monitoring Real-time — {settings.schoolName}
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekap kehadiran siswa terintegrasi dengan pemindai QR dan database cloud sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="sync-dashboard-btn"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all cursor-pointer"
            title="Sinkronisasi data dengan cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Data'}</span>
          </button>

          <button
            type="button"
            id="reset-rooms-shortcut-btn"
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-all cursor-pointer"
            title="Kosongkan seluruh kamar santri"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Riset Kamar</span>
          </button>

          <button
            id="copy-wa-report-btn"
            onClick={handleCopyWhatsAppReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>{copiedWA ? 'Tersalin!' : 'Salin Laporan WA'}</span>
          </button>

          <button
            id="open-scanner-shortcut-btn"
            onClick={onNavigateToScanner}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Buka Scanner</span>
          </button>
        </div>
      </div>

      {dashboardFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{dashboardFeedback}</span>
        </div>
      )}

      {/* Modal Konfirmasi Riset Kamar */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Riset / Kosongkan Kamar Santri?</h3>
                <p className="text-xs text-slate-500">Mereset penugasan seluruh kamar santri ke status awal.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p>• Seluruh santri akan direset menjadi belum memiliki kamar (-).</p>
              <p>• Kamar-kamar asrama akan dikosongkan (0 santri) agar wali kamar dapat mengisi form pendataan kamar dari awal.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetRooms}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Ya, Kosongkan Kamar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid - Clean Minimalism Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Total Siswa</p>
          <p className="text-3xl font-bold text-slate-800">{dailySummary.totalStudents}</p>
          <span className="text-[11px] text-slate-400 font-medium">Terdaftar di sistem</span>
        </div>

        {/* Present On-Time */}
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-xs space-y-1">
          <p className="text-emerald-700 text-xs uppercase tracking-wider font-semibold">Tepat Waktu</p>
          <p className="text-3xl font-bold text-emerald-800">{dailySummary.presentCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Sebelum {settings.timeInLimit}</span>
        </div>

        {/* Late */}
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
          <p className="text-amber-700 text-xs uppercase tracking-wider font-semibold">Terlambat</p>
          <p className="text-3xl font-bold text-amber-800">{dailySummary.lateCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">Setelah {settings.timeInLimit}</span>
        </div>

        {/* Sick / Leave */}
        <div className="bg-sky-50 p-5 rounded-2xl border border-sky-100 shadow-xs space-y-1">
          <p className="text-sky-700 text-xs uppercase tracking-wider font-semibold">Sakit / Izin</p>
          <p className="text-3xl font-bold text-sky-800">{dailySummary.sickCount + dailySummary.leaveCount}</p>
          <span className="text-[11px] text-sky-600 font-medium">
            {dailySummary.sickCount} S • {dailySummary.leaveCount} I
          </span>
        </div>

        {/* Absent / Not Checked in */}
        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-xs space-y-1">
          <p className="text-rose-700 text-xs uppercase tracking-wider font-semibold">Belum Absen</p>
          <p className="text-3xl font-bold text-rose-800">{dailySummary.absentCount}</p>
          <span className="text-[11px] text-rose-600 font-medium">Alpa / Belum Scan</span>
        </div>

        {/* Attendance Rate */}
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-xs space-y-1">
          <p className="text-blue-700 text-xs uppercase tracking-wider font-semibold">Tingkat Hadir</p>
          <p className="text-3xl font-bold text-blue-800">{dailySummary.attendanceRate}%</p>
          <div className="w-full bg-blue-200/80 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${dailySummary.attendanceRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Class Progress + Unrecorded Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Class Breakdown Visual Cards */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Distribusi Kehadiran Per Kelas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Persentase siswa yang sudah hadir di tiap kelas.</p>
            </div>
            <button
              onClick={onNavigateToRekap}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Rekap Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {classSummaries.map((cls) => (
              <div key={cls.className} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{cls.className}</span>
                  <div className="flex items-center gap-3 text-slate-500 font-medium">
                    <span className="text-emerald-700 font-semibold">{cls.presentCount + cls.lateCount} Hadir</span>
                    <span>/</span>
                    <span>{cls.totalStudents} Siswa</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {cls.attendanceRate}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div
                    title={`Hadir Tepat Waktu: ${cls.presentCount}`}
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${(cls.presentCount / Math.max(cls.totalStudents, 1)) * 100}%` }}
                  ></div>
                  <div
                    title={`Terlambat: ${cls.lateCount}`}
                    className="bg-amber-400 h-full transition-all"
                    style={{ width: `${(cls.lateCount / Math.max(cls.totalStudents, 1)) * 100}%` }}
                  ></div>
                  <div
                    title={`Sakit / Izin: ${cls.sickCount + cls.leaveCount}`}
                    className="bg-sky-400 h-full transition-all"
                    style={{ width: `${((cls.sickCount + cls.leaveCount) / Math.max(cls.totalStudents, 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unrecorded Students / Quick Action Box */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-600" />
                Belum Presensi ({unrecordedStudents.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Tandai status izin / sakit secara langsung.</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {unrecordedStudents.length > 0 ? (
              unrecordedStudents.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs hover:bg-slate-100/70 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-slate-900 truncate">{st.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {st.className} • NIS: {st.nis}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleQuickMarkStudent(st, 'sakit')}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Sakit
                    </button>
                    <button
                      onClick={() => handleQuickMarkStudent(st, 'izin')}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Izin
                    </button>
                    <button
                      onClick={() => handleQuickMarkStudent(st, 'hadir')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Hadir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-emerald-600 text-xs space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                <p className="font-bold">Semua Siswa Telah Hadir</p>
                <p className="text-slate-500 text-[11px]">Tidak ada siswa yang belum presensi hari ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table: Live Attendance Records with Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest">
              Log Kehadiran Terbaru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredRecords.length} catatan kehadiran aktif per tanggal {today}.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-medium text-slate-700"
            >
              {classList.map((c) => (
                <option key={c} value={c}>
                  Kelas: {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-medium text-slate-700"
            >
              <option value="SEMUA">Status: Semua</option>
              <option value="hadir">Hadir (Tepat Waktu)</option>
              <option value="terlambat">Terlambat</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
            </select>
          </div>
        </div>

        {/* Clean Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Waktu</th>
                <th className="px-6 py-3 font-semibold">NIS</th>
                <th className="px-6 py-3 font-semibold">Nama Siswa</th>
                <th className="px-6 py-3 font-semibold">Kelas</th>
                <th className="px-6 py-3 font-semibold">Jam Pulang</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Keterangan</th>
                <th className="px-6 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{rec.timeIn || '-'}</td>
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs">{rec.studentNis}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{rec.studentName}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {rec.className}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{rec.timeOut || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider inline-block ${
                          rec.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-700'
                            : rec.status === 'terlambat'
                            ? 'bg-amber-100 text-amber-700'
                            : rec.status === 'sakit'
                            ? 'bg-sky-100 text-sky-700'
                            : rec.status === 'izin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {rec.status === 'hadir' ? 'Tepat Waktu' : rec.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-[200px] truncate">{rec.notes || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingRecord(rec);
                          setManualStatus(rec.status);
                          setManualNotes(rec.notes || '');
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Ubah Status"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada catatan presensi yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Status Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Ubah Status Presensi Siswa</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <p className="font-bold text-slate-900">{editingRecord.studentName}</p>
              <p className="text-slate-500">
                NIS: {editingRecord.studentNis} • Kelas: {editingRecord.className}
              </p>
            </div>

            <form onSubmit={handleSaveManualStatus} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kehadiran</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  <option value="hadir">Hadir (Tepat Waktu)</option>
                  <option value="terlambat">Terlambat</option>
                  <option value="sakit">Sakit (Dengan Surat)</option>
                  <option value="izin">Izin</option>
                  <option value="alpa">Alpa / Tanpa Keterangan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Contoh: Sakit flu, Izin acara keluarga, dll."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
