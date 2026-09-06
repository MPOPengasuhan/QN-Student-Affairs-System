import React, { useState } from 'react';
import {
  UserAccount,
  Student,
  Room,
  Teacher,
  AttendanceRecord,
  RoomAssignmentSubmission,
  ActivityLog,
  SchoolSettings,
} from '../types';
import { storageService } from '../services/storageService';
import {
  ShieldCheck,
  Building,
  Users,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ArrowLeft,
  Video,
  CreditCard,
  Download,
  Printer,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { QOTRUN_NADA_LOGO_SVG, getTodayDateStr } from '../data/mockData';
import * as XLSX from 'xlsx';

interface PembinaDashboardViewProps {
  currentUser: UserAccount;
  students: Student[];
  rooms: Room[];
  teachers: Teacher[];
  records: AttendanceRecord[];
  submissions: RoomAssignmentSubmission[];
  activityLogs: ActivityLog[];
  settings: SchoolSettings;
  onBack: () => void;
  onRefresh: () => void;
}

export const PembinaDashboardView: React.FC<PembinaDashboardViewProps> = ({
  currentUser,
  students,
  rooms,
  teachers,
  records,
  submissions,
  activityLogs,
  settings,
  onBack,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'asrama' | 'approval' | 'presensi' | 'kendala'>('asrama');
  const [selectedLocation, setSelectedLocation] = useState<'ALL' | 'QN1' | 'QN2'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(rooms[0]?.roomNumber || '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const todayStr = getTodayDateStr();

  // Filter rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedLocation === 'ALL') return true;
    if (selectedLocation === 'QN1') {
      return r.location === 'QN1' || r.gender === 'P' || r.building.toLowerCase().includes('putri') || r.building.toLowerCase().includes('qn1');
    }
    if (selectedLocation === 'QN2') {
      return r.location === 'QN2' || r.gender === 'L' || r.building.toLowerCase().includes('putra') || r.building.toLowerCase().includes('qn2');
    }
    return true;
  });

  const activeRoom = rooms.find((r) => r.roomNumber === selectedRoomNumber) || filteredRooms[0];
  const roomMembers = activeRoom ? students.filter((s) => s.roomName === activeRoom.roomNumber) : [];

  // Approval counts
  const pendingSubmissions = submissions.filter((s) => s.status === 'PENDING');
  const approvedSubmissions = submissions.filter((s) => s.status === 'APPROVED');

  // Attendance summary for today
  const todayRecords = records.filter((r) => r.date === todayStr);
  const presentCount = todayRecords.filter((r) => r.status === 'hadir').length;
  const lateCount = todayRecords.filter((r) => r.status === 'terlambat').length;
  const absentCount = students.length - (presentCount + lateCount);

  // Approve / Reject Handlers
  const handleApprove = (submission: RoomAssignmentSubmission) => {
    const success = storageService.approveRoomAssignment(submission.id, currentUser.name);
    if (success) {
      setFeedback({
        type: 'success',
        message: `Pengajuan kamar "${submission.roomName}" oleh ${submission.supervisorName} berhasil disetujui!`,
      });
      setTimeout(() => setFeedback(null), 4000);
      onRefresh();
    }
  };

  const handleReject = (submission: RoomAssignmentSubmission) => {
    const reason = prompt('Masukkan alasan penolakan/revisi pengajuan:', 'Perlu penyesuaian anggota kamar santri.');
    if (reason !== null) {
      storageService.rejectRoomAssignment(submission.id, currentUser.name, reason);
      setFeedback({
        type: 'success',
        message: `Pengajuan kamar "${submission.roomName}" telah ditolak/diminta revisi.`,
      });
      setTimeout(() => setFeedback(null), 4000);
      onRefresh();
    }
  };

  // Export Rooms Excel
  const handleExportRooms = () => {
    const data = rooms.map((r, i) => {
      const count = students.filter((s) => s.roomName === r.roomNumber).length;
      return {
        NO: i + 1,
        KOMPLEK: r.location || (r.gender === 'P' ? 'QN1 Putri' : 'QN2 Putra'),
        GEDUNG: r.building,
        KAMAR: r.roomNumber,
        WALI_KAMAR: r.supervisorName,
        KAPASITAS: r.capacity,
        TERISI: count,
        SISA: Math.max(0, r.capacity - count),
        STATUS: count >= r.capacity ? 'Penuh' : count > 0 ? 'Terisi Sebagian' : 'Kosong',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kamar Asrama');
    XLSX.writeFile(wb, `Rekap_Kamar_Asrama_QN_${todayStr}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="bg-[#0c1a16] text-white border-b border-emerald-950/80 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="back-to-portal-from-pembina"
              onClick={onBack}
              className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-white border border-emerald-500/30 transition-all flex items-center gap-2 text-xs font-extrabold cursor-pointer"
              title="Kembali ke Portal Utama"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali ke Portal</span>
            </button>
            <div className="h-6 w-px bg-emerald-800/60 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 p-1 flex items-center justify-center shrink-0">
                <img
                  src={settings.logoUrl || QOTRUN_NADA_LOGO_SVG}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = QOTRUN_NADA_LOGO_SVG;
                  }}
                />
              </div>
              <div>
                <h1 className="font-extrabold text-sm text-white leading-tight">
                  Dashboard Pembina Pengasuhan
                </h1>
                <p className="text-[10px] text-emerald-400 font-medium">
                  {settings.schoolName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-900/60 text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{currentUser.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800/60 text-emerald-300 font-extrabold">
                PEMBINA
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kamar</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Home className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{rooms.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Kamar Santri Putra & Putri</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Santri Terdata</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{students.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Total Santri di Asrama</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Menunggu Validasi</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">{pendingSubmissions.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Pengajuan Kamar Baru</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presensi Hari Ini</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-2">
              {presentCount + lateCount} / {students.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Hadir {presentCount}, Terlambat {lateCount}</p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('asrama')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'asrama'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Monitoring Kamar & Santri</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('approval')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'approval'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approval Kamar ({pendingSubmissions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presensi')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'presensi'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Presensi & Disiplin Santri</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kendala')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'kendala'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Laporan CCTV & Cazh ID</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportRooms}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Rekap Asrama</span>
          </button>
        </div>

        {/* TAB 1: MONITORING ASRAMA & KAMAR */}
        {activeTab === 'asrama' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Rooms List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">Daftar Kamar Asrama</h3>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setSelectedLocation('ALL')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                        selectedLocation === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setSelectedLocation('QN1')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                        selectedLocation === 'QN1' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      QN1 (Putri)
                    </button>
                    <button
                      onClick={() => setSelectedLocation('QN2')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                        selectedLocation === 'QN2' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      QN2 (Putra)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor kamar, gedung, atau musyrif..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Rooms Scroll List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredRooms
                    .filter((r) => {
                      const q = searchQuery.toLowerCase();
                      return (
                        r.roomNumber.toLowerCase().includes(q) ||
                        r.building.toLowerCase().includes(q) ||
                        r.supervisorName.toLowerCase().includes(q)
                      );
                    })
                    .map((room) => {
                      const count = students.filter((s) => s.roomName === room.roomNumber).length;
                      const isSelected = room.roomNumber === selectedRoomNumber;
                      const isPutri = room.location === 'QN1' || room.gender === 'P' || room.building.toLowerCase().includes('putri');

                      return (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoomNumber(room.roomNumber)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900">{room.roomNumber}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                                    isPutri ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {isPutri ? 'QN1 Putri' : 'QN2 Putra'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{room.building}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-xs text-slate-900">
                                {count} / {room.capacity}
                              </span>
                              <p className="text-[10px] text-slate-400">Santri</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                            <span>Wali Kamar: {room.supervisorName}</span>
                            <span className={count >= room.capacity ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                              {count >= room.capacity ? 'Kapasitas Penuh' : `Sisa ${room.capacity - count} Bed`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right: Selected Room Details & Members */}
            <div className="lg:col-span-7 space-y-4">
              {activeRoom ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <Home className="w-5 h-5 text-emerald-600" />
                        {activeRoom.roomNumber}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeRoom.building} • Musyrif: <strong className="text-slate-800">{activeRoom.supervisorName}</strong>
                      </p>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                      {roomMembers.length} / {activeRoom.capacity} Santri Terisi
                    </div>
                  </div>

                  {/* Members Table */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                      Daftar Anggota Santri di Kamar Ini:
                    </h4>
                    {roomMembers.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">No</th>
                              <th className="p-3">Nama Santri</th>
                              <th className="p-3">NIS / No. Kartu</th>
                              <th className="p-3">Kelas</th>
                              <th className="p-3">No. HP Ortu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {roomMembers.map((student, idx) => (
                              <tr key={student.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                <td className="p-3 font-extrabold text-slate-900">{student.name}</td>
                                <td className="p-3 font-mono text-slate-600">{student.nis}</td>
                                <td className="p-3 font-bold text-emerald-700">{student.className}</td>
                                <td className="p-3 text-slate-500">{student.parentPhone || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600">Belum ada santri yang ditempatkan di kamar ini.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-500">Pilih salah satu kamar di sebelah kiri untuk melihat rincian.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: APPROVAL CENTER */}
        {activeTab === 'approval' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  Verifikasi Pengajuan Kamar Santri
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pembina dapat memeriksa kesesuaian kamar santri yang diajukan oleh musyrif sebelum disahkan.
                </p>
              </div>
            </div>

            {submissions.length > 0 ? (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{sub.roomName}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              sub.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.status === 'APPROVED' ? 'Disetujui' : sub.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Validasi'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Diajukan oleh: <strong>{sub.supervisorName}</strong> • {new Date(sub.submittedAt).toLocaleString('id-ID')}
                        </p>
                      </div>

                      {sub.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReject(sub)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Tolak / Revisi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(sub)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Setujui Pengajuan</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Member List Preview */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Daftar Santri ({sub.studentList?.length || sub.studentIds?.length || 0} Orang):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(sub.studentList || []).map((st) => (
                          <span
                            key={st.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold"
                          >
                            {st.name} ({st.className})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl">
                <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum ada riwayat pengajuan kamar.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRESENSI & DISIPLIN SANTRI */}
        {activeTab === 'presensi' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Rekapitulasi Presensi & Disiplin Santri ({todayStr})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantauan santri yang hadir tepat waktu, terlambat, atau belum tercatat presensi.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">No</th>
                    <th className="p-3">Nama Santri</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Kamar</th>
                    <th className="p-3">Jam Masuk</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayRecords.slice(0, 50).map((rec, i) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-400">{i + 1}</td>
                      <td className="p-3 font-extrabold text-slate-900">{rec.studentName}</td>
                      <td className="p-3 font-bold text-slate-700">{rec.className}</td>
                      <td className="p-3 text-slate-600">{rec.roomName || '-'}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{rec.timeIn}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            rec.status === 'hadir'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'terlambat'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{rec.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LAPORAN CCTV & CAZH ID */}
        {activeTab === 'kendala' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" />
                Audit & Laporan Kendala Musyrif Asrama
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekap catatan CCTV kamar, kesiapan Cazh ID, dan sarana asrama santri.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activityLogs
                .filter((l) => l.category === 'laporan_kamar' || l.description.toLowerCase().includes('cctv') || l.description.toLowerCase().includes('cazh'))
                .slice(0, 20)
                .map((log) => (
                  <div key={log.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">{log.title || log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{log.description}</p>
                    <p className="text-[10px] font-bold text-emerald-700">Pelapor: {log.performedBy}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
