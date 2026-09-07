import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Student, Teacher, Room, AttendanceRecord, SchoolSettings, UserAccount } from '../types';
import {
  Users,
  Home,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserX,
  Search,
  Filter,
  ArrowRight,
  PieChart,
  Layers,
  GraduationCap,
  Maximize,
  Minimize,
  ExternalLink,
  ArrowLeft,
  Clock,
  Building,
  Bed,
  Moon,
  QrCode,
  Calendar,
  Radio,
  Eye,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import { getTodayDateStr } from '../data/mockData';
import { storageService } from '../services/storageService';
import * as XLSX from 'xlsx';

interface DashboardMonitoringViewProps {
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  records: AttendanceRecord[];
  settings: SchoolSettings;
  currentUser?: UserAccount | null;
  isStandalone?: boolean;
  onRefresh: () => void;
  onNavigateToRoomForm?: (roomNumber?: string) => void;
  onNavigateToStudents?: () => void;
  onNavigateToScanner?: () => void;
  onOpenStandalone?: () => void;
  onBack?: () => void;
}

export const DashboardMonitoringView: React.FC<DashboardMonitoringViewProps> = ({
  students,
  teachers,
  rooms,
  records,
  settings,
  currentUser,
  isStandalone = false,
  onRefresh,
  onNavigateToRoomForm,
  onNavigateToStudents,
  onNavigateToScanner,
  onOpenStandalone,
  onBack,
}) => {
  // Navigation tabs inside monitoring
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'unassigned' | 'rooms' | 'live_attendance' | 'classes'>('overview');

  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [pondokFilter, setPondokFilter] = useState<'ALL' | 'QN1' | 'QN2'>('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [roomStatusFilter, setRoomStatusFilter] = useState<'ALL' | 'FULL' | 'AVAILABLE' | 'EMPTY'>('ALL');

  // Auto-refresh & live clock state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // in seconds, 0 = off
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Live digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
      setSecondsRemaining(autoRefreshInterval > 0 ? autoRefreshInterval : 30);
    }, 600);
  }, [onRefresh, autoRefreshInterval]);

  // Auto-refresh countdown logic
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setTimeout(() => {
            handleManualRefresh();
          }, 0);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, handleManualRefresh]);

  // Fullscreen browser toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    }
  };

  // Helper to determine if a student is genuinely assigned to a room
  const isStudentAssigned = (roomName?: string): boolean => {
    if (!roomName) return false;
    const val = roomName.trim();
    return (
      val !== '' &&
      val !== '-' &&
      val.toLowerCase() !== 'belum ada kamar' &&
      val.toLowerCase() !== 'tanpa kamar' &&
      val.toLowerCase() !== 'belum berkamar'
    );
  };

  // 1. Core Student Metrics
  const totalStudents = students.length;
  const assignedStudents = useMemo(() => students.filter((s) => isStudentAssigned(s.roomName)), [students]);
  const unassignedStudents = useMemo(() => students.filter((s) => !isStudentAssigned(s.roomName)), [students]);

  const assignedCount = assignedStudents.length;
  const unassignedCount = unassignedStudents.length;
  const assignedPercentage = totalStudents > 0 ? Math.round((assignedCount / totalStudents) * 100) : 0;
  const unassignedPercentage = 100 - assignedPercentage;

  // Gender breakdown (Putra vs Putri)
  const putraList = useMemo(() => students.filter((s) => s.gender === 'L'), [students]);
  const putriList = useMemo(() => students.filter((s) => s.gender === 'P'), [students]);
  const putraAssigned = useMemo(() => putraList.filter((s) => isStudentAssigned(s.roomName)).length, [putraList]);
  const putriAssigned = useMemo(() => putriList.filter((s) => isStudentAssigned(s.roomName)).length, [putriList]);
  const putraPercentage = putraList.length > 0 ? Math.round((putraAssigned / putraList.length) * 100) : 0;
  const putriPercentage = putriList.length > 0 ? Math.round((putriAssigned / putriList.length) * 100) : 0;

  // Pondok Breakdown (QN1 vs QN2)
  const qn1Students = useMemo(() => students.filter((s) => s.tempat === 'QN1'), [students]);
  const qn1Putra = useMemo(() => qn1Students.filter((s) => s.gender === 'L').length, [qn1Students]);
  const qn1Putri = useMemo(() => qn1Students.filter((s) => s.gender === 'P').length, [qn1Students]);
  const qn1Assigned = useMemo(() => qn1Students.filter((s) => isStudentAssigned(s.roomName)).length, [qn1Students]);
  const qn1Pct = qn1Students.length > 0 ? Math.round((qn1Assigned / qn1Students.length) * 100) : 0;

  const qn2Students = useMemo(() => students.filter((s) => s.tempat === 'QN2'), [students]);
  const qn2Putra = useMemo(() => qn2Students.filter((s) => s.gender === 'L').length, [qn2Students]);
  const qn2Putri = useMemo(() => qn2Students.filter((s) => s.gender === 'P').length, [qn2Students]);
  const qn2Assigned = useMemo(() => qn2Students.filter((s) => isStudentAssigned(s.roomName)).length, [qn2Students]);
  const qn2Pct = qn2Students.length > 0 ? Math.round((qn2Assigned / qn2Students.length) * 100) : 0;

  // 2. Room & Bed Capacity Metrics
  const totalRooms = rooms.length;
  const roomOccupancyMap = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((s) => {
      if (isStudentAssigned(s.roomName)) {
        const studentRoomLower = s.roomName!.trim().toLowerCase();
        const matchedRoom = rooms.find(
          (r) => r.roomNumber.trim().toLowerCase() === studentRoomLower
        );
        const roomKey = matchedRoom ? matchedRoom.roomNumber : s.roomName!.trim();
        map[roomKey] = (map[roomKey] || 0) + 1;
      }
    });
    return map;
  }, [students, rooms]);

  const filledRooms = useMemo(() => {
    return rooms.filter((r) => (roomOccupancyMap[r.roomNumber] || 0) > 0).length;
  }, [rooms, roomOccupancyMap]);

  const totalBeds = useMemo(() => {
    return rooms.reduce((acc, r) => acc + (r.capacity || 10), 0);
  }, [rooms]);

  const totalOccupiedBeds = assignedCount;
  const bedOccupancyRate = totalBeds > 0 ? Math.round((totalOccupiedBeds / totalBeds) * 100) : 0;

  // QN1 vs QN2 Rooms
  const qn1Rooms = useMemo(() => rooms.filter((r) => r.location === 'QN1'), [rooms]);
  const qn1FilledRooms = useMemo(() => qn1Rooms.filter((r) => (roomOccupancyMap[r.roomNumber] || 0) > 0).length, [qn1Rooms, roomOccupancyMap]);

  const qn2Rooms = useMemo(() => rooms.filter((r) => r.location === 'QN2'), [rooms]);
  const qn2FilledRooms = useMemo(() => qn2Rooms.filter((r) => (roomOccupancyMap[r.roomNumber] || 0) > 0).length, [qn2Rooms, roomOccupancyMap]);

  // 3. Attendance Today Metrics (Room Sessions: HARIAN_KAMAR & SEBELUM_TIDUR)
  const todayStr = getTodayDateStr();
  const todayRecords = useMemo(() => records.filter((r) => r.date === todayStr), [records, todayStr]);

  const todayHarianRecords = useMemo(
    () => todayRecords.filter((r) => r.sessionType === 'HARIAN_KAMAR' || (!r.sessionType && r.status === 'hadir')),
    [todayRecords]
  );
  const todayTidurRecords = useMemo(
    () => todayRecords.filter((r) => r.sessionType === 'SEBELUM_TIDUR'),
    [todayRecords]
  );

  const todayPresentCount = useMemo(() => todayRecords.filter((r) => r.status === 'hadir').length, [todayRecords]);
  const todayLateCount = useMemo(() => todayRecords.filter((r) => r.status === 'terlambat').length, [todayRecords]);
  const todaySickCount = useMemo(() => todayRecords.filter((r) => r.status === 'sakit').length, [todayRecords]);
  const todayPermitCount = useMemo(() => todayRecords.filter((r) => r.status === 'izin').length, [todayRecords]);
  const todayAlphaCount = useMemo(() => todayRecords.filter((r) => r.status === 'alpa').length, [todayRecords]);
  const todayAttendedTotal = todayPresentCount + todayLateCount;
  const attendanceRate = totalStudents > 0 ? Math.round((todayAttendedTotal / totalStudents) * 100) : 0;

  // Handler for Resetting All Room Allocations
  const handleResetRoomAllocations = () => {
    if (
      confirm(
        'PERINGATAN: Apakah Anda yakin ingin MENGOSONGKAN SELURUH KAMAR SANTRI?\n\nSemua santri akan berstatus "Belum Ada Kamar" (room: -). Ini akan mereset alokasi kamar agar data pendataan dimulai dari awal sesuai kenyataan.'
      )
    ) {
      storageService.resetRoomAllocations(currentUser?.name || 'Admin');
      onRefresh();
      alert('Berhasil! Seluruh alokasi kamar santri telah dikosongkan. Santri kini berstatus belum berkamar.');
    }
  };

  // 4. SDM Teachers & Supervisors
  const totalTeachers = teachers.length;
  const activeWaliKamarCount = filledRooms;
  const waliKamarPercentage = totalRooms > 0 ? Math.min(100, Math.round((filledRooms / totalRooms) * 100)) : 0;

  // 5. Classes breakdown
  const allClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  const classCategories = [
    { key: 'Kelas 7 / 1', label: 'Angkatan 1 (Kelas 7)', match: ['1', '7'] },
    { key: 'Kelas 8 / 2', label: 'Angkatan 2 (Kelas 8)', match: ['2', '8'] },
    { key: 'Kelas 9 / 3', label: 'Angkatan 3 (Kelas 9)', match: ['3', '9'] },
    { key: 'Kelas 10 / 4', label: 'Angkatan 4 (Kelas 10)', match: ['4', '10'] },
    { key: 'Kelas 11 / 5', label: 'Angkatan 5 (Kelas 11)', match: ['5', '11'] },
    { key: 'Kelas 12 / 6', label: 'Angkatan 6 (Kelas 12)', match: ['6', '12'] },
    { key: 'Takhassus', label: 'Program Takhassus', match: ['takhassus', 'program'] },
  ];

  const classStats = useMemo(() => {
    return classCategories.map((cat) => {
      const matched = students.filter((s) => {
        const c = (s.className || '').toLowerCase();
        return cat.match.some((m) => c.includes(m));
      });
      const total = matched.length;
      const filled = matched.filter((s) => isStudentAssigned(s.roomName)).length;
      const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
      return {
        key: cat.key,
        label: cat.label,
        total,
        filled,
        percentage: pct,
      };
    });
  }, [students]);

  // 6. Filtered Unassigned Students
  const filteredUnassigned = useMemo(() => {
    return unassignedStudents.filter((s) => {
      const q = searchFilter.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        (s.noKartu && s.noKartu.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q));

      const matchPondok = pondokFilter === 'ALL' || s.tempat === pondokFilter;
      const matchGender = genderFilter === 'ALL' || s.gender === genderFilter;
      const matchClass = classFilter === 'ALL' || s.className === classFilter;

      return matchSearch && matchPondok && matchGender && matchClass;
    });
  }, [unassignedStudents, searchFilter, pondokFilter, genderFilter, classFilter]);

  // 7. Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchFilter.toLowerCase();
      const matchSearch =
        !q ||
        r.roomNumber.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        (r.supervisorName && r.supervisorName.toLowerCase().includes(q));

      const matchPondok = pondokFilter === 'ALL' || r.location === pondokFilter;
      const matchGender = genderFilter === 'ALL' || r.gender === genderFilter;

      const memberCount = roomOccupancyMap[r.roomNumber] || 0;
      const capacity = r.capacity || 10;
      let matchStatus = true;
      if (roomStatusFilter === 'FULL') matchStatus = memberCount >= capacity;
      else if (roomStatusFilter === 'AVAILABLE') matchStatus = memberCount > 0 && memberCount < capacity;
      else if (roomStatusFilter === 'EMPTY') matchStatus = memberCount === 0;

      return matchSearch && matchPondok && matchGender && matchStatus;
    });
  }, [rooms, searchFilter, pondokFilter, genderFilter, roomStatusFilter, roomOccupancyMap]);

  // Export Monitoring Summary to Excel
  const handleExportSummaryExcel = () => {
    const summaryData = [
      { Indikator: 'Nama Lembaga', Nilai: settings.schoolName },
      { Indikator: 'Tanggal Laporan', Nilai: todayStr },
      { Indikator: 'Waktu Sinkronisasi', Nilai: currentTime.toLocaleTimeString('id-ID') },
      { Indikator: 'Total Santri Aktif', Nilai: totalStudents },
      { Indikator: 'Santri Sudah Ada Kamar', Nilai: `${assignedCount} (${assignedPercentage}%)` },
      { Indikator: 'Santri Belum Ada Kamar', Nilai: `${unassignedCount} (${unassignedPercentage}%)` },
      { Indikator: 'Santri Putra (Sudah / Total)', Nilai: `${putraAssigned} / ${putraList.length} (${putraPercentage}%)` },
      { Indikator: 'Santri Putri (Sudah / Total)', Nilai: `${putriAssigned} / ${putriList.length} (${putriPercentage}%)` },
      { Indikator: 'Pondok QN1 (Sudah / Total)', Nilai: `${qn1Assigned} / ${qn1Students.length} (${qn1Pct}%)` },
      { Indikator: 'Pondok QN2 (Sudah / Total)', Nilai: `${qn2Assigned} / ${qn2Students.length} (${qn2Pct}%)` },
      { Indikator: 'Total Kamar Terdata', Nilai: `${filledRooms} / ${totalRooms}` },
      { Indikator: 'Tingkat Keterisian Kasur', Nilai: `${totalOccupiedBeds} / ${totalBeds} (${bedOccupancyRate}%)` },
      { Indikator: 'Presensi Hadir Hari Ini', Nilai: `${todayAttendedTotal} (${attendanceRate}%)` },
    ];

    const ws = XLSX.utils.json_to_sheet(summaryData);
    ws['!cols'] = [{ wch: 32 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Monitoring');
    XLSX.writeFile(wb, `Monitoring_RealTime_QN_${todayStr}.xlsx`);
  };

  return (
    <div
      className={`space-y-5 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800 ${
        isStandalone ? 'min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8' : ''
      }`}
    >
      {/* TOP COMMAND CENTER HEADER */}
      <header className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Live Status */}
          <div className="flex items-start sm:items-center gap-3.5">
            {isStandalone && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Kembali ke Portal"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE MONITORING REAL-TIME
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Database Online Server
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  Pondok QN1 & QN2
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  T.A {settings.academicYear} • Semester {settings.semester}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
                <span>Pusat Monitoring Asrama & Presensi</span>
                {isStandalone && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Mode Layar Penuh TV
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Pemantauan langsung progres asrama santri, kapasitas kasur, dan presensi otomatis.
              </p>
            </div>
          </div>

          {/* Controls: Digital Clock, Auto-refresh timer, Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-end lg:self-auto">
            {/* Digital Clock Badge */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white flex items-center gap-2 shadow-xs">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-right">
                <div className="font-mono text-xs font-extrabold tracking-wider text-emerald-300">
                  {currentTime.toLocaleTimeString('id-ID')} WIB
                </div>
                <div className="text-[10px] text-slate-300 font-medium">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>

            {/* Auto Refresh Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[11px] text-slate-500 font-bold pl-2 hidden md:inline">Otomatis:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAutoRefreshInterval(val);
                  setSecondsRemaining(val > 0 ? val : 0);
                }}
                className="bg-transparent text-slate-800 font-extrabold text-xs py-1 px-2 focus:outline-none cursor-pointer"
              >
                <option value={10}>10 detik</option>
                <option value={30}>30 detik</option>
                <option value={60}>60 detik</option>
                <option value={0}>Nonaktif</option>
              </select>

              {autoRefreshInterval > 0 && (
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                  {secondsRemaining}s
                </span>
              )}
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Segarkan Data Sekarang"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Reset Room Allocations Button (requested by user) */}
            <button
              type="button"
              onClick={handleResetRoomAllocations}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
              title="Kosongkan Semua Penempatan Kamar Santri (Mulai dari Nol)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden xl:inline">Reset Kamar</span>
            </button>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportSummaryExcel}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              title="Unduh Rekap Monitoring (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            </button>

            {/* Mode Switch: Embedded to Standalone */}
            {!isStandalone && onOpenStandalone && (
              <button
                type="button"
                onClick={onOpenStandalone}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Buka tampilan terpisah tanpa sidebar (Sangat cocok untuk layar TV atau monitor pantau)"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span>Buka Mode Terpisah</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer hidden sm:flex"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (F11)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 5 BALANCED KPI METRIC CARDS (Clean Grid, High Contrast, Accessible) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Santri */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">TOTAL SANTRI</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalStudents}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-blue-700 font-bold">{putraList.length} Putra</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-bold">{putriList.length} Putri</span>
          </div>
        </div>

        {/* Card 2: Sudah Ada Kamar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black tracking-wider uppercase text-emerald-800">SUDAH BERKAMAR</span>
              <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                {assignedPercentage}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{assignedCount}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100">
            <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${assignedPercentage}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-emerald-700 mt-1.5 truncate">
              {assignedCount} dari {totalStudents} santri terdata
            </p>
          </div>
        </div>

        {/* Card 3: Belum Ada Kamar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 bg-amber-50/20 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black tracking-wider uppercase text-amber-800">BELUM BERKAMAR</span>
              <span className="text-xs font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                {unassignedPercentage}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">{unassignedCount}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-100">
            <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${unassignedPercentage}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-amber-700 mt-1.5 truncate">
              {unassignedCount > 0 ? 'Perlu pendataan musyrif' : 'Semua santri tertata'}
            </p>
          </div>
        </div>

        {/* Card 4: Kapasitas Kamar & Kasur */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">KAMAR ASRAMA</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {filledRooms} <span className="text-xs text-slate-400 font-medium">/ {totalRooms}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between items-center">
            <span>Keterisian Kasur</span>
            <span className="font-extrabold text-indigo-700 font-mono">
              {totalOccupiedBeds}/{totalBeds} ({bedOccupancyRate}%)
            </span>
          </div>
        </div>

        {/* Card 5: Presensi Real-Time Hari Ini */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all col-span-2 sm:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">PRESENSI HARI INI</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {todayAttendedTotal} <span className="text-xs text-slate-400 font-medium">({attendanceRate}%)</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-emerald-700">{todayPresentCount} Hadir</span>
            <span className="text-blue-700">{todaySickCount} Sakit</span>
            <span className="text-purple-700">{todayPermitCount} Izin</span>
            <span className="text-rose-600">{todayAlphaCount} Alpa</span>
          </div>
        </div>
      </section>

      {/* PONDOK QN1 & QN2 DISTRIBUTION COMPARISON */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pondok QN1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Pondok QN1</h3>
            </div>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {qn1Assigned} / {qn1Students.length} Santri Berkamarr ({qn1Pct}%)
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${qn1Pct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Santri Putra</p>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">{qn1Putra}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Santri Putri</p>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">{qn1Putri}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Kamar Terisi</p>
              <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
                {qn1FilledRooms} / {qn1Rooms.length}
              </p>
            </div>
          </div>
        </div>

        {/* Pondok QN2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Pondok QN2</h3>
            </div>
            <span className="text-xs font-extrabold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              {qn2Assigned} / {qn2Students.length} Santri Berkamarr ({qn2Pct}%)
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${qn2Pct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Santri Putra</p>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">{qn2Putra}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Santri Putri</p>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">{qn2Putri}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Kamar Terisi</p>
              <p className="text-sm font-extrabold text-blue-700 mt-0.5">
                {qn2FilledRooms} / {qn2Rooms.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-TAB DRILL DOWN VIEW CONTAINER */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center border-b border-slate-200 px-3 pt-3 gap-1.5 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'bg-white text-slate-900 border-t-2 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-emerald-600" />
            <span>Progres Angkatan & Gender</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('unassigned')}
            className={`px-3.5 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'unassigned'
                ? 'bg-white text-slate-900 border-t-2 border-amber-500 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Santri Belum Ada Kamar ({unassignedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rooms')}
            className={`px-3.5 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'rooms'
                ? 'bg-white text-slate-900 border-t-2 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-indigo-600" />
            <span>Kamar Asrama ({totalRooms})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('live_attendance')}
            className={`px-3.5 py-2.5 text-xs font-extrabold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'live_attendance'
                ? 'bg-white text-slate-900 border-t-2 border-purple-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-purple-600" />
            <span>Live Feed Presensi ({todayRecords.length})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW PROGRESS ANGKATAN & GENDER */}
        {activeSubTab === 'overview' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Gender Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Santri Putra (Keseluruhan)
                  </span>
                  <span className="text-xs font-bold text-blue-800 font-mono">
                    {putraAssigned} / {putraList.length} ({putraPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${putraPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-blue-700 mt-2">
                  {putraList.length - putraAssigned} santri putra masih belum terdaftar pada kamar asrama.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-rose-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Santri Putri (Keseluruhan)
                  </span>
                  <span className="text-xs font-bold text-rose-700 font-mono">
                    {putriAssigned} / {putriList.length} ({putriPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-rose-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${putriPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-rose-700 mt-2">
                  {putriList.length - putriAssigned} santri putri masih belum terdaftar pada kamar asrama.
                </p>
              </div>
            </div>

            {/* Class / Angkatan Progress Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  PROGRES PENDATAAN KAMAR PER TINGKAT / ANGKATAN
                </h3>
                <span className="text-xs text-slate-400">Total {classCategories.length} Tingkatan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {classStats.map((st) => (
                  <div
                    key={st.key}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-900">{st.label}</span>
                        <span
                          className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            st.percentage >= 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.percentage > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {st.percentage}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2">
                        Terdata: <strong>{st.filled}</strong> / {st.total} santri
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          st.percentage >= 100 ? 'bg-emerald-600' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${st.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SANTRI BELUM ADA KAMAR */}
        {activeSubTab === 'unassigned' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari santri, NIP, RFID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Pondok Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={pondokFilter}
                  onChange={(e) => setPondokFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Pondok (QN1 & QN2)</option>
                  <option value="QN1">Pondok QN1</option>
                  <option value="QN2">Pondok QN2</option>
                </select>

                {/* Gender Filter */}
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Gender</option>
                  <option value="L">Putra</option>
                  <option value="P">Putri</option>
                </select>

                {/* Action button: Input Kamar */}
                {onNavigateToRoomForm && (
                  <button
                    type="button"
                    onClick={() => onNavigateToRoomForm()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Input Kamar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table of Unassigned Students */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3">NIP Pondok</th>
                    <th className="py-3 px-3">Nama Santri</th>
                    <th className="py-3 px-3">Kelas / Rombel</th>
                    <th className="py-3 px-3">Pondok</th>
                    <th className="py-3 px-3">Jenis Kelamin</th>
                    <th className="py-3 px-3">No. Kartu / RFID</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnassigned.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        {unassignedCount === 0 ? (
                          <div className="space-y-1">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <p className="font-extrabold text-slate-700">Alhamdulillah!</p>
                            <p className="text-xs text-slate-500">Seluruh santri telah terdaftar pada kamar asrama masing-masing.</p>
                          </div>
                        ) : (
                          'Tidak ada santri yang sesuai dengan filter pencarian.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUnassigned.slice(0, 20).map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{st.nis}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{st.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold">
                            {st.className}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">Pondok {st.tempat || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.gender === 'L'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {st.gender === 'L' ? 'Putra' : 'Putri'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{st.noKartu || st.nisn || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Menunggu Kamar
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredUnassigned.length > 20 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                  Menampilkan 20 dari {filteredUnassigned.length} santri yang belum terdaftar. Gunakan pencarian untuk menyaring lebih spesifik.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STATUS KAMAR ASRAMA */}
        {activeSubTab === 'rooms' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor kamar, gedung, musyrif..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pondokFilter}
                  onChange={(e) => setPondokFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Pondok</option>
                  <option value="QN1">Pondok QN1</option>
                  <option value="QN2">Pondok QN2</option>
                </select>

                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Gender</option>
                  <option value="L">Kamar Putra</option>
                  <option value="P">Kamar Putri</option>
                </select>

                <select
                  value={roomStatusFilter}
                  onChange={(e) => setRoomStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Keterisian</option>
                  <option value="FULL">Penuh (100%)</option>
                  <option value="AVAILABLE">Tersedia (Sebagian)</option>
                  <option value="EMPTY">Masih Kosong</option>
                </select>
              </div>
            </div>

            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredRooms.map((room) => {
                const memberCount = roomOccupancyMap[room.roomNumber] || 0;
                const capacity = room.capacity || 10;
                const isFull = memberCount >= capacity;
                const pct = capacity > 0 ? Math.round((memberCount / capacity) * 100) : 0;

                return (
                  <div
                    key={room.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              room.gender === 'L'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {room.gender === 'L' ? 'Putra' : 'Putri'} • Pondok {room.location}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900 mt-1">
                            Kamar {room.roomNumber}
                          </h4>
                          <p className="text-[11px] text-slate-500">{room.building}</p>
                        </div>

                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                            isFull
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : memberCount > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {memberCount}/{capacity}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isFull ? 'bg-rose-500' : memberCount > 0 ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Wali Kamar / Musyrif:</span>
                        <span className="font-extrabold text-slate-800 text-[11px] truncate block max-w-[130px]">
                          {room.supervisorName || 'Belum Ada Musyrif'}
                        </span>
                      </div>

                      {onNavigateToRoomForm && (
                        <button
                          type="button"
                          onClick={() => onNavigateToRoomForm(room.roomNumber)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Kelola
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: LIVE FEED PRESENSI HARI INI */}
        {activeSubTab === 'live_attendance' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
                  <span>Log Presensi Masuk & Kamar (Hari Ini)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekaman presensi otomatis via QR Scanner mandiri dan laporan presensi malam wali kamar.
                </p>
              </div>

              {onNavigateToScanner && (
                <button
                  type="button"
                  onClick={onNavigateToScanner}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Buka Scanner Presensi</span>
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Nama Santri</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Kamar</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Petugas / Sumber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Belum ada data presensi yang masuk pada hari ini ({todayStr}).
                      </td>
                    </tr>
                  ) : (
                    todayRecords.slice(0, 25).map((rec, idx) => (
                      <tr key={rec.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{rec.timeIn || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{rec.studentName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{rec.className || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{rec.roomName || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              rec.status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'sakit'
                                ? 'bg-blue-100 text-blue-800'
                                : rec.status === 'izin'
                                ? 'bg-purple-100 text-purple-800'
                                : rec.status === 'terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{rec.recordedBy || 'Sistem Scanner'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER QUICK STATUS & NAVIGATION */}
      <footer className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Sistem Sinkronisasi Asrama & Presensi Cazh ID Pondok Pesantren Qotrun Nada</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400">
            Terakhir diperbarui: {currentTime.toLocaleTimeString('id-ID')}
          </span>
          {isStandalone && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="font-bold text-slate-800 hover:text-emerald-700 underline transition-colors cursor-pointer"
            >
              Kembali ke Menu Utama
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
