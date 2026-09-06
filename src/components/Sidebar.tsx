import React from 'react';
import { ViewTab, SchoolSettings, UserAccount } from '../types';
import {
  QrCode,
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
  Home,
  FileText,
  Sparkles,
  ClipboardPen,
  Clock,
  ArrowLeft,
  GraduationCap,
  Award,
  ExternalLink,
  Lock,
  Maximize,
  School,
  ClipboardList,
} from 'lucide-react';
import { QOTRUN_NADA_LOGO_SVG } from '../data/mockData';

interface SidebarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  settings: SchoolSettings;
  currentUser?: UserAccount | null;
  pendingApprovalCount?: number;
  todayAttendedCount: number;
  totalStudentsCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onReturnToPortal?: () => void;
  onOpenStandaloneForm?: () => void;
  onOpenStandaloneScanner?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  pendingApprovalCount = 0,
  todayAttendedCount,
  totalStudentsCount,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onReturnToPortal,
  onOpenStandaloneForm,
  onOpenStandaloneScanner,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const role = currentUser?.role || 'GURU';

  // Base navigation sections customized by role
  const allSections: {
    sectionTitle: string;
    items: {
      id: ViewTab;
      label: string;
      icon: React.ReactNode;
      badge?: string;
      badgeColor?: string;
      action?: () => void;
      isExternal?: boolean;
      allowedRoles?: string[];
    }[];
  }[] = [
    {
      sectionTitle: 'PENGASUHAN & ASRAMA',
      items: [
        {
          id: 'monitoring',
          label: 'Dashboard Monitoring v2.1',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0 text-teal-400" />,
          allowedRoles: ['ADMIN', 'PEMBINA', 'PIMPINAN'],
        },
        {
          id: 'room_members',
          label: 'Atur Anggota Kamar (Admin)',
          icon: <Users className="w-4 h-4 shrink-0 text-amber-400" />,
          allowedRoles: ['ADMIN'],
        },
        {
          id: 'approval',
          label: 'Approval Center Kamar',
          icon: <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />,
          badge: pendingApprovalCount > 0 ? `${pendingApprovalCount}` : undefined,
          badgeColor: 'bg-amber-500 text-white',
          allowedRoles: ['ADMIN', 'PEMBINA'],
        },
        {
          id: 'room_form',
          label: 'Form Kamar (Standalone)',
          icon: <ClipboardPen className="w-4 h-4 shrink-0 text-emerald-400" />,
          action: onOpenStandaloneForm,
          isExternal: true,
          allowedRoles: ['ADMIN', 'WALI_KAMAR', 'MUSYRIF', 'PEMBINA'],
        },
      ],
    },
    {
      sectionTitle: 'DASHBOARD JABATAN',
      items: [
        {
          id: 'wali_kelas',
          label: 'Dashboard Wali Kelas',
          icon: <GraduationCap className="w-4 h-4 shrink-0 text-blue-400" />,
          allowedRoles: ['ADMIN', 'WALI_KELAS'],
        },
        {
          id: 'wali_kamar',
          label: 'Dashboard Wali Kamar',
          icon: <Home className="w-4 h-4 shrink-0 text-emerald-400" />,
          allowedRoles: ['ADMIN', 'WALI_KAMAR', 'MUSYRIF'],
        },
        {
          id: 'pembina',
          label: 'Dashboard Pembina',
          icon: <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />,
          allowedRoles: ['ADMIN', 'PEMBINA'],
        },
        {
          id: 'pimpinan',
          label: 'Dashboard Pimpinan',
          icon: <Award className="w-4 h-4 shrink-0 text-purple-400" />,
          allowedRoles: ['ADMIN', 'PIMPINAN'],
        },
      ],
    },
    {
      sectionTitle: 'PRESENSI & SCANNER',
      items: [
        {
          id: 'scanner',
          label: 'Scanner QR (Standalone)',
          icon: <QrCode className="w-4 h-4 shrink-0 text-emerald-400" />,
          action: onOpenStandaloneScanner,
          isExternal: true,
          allowedRoles: ['ADMIN', 'WALI_KAMAR', 'MUSYRIF'],
        },
        {
          id: 'dashboard',
          label: 'Dashboard Presensi',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0 text-blue-400" />,
          badge: `${todayAttendedCount}/${totalStudentsCount}`,
          allowedRoles: ['ADMIN', 'PIKET', 'OPERATOR', 'PIMPINAN', 'PEMBINA'],
        },
        {
          id: 'rekap',
          label: 'Rekapitulasi Presensi',
          icon: <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-300" />,
          allowedRoles: ['ADMIN', 'PIKET', 'OPERATOR', 'WALI_KELAS', 'PIMPINAN', 'PEMBINA'],
        },
      ],
    },
    {
      sectionTitle: 'MASTER DATA PESANTREN',
      items: [
        {
          id: 'students',
          label: 'Data Santri (No. Kartu)',
          icon: <Users className="w-4 h-4 shrink-0 text-blue-400" />,
          allowedRoles: ['ADMIN', 'OPERATOR'],
        },
        {
          id: 'teachers',
          label: 'Dewan Asatidz & Guru',
          icon: <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />,
          allowedRoles: ['ADMIN', 'OPERATOR'],
        },
        {
          id: 'rooms',
          label: 'Kamar & Komplek Asrama',
          icon: <Home className="w-4 h-4 shrink-0 text-amber-400" />,
          allowedRoles: ['ADMIN', 'PEMBINA', 'OPERATOR'],
        },
        {
          id: 'googlesheets',
          label: 'Database Google Sheets',
          icon: <FileText className="w-4 h-4 shrink-0 text-emerald-400" />,
          allowedRoles: ['ADMIN'],
        },
      ],
    },
    {
      sectionTitle: 'PENGATURAN SYSTEM (ADMIN)',
      items: [
        {
          id: 'publish_center',
          label: 'Publish Center Info',
          icon: <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />,
          allowedRoles: ['ADMIN'],
        },
        {
          id: 'users',
          label: 'Kelola User & Akun Guru',
          icon: <Users className="w-4 h-4 shrink-0 text-purple-400" />,
          allowedRoles: ['ADMIN'],
        },
        {
          id: 'activity_logs',
          label: 'Log Aktivitas Sistem',
          icon: <Clock className="w-4 h-4 shrink-0 text-slate-400" />,
          allowedRoles: ['ADMIN'],
        },
        {
          id: 'room_logs',
          label: 'Log Pengisian Kamar',
          icon: <ClipboardList className="w-4 h-4 shrink-0 text-teal-400" />,
          allowedRoles: ['ADMIN', 'PEMBINA'],
        },
        {
          id: 'settings_presensi',
          label: 'Pengaturan Presensi & Jadwal',
          icon: <Clock className="w-4 h-4 shrink-0 text-emerald-400" />,
          allowedRoles: ['ADMIN'],
        },
        {
          id: 'settings',
          label: 'Pengaturan Profil Pesantren',
          icon: <School className="w-4 h-4 shrink-0 text-blue-400" />,
          allowedRoles: ['ADMIN'],
        },
      ],
    },
  ];

  // Filter sections by user role
  const navSections = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => isAdmin || !item.allowedRoles || item.allowedRoles.includes(role)
      ),
    }))
    .filter((section) => section.items.length > 0);

  const handleSelectTab = (tab: ViewTab, action?: () => void) => {
    if (action) {
      action();
    } else {
      setActiveTab(tab);
    }
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0c1a16] text-slate-100 flex flex-col border-r border-emerald-950/80 transition-all duration-300 ease-in-out selection:bg-emerald-600
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-900/60 shrink-0">
          <div
            className={`flex items-center gap-3 overflow-hidden cursor-pointer select-none ${
              isCollapsed ? 'lg:justify-center w-full' : ''
            }`}
            onClick={onReturnToPortal || (() => handleSelectTab('monitoring'))}
            title={settings.schoolName}
          >
            {/* Logo Emblem */}
            <div className="w-9 h-9 rounded-xl bg-emerald-900/80 border border-emerald-500/30 flex items-center justify-center text-white font-bold shrink-0 shadow-inner overflow-hidden p-1">
              <img
                src={settings.logoUrl || QOTRUN_NADA_LOGO_SVG}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = QOTRUN_NADA_LOGO_SVG;
                }}
              />
            </div>

            {/* Brand Title (hidden when collapsed on desktop) */}
            <div className={`min-w-0 transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white tracking-tight leading-tight">
                  QN Student Affairs
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
                Pondok Pesantren Qotrun Nada
              </p>
            </div>
          </div>

          {/* Desktop 3-Strip Toggle Button (when expanded) */}
          <button
            id="sidebar-toggle-btn"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer ${
              isCollapsed
                ? 'bg-[#064e3b] text-white ring-2 ring-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-emerald-900/40'
            }`}
            title={isCollapsed ? 'Buka Sidebar Menu (3 Strip)' : 'Ciutkan Sidebar Menu (3 Strip)'}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-900/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collapsed Top 3-Strip Trigger on Desktop (when collapsed) */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-emerald-900/60">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-xl bg-[#064e3b] text-white shadow-md hover:bg-emerald-800 transition-all cursor-pointer ring-2 ring-emerald-400/50"
              title="Klik 3 Strip untuk Memperluas Menu Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Return to Welcome Portal Button */}
        {onReturnToPortal && (
          <div className={`p-2.5 border-b border-emerald-950/80 ${isCollapsed ? 'lg:px-2' : 'px-3'}`}>
            <button
              onClick={onReturnToPortal}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 transition-colors cursor-pointer ${
                isCollapsed ? 'lg:justify-center lg:px-1.5' : ''
              }`}
              title="Kembali ke Portal Utama (Hub)"
            >
              <ArrowLeft className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                Portal Utama (Hub)
              </span>
            </button>
          </div>
        )}

        {/* Navigation Sections & Items */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-500/70">
                  {section.sectionTitle}
                </div>
              )}

              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => handleSelectTab(item.id, item.action)}
                    title={item.label}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group relative ${
                      isActive
                        ? 'bg-[#064e3b] text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/40 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
                    } ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                  >
                    {/* Active Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-400 rounded-r-full" />
                    )}

                    <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                      {item.icon}
                    </span>

                    <span
                      className={`truncate text-left transition-opacity duration-200 ${
                        isCollapsed ? 'lg:hidden' : 'block'
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* External Link Indicator */}
                    {item.isExternal && !isCollapsed && (
                      <ExternalLink className="w-3 h-3 text-slate-500 ml-auto group-hover:text-emerald-300 shrink-0" />
                    )}

                    {/* Badge */}
                    {item.badge && !item.isExternal && (
                      <span
                        className={`ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded-full transition-opacity duration-200 ${
                          item.badgeColor ||
                          (isActive
                            ? 'bg-white/20 text-white font-bold'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60')
                        } ${isCollapsed ? 'lg:hidden' : 'block'}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-emerald-950 shrink-0 bg-[#08120f]">
          {/* User Profile Mini Bar */}
          {currentUser && (
            <div
              className={`p-2 rounded-xl bg-emerald-950/50 border border-emerald-900/40 mb-2 flex items-center gap-2.5 ${
                isCollapsed ? 'lg:hidden' : 'block'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center text-xs shrink-0">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-emerald-400 font-mono truncate">
                  {currentUser.role} • {currentUser.teacherCode || currentUser.username}
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              id="sidebar-logout-btn"
              onClick={onLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-900/30 border border-rose-800/30 transition-all cursor-pointer ${
                isCollapsed ? 'lg:justify-center lg:px-2' : ''
              }`}
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
              <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                Keluar (Logout)
              </span>
            </button>
          )}

          {/* Desktop Collapse Toggle Button at bottom */}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="w-full mt-2 hidden lg:flex items-center justify-center gap-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-900/40 text-xs font-semibold transition-colors cursor-pointer"
            title={isCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Ciutkan Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
