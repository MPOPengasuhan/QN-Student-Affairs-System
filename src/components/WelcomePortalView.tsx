import React, { useState } from 'react';
import { UserAccount, SchoolSettings } from '../types';
import {
  User,
  Settings,
  LogOut,
  ArrowRight,
  ClipboardPen,
  Shield,
  LayoutDashboard,
  QrCode,
  Sparkles,
  Home,
  CheckCircle2,
  Lock,
  GraduationCap,
  Award,
  Users,
  AlertCircle,
  Building,
  Radio,
  Maximize,
} from 'lucide-react';
import { AccountSettingsModal } from './AccountSettingsModal';
import { QOTRUN_NADA_LOGO_SVG } from '../data/mockData';

interface WelcomePortalViewProps {
  user: UserAccount;
  settings: SchoolSettings;
  onNavigateToRoomFormStandalone: () => void;
  onNavigateToScannerStandalone: () => void;
  onNavigateToMonitoringStandalone?: () => void;
  onNavigateToRoomMembers: () => void;
  onNavigateToWaliKelas: () => void;
  onNavigateToWaliKamar: () => void;
  onNavigateToPembina: () => void;
  onNavigateToPimpinan: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToDashboard: () => void;
  onLogout: () => void;
  onUserUpdated: (user: UserAccount) => void;
}

export const WelcomePortalView: React.FC<WelcomePortalViewProps> = ({
  user,
  settings,
  onNavigateToRoomFormStandalone,
  onNavigateToScannerStandalone,
  onNavigateToMonitoringStandalone,
  onNavigateToRoomMembers,
  onNavigateToWaliKelas,
  onNavigateToWaliKamar,
  onNavigateToPembina,
  onNavigateToPimpinan,
  onNavigateToAdmin,
  onNavigateToDashboard,
  onLogout,
  onUserUpdated,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);

  const teacherCode = user.teacherCode || user.username;
  const isMale = user.gender === 'L';
  const isAdmin = user.role === 'ADMIN' || user.role === 'PEMBINA';
  const isWaliKamar = user.role === 'WALI_KAMAR' || user.role === 'MUSYRIF';
  const hasAssignedRoom = Boolean(
    user.assignedRoomName &&
    user.assignedRoomName.trim() !== '' &&
    user.assignedRoomName.trim() !== '-' &&
    user.assignedRoomName.trim().toLowerCase() !== 'belum ada kamar'
  );

  const handleAdminClick = () => {
    if (isAdmin) {
      onNavigateToAdmin();
    } else {
      setShowAccessDeniedModal(true);
    }
  };

  const handleRoomMembersClick = () => {
    if (!isWaliKamar) {
      if (isAdmin) {
        alert(
          'Fitur "Atur Anggota Kamar" untuk Admin dikelola secara khusus melalui Halaman Admin (Sidebar > Atur Anggota Kamar). Kartu di portal ini khusus untuk Wali Kamar yang terdaftar pada kamar masing-masing.'
        );
      } else {
        alert(
          'Akses Ditolak: Fitur "Atur Anggota Kamar" tidak bisa diakses oleh siapapun KECUALI Wali Kamar yang sudah terdata sebagai wali kamar tersebut.'
        );
      }
      return;
    }

    if (!hasAssignedRoom) {
      alert(
        'Akun Anda belum terhubung ke kamar asrama. Silakan isi dan kirim "Form Pendataan Kamar" terlebih dahulu agar akun Anda terhubung ke kamar yang Anda ampu.'
      );
      return;
    }

    onNavigateToRoomMembers();
  };

  const handleScannerClick = () => {
    if (!isAdmin && !isWaliKamar) {
      alert(
        'Akses Ditolak: HANYA WALI KAMAR DAN ADMIN YANG BISA MELAKUKAN SCAN PRESENSI QR.'
      );
      return;
    }

    if (isWaliKamar && !hasAssignedRoom) {
      alert(
        'Presensi QR Ditolak: Akun Wali Kamar Anda belum terhubung ke kamar asrama. Silakan lengkapi Form Pendataan Kamar terlebih dahulu.'
      );
      return;
    }

    onNavigateToScannerStandalone();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Emerald Accent Line */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 w-full" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-10 flex flex-col gap-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* User Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-800 text-xl font-black shadow-inner shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            {/* User Details */}
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {user.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  Kode: {teacherCode}
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-md border ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : user.role === 'WALI_KELAS'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : user.role === 'WALI_KAMAR'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  Role: {user.role}
                </span>
                <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  {isMale ? 'Laki-laki (Putra)' : 'Perempuan (Putri)'}
                </span>
                {user.positionDetail && (
                  <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-semibold">
                    🏫 {user.positionDetail}
                  </span>
                )}
                {user.assignedRoomName && (
                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
                    🏠 {user.assignedRoomName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <button
              id="btn-account-settings"
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Pengaturan Akun</span>
            </button>
            <button
              id="btn-portal-logout"
              type="button"
              onClick={onLogout}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Section: Dedicated Dashboards by Role */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              DASHBOARD & MODUL UTAMA
            </h3>
            {!isAdmin && (
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Akses penuh sistem hanya untuk Admin
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card: Wali Kelas Dashboard */}
            {(isAdmin || user.role === 'WALI_KELAS') && (
              <div
                id="card-wali-kelas"
                onClick={onNavigateToWaliKelas}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-500 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      {user.positionDetail || 'Rombel Kelas'}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Dashboard Wali Kelas
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Cek rekapitulasi kehadiran harian siswa, status izin/sakit, dan unduh data presensi kelas.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-blue-600 gap-1.5 pt-4 border-t border-slate-100 mt-4 group-hover:translate-x-1 transition-transform">
                  <span>Buka Dashboard Kelas</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Card: Wali Kamar Dashboard */}
            {(isAdmin || user.role === 'WALI_KAMAR' || user.role === 'MUSYRIF') && (
              <div
                id="card-wali-kamar"
                onClick={onNavigateToWaliKamar}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Home className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      {user.assignedRoomName || 'Asrama'}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Dashboard Wali Kamar / Musyrif
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Kelola anggota kamar, cek absensi malam tidur, serta input laporan CCTV / Cazh ID.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-700 gap-1.5 pt-4 border-t border-slate-100 mt-4 group-hover:translate-x-1 transition-transform">
                  <span>Buka Dashboard Kamar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Card: Pembina Dashboard */}
            {(isAdmin || user.role === 'PEMBINA') && (
              <div
                id="card-pembina"
                onClick={onNavigateToPembina}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-500 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Building className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                      Pengasuhan
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">
                    Dashboard Pembina
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Monitoring asrama QN1 & QN2, validasi approval kamar santri, dan rekap kendala musyrif.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-amber-700 gap-1.5 pt-4 border-t border-slate-100 mt-4 group-hover:translate-x-1 transition-transform">
                  <span>Buka Dashboard Pembina</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Card: Pimpinan Dashboard */}
            {(isAdmin || user.role === 'PIMPINAN') && (
              <div
                id="card-pimpinan"
                onClick={onNavigateToPimpinan}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-purple-500 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Award className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                      Eksekutif
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
                    Dashboard Pimpinan
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Pantau rasio kampus (QN1 Putri & QN2 Putra), statistik kehadiran, dan laporan kepengasuhan.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-purple-700 gap-1.5 pt-4 border-t border-slate-100 mt-4 group-hover:translate-x-1 transition-transform">
                  <span>Buka Laporan Pimpinan</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section: Standalone Forms & System Tools */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            FORM STANDALONE & SISTEM
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 0. Dashboard Monitoring Real-Time Standalone (Layar Penuh TV) */}
            <div
              id="card-monitoring-standalone"
              onClick={onNavigateToMonitoringStandalone || onNavigateToDashboard}
              className="bg-white rounded-2xl p-5 border border-emerald-200 bg-emerald-50/20 shadow-xs hover:shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Mode TV / Terpisah
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Monitoring Real-Time
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Dashboard terpisah (tanpa sidebar) untuk TV monitor & pusat pantau santri.
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-emerald-700 gap-1 pt-3 border-t border-emerald-100 mt-3 group-hover:translate-x-1 transition-transform">
                <span>Buka Layar Penuh</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 1. Form Pengisian Kamar Standalone */}
            <div
              id="card-form-kamar-standalone"
              onClick={onNavigateToRoomFormStandalone}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <ClipboardPen className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Form Pendataan Kamar
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Formulir mandiri musyrif untuk verifikasi santri & CCTV kamar.
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-emerald-700 gap-1 pt-3 border-t border-slate-100 mt-3 group-hover:translate-x-1 transition-transform">
                <span>Buka Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 2. Scanner Presensi Standalone */}
            <div
              id="card-scanner-standalone"
              onClick={handleScannerClick}
              className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer ${
                isAdmin || (isWaliKamar && hasAssignedRoom)
                  ? 'border-slate-200 hover:border-indigo-500'
                  : 'border-slate-200 opacity-80 hover:border-amber-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isAdmin
                        ? 'bg-emerald-100 text-emerald-800'
                        : isWaliKamar && hasAssignedRoom
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isAdmin
                      ? 'Admin Pengasuhan'
                      : isWaliKamar && hasAssignedRoom
                      ? `Kamar ${user.assignedRoomName}`
                      : 'Wali Kamar & Admin'}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <span>Scanner Presensi QR</span>
                  {(!isAdmin && (!isWaliKamar || !hasAssignedRoom)) && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 inline" />
                  )}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Kamera pemindai presensi mandiri kamar (Harian & Sebelum Tidur).
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-indigo-700 gap-1 pt-3 border-t border-slate-100 mt-3 group-hover:translate-x-1 transition-transform">
                <span>Buka Kamera</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 3. Atur Anggota Kamar (Hanya Wali Kamar terdaftar di portal; Admin via Halaman Admin) */}
            <div
              id="card-room-members"
              onClick={handleRoomMembersClick}
              className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer ${
                isWaliKamar && hasAssignedRoom
                  ? 'border-slate-200 hover:border-amber-500'
                  : 'border-slate-200 opacity-80 hover:border-rose-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isWaliKamar && hasAssignedRoom
                        ? 'bg-amber-100 text-amber-800'
                        : isWaliKamar && !hasAssignedRoom
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isWaliKamar && hasAssignedRoom
                      ? `Kamar ${user.assignedRoomName}`
                      : isWaliKamar
                      ? 'Belum Terhubung Kamar'
                      : 'Khusus Wali Kamar'}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                  <span>Atur Anggota Kamar</span>
                  {(!isWaliKamar || !hasAssignedRoom) && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 inline" />
                  )}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isWaliKamar && hasAssignedRoom
                    ? `Kelola santri anggota kamar ${user.assignedRoomName}.`
                    : 'Kelola santri khusus kamar yang terhubung ke akun Wali Kamar.'}
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-amber-700 gap-1 pt-3 border-t border-slate-100 mt-3 group-hover:translate-x-1 transition-transform">
                <span>{isWaliKamar && hasAssignedRoom ? 'Kelola Kamar Saya' : 'Khusus Wali Kamar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 4. Full Admin System */}
            <div
              id="card-admin-system"
              onClick={handleAdminClick}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between group cursor-pointer ${
                isAdmin
                  ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 shadow-md'
                  : 'bg-slate-50 border-slate-200 text-slate-500 opacity-90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isAdmin ? 'bg-white/10 text-emerald-400' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isAdmin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isAdmin ? 'Akses Penuh' : 'Khusus Admin'}
                  </span>
                </div>
                <h4 className={`text-sm font-extrabold ${isAdmin ? 'text-white' : 'text-slate-700'}`}>
                  System Admin Portal
                </h4>
                <p className="text-xs opacity-80 mt-1">
                  Manajemen master data, akun guru, log aktivitas, dan pengaturan pesantren.
                </p>
              </div>
              <div className={`flex items-center text-xs font-bold gap-1 pt-3 border-t mt-3 group-hover:translate-x-1 transition-transform ${
                isAdmin ? 'border-slate-800 text-emerald-400' : 'border-slate-200 text-slate-500'
              }`}>
                <span>{isAdmin ? 'Masuk ke Portal Admin' : 'Hanya Role Admin'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Access Denied Modal for Non-Admins */}
      {showAccessDeniedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Akses System Admin Dibatasi
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hanya pengguna dengan role <strong>ADMIN</strong> yang memiliki hak akses penuh ke modul pengaturan sistem, database guru, dan log.
              </p>
              <p className="text-xs text-slate-500">
                Sebagai <strong>{user.role}</strong> ({user.name}), silakan gunakan Dashboard Wali Kelas, Dashboard Wali Kamar, atau Form Standalone yang telah disediakan di atas.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAccessDeniedModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {showSettingsModal && (
        <AccountSettingsModal
          user={user}
          onClose={() => setShowSettingsModal(false)}
          onUserUpdated={(updated) => {
            onUserUpdated(updated);
          }}
        />
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white/50">
        <p className="font-medium">
          Berkhidmat Untuk Ummat – QN Student Affairs System &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
