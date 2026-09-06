import React, { useState, useEffect } from 'react';
import { ViewTab, SchoolSettings, UserAccount } from '../types';
import {
  Menu,
  Clock,
  Calendar,
  QrCode,
  School,
  Sparkles,
  CheckCircle2,
  LogOut,
  User,
  Home,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import { AccountSettingsModal } from './AccountSettingsModal';

interface HeaderProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  settings: SchoolSettings;
  currentUser?: UserAccount | null;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  todayAttendedCount: number;
  totalStudentsCount: number;
  onReturnToPortal?: () => void;
  onLogout?: () => void;
  onUserUpdated?: (user: UserAccount) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
  todayAttendedCount,
  totalStudentsCount,
  onReturnToPortal,
  onLogout,
  onUserUpdated,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const tabTitles: Record<ViewTab, { title: string; subtitle: string }> = {
    monitoring: {
      title: 'Dashboard Monitoring Real-Time v2.1',
      subtitle: 'Ringkasan progres penempatan kamar santri, kapasitas asrama, & SDM Dewan Asatidz',
    },
    room_members: {
      title: 'Pengaturan & Anggota Kamar Asrama',
      subtitle: 'Kelola alokasi santri per kamar, tambah santri, hapus, dan pindah kamar secara fleksibel',
    },
    room_form: {
      title: 'Form Pengisian Kamar Santri',
      subtitle: 'Modul Musyrif/Wali Kamar untuk pendaftaran santri kamar asrama & absen tidur malam',
    },
    approval: {
      title: 'Approval Center & Audit Kamar',
      subtitle: 'Validasi & persetujuan pengajuan penempatan santri asrama dari para Musyrif',
    },
    wali_kelas: {
      title: 'Dashboard Wali Kelas',
      subtitle: 'Pantau rekapitulasi kehadiran harian santri, tandai izin/sakit, dan ekspor data kelas',
    },
    wali_kamar: {
      title: 'Dashboard Wali Kamar / Musyrif',
      subtitle: 'Kelola anggota kamar, cek absensi tidur malam, dan input laporan CCTV kamar',
    },
    pembina: {
      title: 'Dashboard Pembina Asrama',
      subtitle: 'Monitoring menyeluruh kepengasuhan santri QN1 & QN2, validasi approval, dan kendala asrama',
    },
    pimpinan: {
      title: 'Dashboard Eksekutif Pimpinan',
      subtitle: 'Statistik pesantren, rasio kampus QN1/QN2, kepengasuhan santri, & laporan kehadiran',
    },
    scanner: {
      title: 'Kamera Scanner Presensi QR',
      subtitle: 'Arahkan QR Code kartu santri ke webcam atau unggah gambar QR',
    },
    dashboard: {
      title: 'Dashboard Presensi Harian',
      subtitle: 'Pantau rekapitulasi kehadiran santri, grafik rombel kelas, dan statistik hari ini',
    },
    students: {
      title: 'Database Santri / Siswa',
      subtitle: 'Kelola data santri, import Excel, cetak kartu tanda santri QR, dan manajemen kamar',
    },
    teachers: {
      title: 'Database Dewan Asatidz & Guru',
      subtitle: 'Kelola data ustadz/ustadzah pengajar, NIP, nomor WA, mata pelajaran, dan tugas musyrif',
    },
    rooms: {
      title: 'Database Kamar & Asrama Santri',
      subtitle: 'Kelola data asrama, nomor kamar, kapasitas hunian, dan musyrif pembimbing',
    },
    rekap: {
      title: 'Rekapitulasi Kehadiran',
      subtitle: 'Matriks kehadiran bulanan, filter rombel, dan cetak laporan resmi',
    },
    googlesheets: {
      title: 'Integrasi Google Sheets Database',
      subtitle: 'Sinkronisasi 2 arah data santri, guru, kamar, & presensi ke Google Spreadsheet resmi',
    },
    publish_center: {
      title: 'Publish Center (Landing Page & Info)',
      subtitle: 'Sesuaikan logo, judul, deskripsi, dan 3 kartu informasi interaktif landing page',
    },
    users: {
      title: 'Kelola User & Akun Guru',
      subtitle: 'Manajemen hak akses akun (ADMIN, MUSYRIF, GURU, PIKET) & reset password',
    },
    activity_logs: {
      title: 'Audit Log Aktivitas Sistem',
      subtitle: 'Riwayat pencatatan presensi, validasi kamar, login pengguna, dan sinkronisasi',
    },
    room_logs: {
      title: 'Log Pengisian Kamar & Anggota',
      subtitle: 'Audit trail pengisian kamar, penambahan/penghapusan santri, dan riwayat reset kamar',
    },
    settings_presensi: {
      title: 'Pengaturan Presensi & Jadwal Pengabsenan',
      subtitle: 'Konfigurasi jam masuk/tidur kamar, toleransi keterlambatan, dan jadwal hari aktif',
    },
    settings: {
      title: 'Pengaturan Profil Pesantren',
      subtitle: 'Identitas pondok pesantren, logo resmi, kop surat laporan, dan pemulihan cadangan cloud',
    },
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        {/* Top Meta Bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Cloud Terhubung</span>
            </div>

            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:inline font-semibold text-slate-700">
              {settings.schoolName}
            </span>
            <span className="hidden md:inline text-slate-400">
              (TA {settings.academicYear} - {settings.semester})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDate}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Main Bar with Menu Toggle */}
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Toggle */}
            <button
              id="mobile-sidebar-toggle-btn"
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors border border-emerald-200 cursor-pointer shadow-xs"
              title="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop 3-Strip Highlight Toggle */}
            <button
              id="desktop-sidebar-strip-toggle"
              onClick={onToggleSidebar}
              className={`hidden lg:flex items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer border shadow-xs ${
                isSidebarCollapsed
                  ? 'bg-[#064e3b] text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border-slate-200'
              }`}
              title="Klik 3 Strip untuk Membuka / Menutup Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page Heading and Subtitle */}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                {tabTitles[activeTab]?.title || 'QN Student Affairs System'}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {tabTitles[activeTab]?.subtitle || 'Pondok Pesantren Qotrun Nada'}
              </p>
            </div>
          </div>

          {/* Action Controls & Quick Links */}
          <div className="flex items-center gap-2">
            {/* Return to Portal button */}
            {onReturnToPortal && (
              <button
                type="button"
                onClick={onReturnToPortal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                title="Kembali ke Portal Selamat Datang"
              >
                <Home className="w-3.5 h-3.5 text-emerald-700" />
                <span>Portal Hub</span>
              </button>
            )}

            {/* User Account Button */}
            {currentUser && (
              <button
                type="button"
                onClick={() => setShowAccountModal(true)}
                className="inline-flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                title="Pengaturan Akun"
              >
                <User className="w-4 h-4 text-emerald-700" />
                <span className="hidden md:inline truncate max-w-[120px]">{currentUser.name}</span>
              </button>
            )}

            {onLogout && (
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Account Settings Modal */}
      {showAccountModal && currentUser && (
        <AccountSettingsModal
          user={currentUser}
          onClose={() => setShowAccountModal(false)}
          onUserUpdated={(updated) => {
            if (onUserUpdated) onUserUpdated(updated);
          }}
        />
      )}
    </>
  );
};
