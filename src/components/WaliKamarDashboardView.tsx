import React, { useState } from 'react';
import { Student, Room, AttendanceRecord, SchoolSettings, UserAccount, ActivityLog, RoomAssignmentSubmission } from '../types';
import { storageService } from '../services/storageService';
import * as XLSX from 'xlsx';
import {
  Home,
  Users,
  Bed,
  Moon,
  ClipboardPen,
  Video,
  Globe,
  FileSpreadsheet,
  Download,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Trash2,
  FileText,
  QrCode,
  ShieldCheck,
  Clock,
  RotateCcw,
  UserCheck,
  User,
  MapPin,
  Lock,
} from 'lucide-react';
import { getTodayDateStr } from '../data/mockData';

interface WaliKamarDashboardViewProps {
  currentUser: UserAccount;
  rooms: Room[];
  students: Student[];
  records: AttendanceRecord[];
  activityLogs: ActivityLog[];
  settings: SchoolSettings;
  onBackToPortal?: () => void;
  onBack?: () => void;
  onOpenStandaloneForm: (roomNumber: string) => void;
  onOpenMemberManagement: (roomNumber: string) => void;
  onOpenScanner?: () => void;
  onRefresh: () => void;
}

export const WaliKamarDashboardView: React.FC<WaliKamarDashboardViewProps> = ({
  currentUser,
  rooms,
  students,
  records,
  activityLogs,
  settings,
  onBackToPortal,
  onBack,
  onOpenStandaloneForm,
  onOpenMemberManagement,
  onOpenScanner,
  onRefresh,
}) => {
  const handleBack = onBackToPortal || onBack || (() => {});
  
  // Find current room assigned to this Wali Kamar
  const assignedRoomName = currentUser.assignedRoomName;
  const currentRoom = rooms.find(
    (r) =>
      r.roomNumber === assignedRoomName ||
      r.supervisorName?.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
  );

  // Check latest submission in storage for this user
  const latestSubmission = storageService.getLatestSubmissionForUser(
    currentUser.name,
    currentUser.username
  );

  const [activeTab, setActiveTab] = useState<'members' | 'night_check' | 'logs'>('members');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Night Attendance State
  const [nightStatuses, setNightStatuses] = useState<Record<string, 'hadir' | 'sakit' | 'izin' | 'alpa'>>({});
  const [nightNotes, setNightNotes] = useState<string>('');
  const [isSubmittingNight, setIsSubmittingNight] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // If user has NOT been assigned an approved room yet
  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  PORTAL WALI KAMAR
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  Status Kamar & Musyrif: {currentUser.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Conditional States based on procedural submission */}
          {latestSubmission && latestSubmission.status === 'PENDING' ? (
            <div className="bg-white rounded-2xl p-8 border border-amber-200 shadow-xs text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Pengajuan Kamar Sedang Menunggu Validasi Admin
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2">
                  Anda telah mengajukan pendataan untuk <strong>Kamar {latestSubmission.roomName}</strong> ({latestSubmission.studentIds?.length || 0} santri) di Pondok {latestSubmission.location}. Form ini sedang dalam antrean di <strong>Approval Center</strong>.
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs max-w-md mx-auto text-left space-y-1">
                <p><strong>Nomor Kamar:</strong> {latestSubmission.roomName}</p>
                <p><strong>Pondok & JK:</strong> Pondok {latestSubmission.location} • {latestSubmission.gender === 'L' ? 'Putra' : 'Putri'}</p>
                <p><strong>Waktu Pengajuan:</strong> {latestSubmission.submittedAt}</p>
                <p><strong>Status:</strong> <span className="font-bold text-amber-700">PENDING APPROVAL</span></p>
              </div>

              <p className="text-xs text-slate-400">
                Setelah Admin menyetujui pengajuan, akun Anda otomatis aktif sebagai Wali Kamar resmi dan dashboard kamar akan terbuka.
              </p>

              <button
                type="button"
                onClick={onRefresh}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Cek Status Approval Sekarang</span>
              </button>
            </div>
          ) : latestSubmission && latestSubmission.status === 'REJECTED' ? (
            <div className="bg-white rounded-2xl p-8 border border-rose-200 shadow-xs text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Pengajuan Kamar Ditolak oleh Admin
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2">
                  Pengajuan sebelumnya untuk <strong>Kamar {latestSubmission.roomName}</strong> belum disetujui. Sesuai prosedur, silakan lakukan <strong>pengisian ulang</strong> data kamar dan anggota santri.
                </p>
              </div>

              {latestSubmission.rejectionReason && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs max-w-md mx-auto text-left">
                  <p className="font-bold text-rose-800">Catatan Admin:</p>
                  <p className="text-rose-700 mt-0.5">{latestSubmission.rejectionReason}</p>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => onOpenStandaloneForm(latestSubmission.roomName)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <ClipboardPen className="w-4 h-4" />
                  <span>Lakukan Pengisian Ulang Form Pendataan Kamar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <Home className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Belum Memiliki Kamar Kelolaan
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2">
                  Seluruh santri belum mendapatkan kamar sampai guru mengisi form pendataan kamar.
                  Silakan isi form pendataan kamar untuk mendaftarkan kamar dan santri binaan Anda. Setelah disetujui admin, Anda resmi menjadi Wali Kamar tersebut.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onOpenStandaloneForm('')}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Isi Form Pendataan Kamar Baru</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active room details
  const roomName = currentRoom.roomNumber;
  const roomMembers = students.filter((s) => s.roomName === roomName);

  const filteredMembers = roomMembers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.noKartu && s.noKartu.includes(q)) ||
      s.className.toLowerCase().includes(q)
    );
  });

  // Room specific activity logs
  const roomLogs = activityLogs.filter((l) => {
    const desc = l.description.toLowerCase();
    const rName = roomName.toLowerCase();
    return (
      desc.includes(rName) ||
      (l.metadata && l.metadata.roomName && l.metadata.roomName === roomName) ||
      l.type === 'kamar' ||
      l.type === 'laporan_kamar'
    );
  });

  // Night attendance save
  const handleSaveNightAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNight(true);

    const todayStr = getTodayDateStr();
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let hadirCount = 0;
    roomMembers.forEach((st) => {
      const stStatus = nightStatuses[st.id] || 'hadir';
      if (stStatus === 'hadir') hadirCount++;

      storageService.recordAttendance({
        studentId: st.id,
        studentNis: st.nis,
        studentName: st.name,
        className: st.className,
        roomName: roomName,
        date: todayStr,
        timeIn: timeNow,
        status: stStatus,
        notes: `Cek Malam Kamar: ${stStatus.toUpperCase()}${nightNotes ? ` (${nightNotes})` : ''}`,
        recordedBy: currentUser.name,
      });
    });

    storageService.addActivityLog(
      'laporan_kamar',
      'Pengecekan Malam Kamar',
      `Wali Kamar ${currentUser.name} menyelesaikan absensi malam di ${roomName}: ${hadirCount}/${roomMembers.length} santri hadir.${nightNotes ? ` Catatan: ${nightNotes}` : ''}`,
      currentUser.name,
      'laporan_kamar',
      { roomName, total: roomMembers.length, hadirCount, nightNotes }
    );

    setIsSubmittingNight(false);
    onRefresh();
    showToast(`Absensi malam kamar ${roomName} berhasil disimpan!`);
  };

  // Export room members to Excel
  const handleExportRoomExcel = () => {
    const data = roomMembers.map((s, idx) => ({
      NO: idx + 1,
      'NIP PONDOK': s.nis,
      'NAMA SANTRI': s.name,
      KELAS: s.className,
      JK: s.gender === 'L' ? 'Putra' : 'Putri',
      PONDOK: s.tempat || currentRoom.location || '-',
      'KAMAR ASRAMA': roomName,
      'WALI KAMAR': currentUser.name,
      'NO KARTU / RFID': s.noKartu || s.nisn || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Kamar_${roomName}`);
    XLSX.writeFile(wb, `Data_Santri_Kamar_${roomName}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handleBack}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Kembali ke Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  DASHBOARD WALI KAMAR RESMI
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  Pondok {currentRoom.location} • {currentRoom.gender === 'L' ? 'Putra' : 'Putri'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  T.A {settings.academicYear} • Semester {settings.semester}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <Home className="w-6 h-6 text-emerald-600" />
                Kamar {roomName} • {currentRoom.building}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Wali Kamar: <strong className="text-slate-800">{currentUser.name}</strong> • Akses eksklusif kelola kamar & presensi santri.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Hanya dapat mempresensi santri kamar ini"
              >
                <QrCode className="w-4 h-4" />
                <span>Presensi QR Kamar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenMemberManagement(roomName)}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Atur Anggota Kamar</span>
            </button>

            <button
              type="button"
              onClick={handleExportRoomExcel}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rekap</span>
            </button>
          </div>
        </div>

        {/* Room Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Anggota Kamar</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{roomMembers.length} Santri</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Kapasitas: {currentRoom.capacity || 10} Kasur</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lokasi & Gedung</p>
            <p className="text-lg font-extrabold text-slate-900 mt-1">Pondok {currentRoom.location}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{currentRoom.building}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenis Kelamin</p>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {currentRoom.gender === 'L' ? 'Santri Putra' : 'Santri Putri'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Kamar Terverifikasi Admin</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs bg-emerald-50/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Status Otorisasi</p>
            <div className="flex items-center gap-1.5 mt-1 text-emerald-800 font-extrabold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Wali Kamar Aktif</span>
            </div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Kamar Terkunci Untuk Guru Lain</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'members'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Anggota ({roomMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('night_check')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'night_check'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Pengecekan Presensi Malam</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Log Pengisian & Aktivitas ({roomLogs.length})</span>
          </button>
        </div>

        {/* Tab 1: Daftar Anggota Kamar */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Daftar Santri Kamar {roomName}
                </h2>
                <p className="text-xs text-slate-500">
                  Hanya Wali Kamar terdaftar yang berhak mengatur santri dan mempresensi anggota kamar ini.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari santri, NIP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">No</th>
                    <th className="py-3 px-4">NIP Pondok</th>
                    <th className="py-3 px-4">Nama Santri</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Pondok & JK</th>
                    <th className="py-3 px-4">No. Kartu / RFID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Belum ada anggota di kamar {roomName}.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">{s.nis}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold">
                            Kelas {s.className}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          Pondok {s.tempat || currentRoom.location} • {s.gender === 'L' ? 'Putra' : 'Putri'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{s.noKartu || s.nisn || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Pengecekan Presensi Malam */}
        {activeTab === 'night_check' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-600" />
                  Presensi Malam Santri Kamar {roomName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lakukan pengecekan fisik keberadaan seluruh santri kamar menjelang jam istirahat malam.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
                Tanggal: {getTodayDateStr()}
              </span>
            </div>

            <form onSubmit={handleSaveNightAttendance} className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">No</th>
                      <th className="py-2.5 px-3">Nama Santri</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3 text-center">Status Kehadiran Malam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roomMembers.map((st, idx) => {
                      const curStatus = nightStatuses[st.id] || 'hadir';
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{st.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{st.className}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {(['hadir', 'sakit', 'izin', 'alpa'] as const).map((stat) => (
                                <button
                                  type="button"
                                  key={stat}
                                  onClick={() =>
                                    setNightStatuses((prev) => ({ ...prev, [st.id]: stat }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                                    curStatus === stat
                                      ? stat === 'hadir'
                                        ? 'bg-emerald-600 text-white'
                                        : stat === 'sakit'
                                        ? 'bg-blue-600 text-white'
                                        : stat === 'izin'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-rose-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {stat}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan Presensi Malam (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Santri Ahmad izin ke poskestren jam 21:00..."
                  value={nightNotes}
                  onChange={(e) => setNightNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingNight}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingNight ? 'Menyimpan...' : 'Simpan Presensi Malam'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Log Pengisian & Aktivitas Kamar */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Log Riwayat & Audit Kamar {roomName}
              </h2>
              <p className="text-xs text-slate-500">
                Catatan historis pengisian data kamar, persetujuan admin, dan presensi malam.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {roomLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada log aktivitas tercatat untuk kamar {roomName}.
                </div>
              ) : (
                roomLogs.map((log) => (
                  <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-extrabold text-slate-900">{log.action}</p>
                        <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{log.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Oleh: {log.actor}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
