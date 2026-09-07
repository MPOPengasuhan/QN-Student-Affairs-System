import React, { useState, useEffect } from 'react';
import { ViewTab, SchoolSettings } from '../types';
import { QOTRUN_NADA_LOGO_SVG } from '../data/mockData';
import {
  QrCode,
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  Settings as SettingsIcon,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  Home,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  settings: SchoolSettings;
  todayAttendedCount: number;
  totalStudentsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  todayAttendedCount,
  totalStudentsCount,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

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

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: `${todayAttendedCount}/${totalStudentsCount}`,
    },
    {
      id: 'scanner',
      label: 'Scan QR',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'students',
      label: 'Data Santri',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'teachers',
      label: 'Dewan Asatidz',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'rooms',
      label: 'Kamar Asrama',
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'rekap',
      label: 'Rekap Presensi',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: <SettingsIcon className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Subtle Status Bar */}
      <div className="bg-slate-50 border-b border-slate-100 text-xs px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2 text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-medium text-emerald-700">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span>Sistem Aktif & Terhubung</span>
          </div>
          <span className="hidden md:inline text-slate-300">•</span>
          <span className="hidden md:inline text-slate-500 font-medium">
            Tahun Ajaran {settings.academicYear} ({settings.semester})
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-500 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDate}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Main Clean Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand / Logo */}
          <div
            id="brand-logo-section"
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setActiveTab('dashboard')}
          >
            <img
              src={settings.logoUrl || QOTRUN_NADA_LOGO_SVG}
              alt="Logo Pondok Pesantren Qotrun Nada"
              className="w-10 h-10 object-contain drop-shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = QOTRUN_NADA_LOGO_SVG;
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                  E-Presensi Santri
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[180px] sm:max-w-[260px]">
                {settings.schoolName}
              </p>
            </div>
          </div>

          {/* Navigation Items (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-blue-100 text-blue-800 font-bold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Scanner Quick Action Button */}
          <div className="flex items-center gap-2">
            <button
              id="quick-scan-button"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'scanner'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Kamera Scanner</span>
              <span className="sm:hidden">Scan</span>
            </button>
          </div>
        </div>

        {/* Mobile / Medium Screen Navigation Tabs */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-mobile-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-full ${
                      isActive ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

