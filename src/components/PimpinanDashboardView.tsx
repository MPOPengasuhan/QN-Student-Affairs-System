import React, { useState, useMemo } from 'react';
import {
  Student,
  Teacher,
  Room,
  AttendanceRecord,
  SchoolSettings,
  UserAccount,
  DailySummary,
  RoomAttendanceSession,
} from '../types';
import * as XLSX from 'xlsx';
import {
  Building,
  Users,
  ShieldCheck,
  Home,
  CheckCircle2,
  Clock,
  HeartPulse,
  Award,
  Download,
  Calendar,
  ArrowLeft,
  PieChart,
  BarChart3,
  Moon,
  Sun,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getTodayDateStr } from '../data/mockData';

interface PimpinanDashboardViewProps {
  currentUser: UserAccount;
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  records: AttendanceRecord[];
  dailySummary: DailySummary;
  settings: SchoolSettings;
  onBackToPortal?: () => void;
  onBack?: () => void;
  onRefresh: () => void;
}

export const PimpinanDashboardView: React.FC<PimpinanDashboardViewProps> = ({
  currentUser,
  students,
  teachers,
  rooms,
  records,
  dailySummary,
  settings,
  onBackToPortal,
  onBack,
  onRefresh,
}) => {
  const handleBack = onBackToPortal || onBack || (() => {});
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [selectedSession, setSelectedSession] = useState<'ALL' | RoomAttendanceSession>('ALL');
  const [locationFilter, setLocationFilter] = useState<'ALL' | 'QN1' | 'QN2'>('ALL');
  const [searchRoomQuery, setSearchRoomQuery] = useState<string>('');

  // Total students & gender metrics
  const totalStudents = students.length;
  const putraCount = students.filter((s) => s.gender === 'L').length;
  const putriCount = students.filter((s) => s.gender === 'P').length;

  // Pondok breakdown
  const qn1Students = students.filter((s) => s.tempat === 'QN1');
  const qn1Putra = qn1Students.filter((s) => s.gender === 'L').length;
  const qn1Putri = qn1Students.filter((s) => s.gender === 'P').length;

  const qn2Students = students.filter((s) => s.tempat === 'QN2');
  const qn2Putra = qn2Students.filter((s) => s.gender === 'L').length;
  const qn2Putri = qn2Students.filter((s) => s.gender === 'P').length;

  // Records for selected date & session
  const dateRecords = useMemo(() => {
    let recs = records.filter((r) => r.date === selectedDate);
    if (selectedSession !== 'ALL') {
      recs = recs.filter(
        (r) => r.sessionType === selectedSession || (!r.sessionType && selectedSession === 'HARIAN_KAMAR')
      );
    }
    return recs;
  }, [records, selectedDate, selectedSession]);

  // General Attendance metrics for selected date & session
  const presentCount = dateRecords.filter((r) => r.status === 'hadir').length;
  const lateCount = dateRecords.filter((r) => r.status === 'terlambat').length;
  const sickCount = dateRecords.filter((r) => r.status === 'sakit').length;
  const leaveCount = dateRecords.filter((r) => r.status === 'izin').length;
  const totalAttended = presentCount + lateCount;
  const absentCount = Math.max(0, totalStudents - totalAttended - sickCount - leaveCount);
  const attendanceRate = totalStudents > 0 ? Math.round((totalAttended / totalStudents) * 100) : 0;

  // Room occupancy
  const roomsFilled = rooms.filter((r) =>
    students.some((s) => s.roomName && s.roomName.trim().toLowerCase() === r.roomNumber.trim().toLowerCase())
  ).length;
  const unassignedStudents = students.filter((s) => !s.roomName || s.roomName.trim() === '' || s.roomName === '-').length;

  // Room Attendance Breakdown (Presensi Perkamar, bukan perkelas)
  const roomBreakdown = useMemo(() => {
    return rooms
      .filter((r) => {
        if (locationFilter === 'QN1') {
          return r.location === 'QN1' || r.gender === 'P' || r.building.toLowerCase().includes('qn1');
        }
        if (locationFilter === 'QN2') {
          return r.location === 'QN2' || r.gender === 'L' || r.building.toLowerCase().includes('qn2');
        }
        return true;
      })
      .map((room) => {
        const roomNumber = room.roomNumber;
        const roomStudents = students.filter(
          (s) => s.roomName && s.roomName.trim().toLowerCase() === roomNumber.trim().toLowerCase()
        );
        const total = roomStudents.length;

        const studentIds = new Set(roomStudents.map((s) => s.id));
        const roomRecs = dateRecords.filter(
          (r) =>
            studentIds.has(r.studentId) ||
            (r.roomName && r.roomName.trim().toLowerCase() === roomNumber.trim().toLowerCase())
        );

        const pres = roomRecs.filter((r) => r.status === 'hadir').length;
        const late = roomRecs.filter((r) => r.status === 'terlambat').length;
        const sick = roomRecs.filter((r) => r.status === 'sakit').length;
        const leave = roomRecs.filter((r) => r.status === 'izin').length;
        const attended = pres + late;
        const absent = Math.max(0, total - attended - sick - leave);
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

        return {
          roomNumber: room.roomNumber,
          building: room.building,
          location: room.location,
          gender: room.gender,
          supervisorName: room.supervisorName || 'Belum Ada',
          total,
          present: pres,
          late,
          sick,
          leave,
          absent,
          rate,
        };
      })
      .filter((item) => {
        if (!searchRoomQuery.trim()) return true;
        const q = searchRoomQuery.toLowerCase();
        return (
          item.roomNumber.toLowerCase().includes(q) ||
          item.building.toLowerCase().includes(q) ||
          item.supervisorName.toLowerCase().includes(q)
        );
      });
  }, [rooms, students, dateRecords, locationFilter, searchRoomQuery]);

  // Export Executive Report (Room-based)
  const handleExportExecutiveReport = () => {
    const sessionLabel =
      selectedSession === 'HARIAN_KAMAR'
        ? 'Sesi Harian Kamar'
        : selectedSession === 'SEBELUM_TIDUR'
        ? 'Sesi Sebelum Tidur Kamar'
        : 'Semua Sesi Kamar';

    const summaryData = [
      { Indikator: 'Nama Lembaga', Nilai: settings.schoolName },
      { Indikator: 'Tanggal Laporan', Nilai: selectedDate },
      { Indikator: 'Sesi Presensi', Nilai: sessionLabel },
      { Indikator: 'Total Santri Terdaftar', Nilai: totalStudents },
      { Indikator: 'Santri Putra (Keseluruhan)', Nilai: putraCount },
      { Indikator: 'Santri Putri (Keseluruhan)', Nilai: putriCount },
      { Indikator: 'Santri di Kampus QN1', Nilai: `${qn1Students.length} (${qn1Putra} Putra, ${qn1Putri} Putri)` },
      { Indikator: 'Santri di Kampus QN2', Nilai: `${qn2Students.length} (${qn2Putra} Putra, ${qn2Putri} Putri)` },
      { Indikator: 'Tingkat Kehadiran Kamar', Nilai: `${attendanceRate}%` },
      { Indikator: 'Hadir Tepat Waktu', Nilai: presentCount },
      { Indikator: 'Terlambat', Nilai: lateCount },
      { Indikator: 'Sakit', Nilai: sickCount },
      { Indikator: 'Izin', Nilai: leaveCount },
      { Indikator: 'Belum Presensi / Alpa', Nilai: absentCount },
      { Indikator: 'Total Kamar Berpenghuni', Nilai: `${roomsFilled}/${rooms.length}` },
      { Indikator: 'Santri Belum Ada Kamar', Nilai: unassignedStudents },
    ];

    const roomData = roomBreakdown.map((r) => ({
      Kamar: r.roomNumber,
      Gedung: r.building,
      Lokasi: r.location,
      Gender: r.gender === 'L' ? 'Putra' : 'Putri',
      'Wali Kamar / Musyrif': r.supervisorName,
      'Total Santri Kamar': r.total,
      'Hadir Tepat Waktu': r.present,
      Terlambat: r.late,
      Sakit: r.sick,
      Izin: r.leave,
      'Belum Hadir': r.absent,
      'Persentase Kehadiran': `${r.rate}%`,
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsRoom = XLSX.utils.json_to_sheet(roomData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');
    XLSX.utils.book_append_sheet(wb, wsRoom, 'Rekap Presensi per Kamar');
    XLSX.writeFile(wb, `Laporan_Eksekutif_Pimpinan_Perkamar_${selectedDate}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              id="pimpinan-back-btn"
              onClick={handleBack}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Kembali ke Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                  DASHBOARD PIMPINAN
                </span>
                <span className="text-xs text-slate-400 font-medium">Monitoring Presensi Per-Kamar Asrama</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                Pusat Eksekutif Presensi Kamar Santri
              </h1>
              <p className="text-xs text-slate-500">
                Laporan kehadiran harian kamar dan sebelum tidur perkamar asrama {settings.schoolName}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-purple-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-slate-800 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="btn-export-pimpinan"
              onClick={handleExportExecutiveReport}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Rekap Kamar (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Sesi Presensi Kamar Switcher Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Sesi Kamar:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedSession('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedSession === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Semua Sesi
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession('HARIAN_KAMAR')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedSession === 'HARIAN_KAMAR'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Presensi Harian Kamar</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession('SEBELUM_TIDUR')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedSession === 'SEBELUM_TIDUR'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Presensi Sebelum Tidur</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Menampilkan data kehadiran tanggal <strong className="text-slate-800">{selectedDate}</strong>
          </div>
        </div>

        {/* 4 Balanced KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">TOTAL SANTRI</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalStudents}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
              <span>{putraCount} Putra</span>
              <span>•</span>
              <span>{putriCount} Putri</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">HADIR KAMAR</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600">{attendanceRate}%</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {totalAttended} santri hadir ({presentCount} tepat, {lateCount} lambat)
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">BELUM PRESENSI</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600">{absentCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {sickCount} sakit • {leaveCount} izin
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">KAMAR TERDATA</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-600">
              {roomsFilled} <span className="text-xs font-bold text-slate-400">/ {rooms.length} Kamar</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {unassignedStudents} santri belum berpenghuni
            </div>
          </div>
        </div>

        {/* Main Section: Rekapitulasi Presensi per Kamar Asrama */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-purple-600" />
                Rekapitulasi Presensi per Kamar Asrama ({selectedDate})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring kehadiran santri perkamar oleh Wali Kamar untuk sesi{' '}
                <strong className="text-slate-700">
                  {selectedSession === 'HARIAN_KAMAR'
                    ? 'Presensi Harian Kamar'
                    : selectedSession === 'SEBELUM_TIDUR'
                    ? 'Presensi Sebelum Tidur'
                    : 'Semua Sesi Kamar'}
                </strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Lokasi */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setLocationFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    locationFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Semua Lokasi
                </button>
                <button
                  type="button"
                  onClick={() => setLocationFilter('QN1')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    locationFilter === 'QN1' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Kampus QN1
                </button>
                <button
                  type="button"
                  onClick={() => setLocationFilter('QN2')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    locationFilter === 'QN2' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Kampus QN2
                </button>
              </div>

              {/* Search room */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchRoomQuery}
                  onChange={(e) => setSearchRoomQuery(e.target.value)}
                  placeholder="Cari kamar / wali kamar..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Table of Room Attendance */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Kamar & Gedung</th>
                  <th className="py-3 px-3.5">Wali Kamar / Musyrif</th>
                  <th className="py-3 px-3.5 text-center">Santri</th>
                  <th className="py-3 px-3.5 text-center">Tepat</th>
                  <th className="py-3 px-3.5 text-center">Lambat</th>
                  <th className="py-3 px-3.5 text-center">Sakit/Izin</th>
                  <th className="py-3 px-3.5 text-center">Belum</th>
                  <th className="py-3 px-3.5">Tingkat Kehadiran</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Tidak ada kamar asrama yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  roomBreakdown.map((r) => (
                    <tr key={r.roomNumber} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-extrabold text-slate-900">{r.roomNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.building} ({r.location} • {r.gender === 'L' ? 'Putra' : 'Putri'})
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-medium text-slate-700">
                        {r.supervisorName}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-800">
                        {r.total}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold text-emerald-600">
                        {r.present}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold text-amber-600">
                        {r.late}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-medium text-blue-600">
                        {r.sick + r.leave}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold text-rose-600">
                        {r.absent}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                r.rate >= 90
                                  ? 'bg-emerald-500'
                                  : r.rate >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${r.rate}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 text-[11px]">{r.rate}%</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.total === 0
                              ? 'bg-slate-100 text-slate-500'
                              : r.rate >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.rate >= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.total === 0 ? 'Kosong' : r.rate >= 90 ? 'Lengkap' : r.rate >= 70 ? 'Sebagian' : 'Kurang'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
