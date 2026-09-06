import React, { useState } from 'react';
import {
  Student,
  AttendanceRecord,
  SchoolSettings,
  AttendanceStatus,
} from '../types';
import { storageService } from '../services/storageService';
import { getTodayDateStr } from '../data/mockData';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  Clock,
  HeartPulse,
  UserCheck,
  UserX,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface RekapViewProps {
  students: Student[];
  records: AttendanceRecord[];
  settings: SchoolSettings;
}

export const RekapView: React.FC<RekapViewProps> = ({
  students,
  records,
  settings,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'daily' | 'individual'>('matrix');
  const [selectedClass, setSelectedClass] = useState<string>('X-A');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [copiedWA, setCopiedWA] = useState<boolean>(false);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const classList = Array.from(new Set(students.map((s) => s.className))).sort();

  // Days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filter students for matrix view
  const classStudents = students.filter(
    (s) => s.className === selectedClass && s.name.toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Month string format e.g. "2026-08"
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Helper to find record for student on day
  const getRecordForDay = (studentId: string, day: number): AttendanceRecord | undefined => {
    const dayDate = `${monthStr}-${String(day).padStart(2, '0')}`;
    return records.find((r) => r.studentId === studentId && r.date === dayDate);
  };

  // Compute student monthly summary
  const getStudentMonthlyStats = (studentId: string) => {
    const monthRecords = records.filter(
      (r) => r.studentId === studentId && r.date.startsWith(monthStr)
    );

    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    monthRecords.forEach((r) => {
      if (r.status === 'hadir') hadir++;
      else if (r.status === 'terlambat') terlambat++;
      else if (r.status === 'sakit') sakit++;
      else if (r.status === 'izin') izin++;
      else if (r.status === 'alpa') alpa++;
    });

    const totalDaysRecorded = monthRecords.length;
    const effectiveAttended = hadir + terlambat;
    const rate = totalDaysRecorded > 0 ? Math.round((effectiveAttended / totalDaysRecorded) * 100) : 100;

    return { hadir, terlambat, sakit, izin, alpa, totalDaysRecorded, rate };
  };

  // Download CSV file
  const handleDownloadCSV = () => {
    const csvData = storageService.generateAttendanceCSV(
      viewMode === 'daily' ? selectedDate : undefined,
      selectedClass
    );
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Presensi_${selectedClass}_${monthStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  // Copy WhatsApp summary
  const handleCopyWA = () => {
    const text = `📋 *REKAP KEHADIRAN BULANAN SISWA*
🏫 *${settings.schoolName}*
📚 Kelas: ${selectedClass}
📅 Periode: ${months[selectedMonth]} ${selectedYear}

Total Siswa di Kelas: ${classStudents.length} Siswa
Rincian Rekapitulasi:
${classStudents
  .map((s, idx) => {
    const stats = getStudentMonthlyStats(s.id);
    return `${idx + 1}. ${s.name} (H:${stats.hadir} T:${stats.terlambat} S:${stats.sakit} I:${stats.izin} A:${stats.alpa} - ${stats.rate}%)`;
  })
  .join('\n')}

_Dibuat secara otomatis melalui Sistem E-Presensi Cloud._`;

    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  return (
    <div id="rekap-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner Controls (Hidden in Print) */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Rekap Kehadiran Otomatis & Laporan Cetak
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Format matrik kehadiran bulanan standar sekolah, rekap harian, dan ekspor ke Excel/PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyWA}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>{copiedWA ? 'Tersalin!' : 'Salin Teks WA'}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-600" />
              <span>Unduh CSV / Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shadow-indigo-200 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF Resmi</span>
            </button>
          </div>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'matrix' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Bulanan
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'daily' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Harian
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class Dropdown */}
            <div className="flex items-center gap-1 text-xs">
              <span className="font-bold text-slate-500">Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Dropdown */}
            <div className="flex items-center gap-1 text-xs">
              <span className="font-bold text-slate-500">Bulan:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>

            {/* Search Student in class */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Printable / Display Content */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0 space-y-6">
        {/* Official School Letterhead (Kop Surat Sekolah) for Print/Formal View */}
        <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
          <div className="flex items-center justify-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-14 h-14 rounded-xl object-contain p-0.5 border border-slate-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl print:text-black print:border print:border-black">
                QN
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-wide uppercase">
                {settings.schoolName}
              </h1>
              <p className="text-xs text-slate-600 font-medium">{settings.schoolAddress}</p>
              <p className="text-[11px] text-slate-500">
                Telp: {settings.schoolPhone} • Email: {settings.schoolEmail}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              REKAPITULASI KEHADIRAN SISWA - KELAS {selectedClass}
            </h2>
            <p className="text-xs text-slate-500">
              Periode: {months[selectedMonth]} {selectedYear} • Tahun Ajaran {settings.academicYear} ({settings.semester})
            </p>
          </div>
        </div>

        {/* Mode 1: Matrix View (Grid 1..31 days with H/T/S/I/A and Totals) */}
        {viewMode === 'matrix' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border border-slate-300 text-center">
                    <th rowSpan={2} className="border border-slate-300 py-2 px-1 w-8">
                      No
                    </th>
                    <th rowSpan={2} className="border border-slate-300 py-2 px-2 text-left min-w-[80px]">
                      NIS
                    </th>
                    <th rowSpan={2} className="border border-slate-300 py-2 px-3 text-left min-w-[160px]">
                      Nama Siswa
                    </th>
                    <th rowSpan={2} className="border border-slate-300 py-2 px-1 w-8">
                      L/P
                    </th>
                    <th colSpan={daysInMonth} className="border border-slate-300 py-1 bg-slate-200">
                      Tanggal Bulan {months[selectedMonth]} {selectedYear}
                    </th>
                    <th colSpan={5} className="border border-slate-300 py-1 bg-indigo-100 text-indigo-900">
                      Total
                    </th>
                    <th rowSpan={2} className="border border-slate-300 py-2 px-1 w-12 bg-indigo-50">
                      %
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] font-bold border border-slate-300 text-center">
                    {daysArray.map((day) => (
                      <th key={day} className="border border-slate-300 py-1 px-1 min-w-[20px]">
                        {day}
                      </th>
                    ))}
                    <th className="border border-slate-300 py-1 px-1 bg-emerald-50 text-emerald-800" title="Hadir">
                      H
                    </th>
                    <th className="border border-slate-300 py-1 px-1 bg-amber-50 text-amber-800" title="Terlambat">
                      T
                    </th>
                    <th className="border border-slate-300 py-1 px-1 bg-sky-50 text-sky-800" title="Sakit">
                      S
                    </th>
                    <th className="border border-slate-300 py-1 px-1 bg-purple-50 text-purple-800" title="Izin">
                      I
                    </th>
                    <th className="border border-slate-300 py-1 px-1 bg-rose-50 text-rose-800" title="Alpa">
                      A
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classStudents.length > 0 ? (
                    classStudents.map((st, index) => {
                      const stats = getStudentMonthlyStats(st.id);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-mono text-slate-500">
                            {index + 1}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2 font-mono text-slate-700">
                            {st.nis}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {st.name}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold text-slate-600">
                            {st.gender}
                          </td>

                          {/* Matrix Days */}
                          {daysArray.map((day) => {
                            const rec = getRecordForDay(st.id, day);
                            let badge = '-';
                            let cellClass = 'text-slate-300';

                            if (rec) {
                              if (rec.status === 'hadir') {
                                badge = 'H';
                                cellClass = 'font-bold text-emerald-600 bg-emerald-50/50';
                              } else if (rec.status === 'terlambat') {
                                badge = 'T';
                                cellClass = 'font-bold text-amber-600 bg-amber-50/50';
                              } else if (rec.status === 'sakit') {
                                badge = 'S';
                                cellClass = 'font-bold text-sky-600 bg-sky-50/50';
                              } else if (rec.status === 'izin') {
                                badge = 'I';
                                cellClass = 'font-bold text-purple-600 bg-purple-50/50';
                              } else if (rec.status === 'alpa') {
                                badge = 'A';
                                cellClass = 'font-bold text-rose-600 bg-rose-50/50';
                              }
                            }

                            return (
                              <td
                                key={day}
                                className={`border border-slate-300 py-1 px-0.5 text-center text-[10px] ${cellClass}`}
                              >
                                {badge}
                              </td>
                            );
                          })}

                          {/* Total Columns */}
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold text-emerald-700 bg-emerald-50/30">
                            {stats.hadir}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold text-amber-700 bg-amber-50/30">
                            {stats.terlambat}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold text-sky-700 bg-sky-50/30">
                            {stats.sakit}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold text-purple-700 bg-purple-50/30">
                            {stats.izin}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold text-rose-700 bg-rose-50/30">
                            {stats.alpa}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-mono font-extrabold text-indigo-700 bg-indigo-50/50">
                            {stats.rate}%
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={daysInMonth + 10} className="py-8 text-center text-slate-400">
                        Tidak ada siswa terdaftar di kelas {selectedClass}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Legend / Keterangan Simbol */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-2">
              <span className="font-bold text-slate-800">Keterangan:</span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">H</span>
                = Hadir Tepat Waktu
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">T</span>
                = Terlambat
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-[10px]">S</span>
                = Sakit
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">I</span>
                = Izin
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-[10px]">A</span>
                = Alpa / Tanpa Keterangan
              </span>
            </div>
          </div>
        )}

        {/* Mode 2: Daily List View */}
        {viewMode === 'daily' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 print:hidden">
              <span className="text-xs font-bold text-slate-700">Pilih Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border border-slate-300">
                    <th className="py-2.5 px-3 border border-slate-300">No</th>
                    <th className="py-2.5 px-3 border border-slate-300">NIS</th>
                    <th className="py-2.5 px-3 border border-slate-300">Nama Lengkap</th>
                    <th className="py-2.5 px-3 border border-slate-300">Kelas</th>
                    <th className="py-2.5 px-3 border border-slate-300">Jam Masuk</th>
                    <th className="py-2.5 px-3 border border-slate-300">Jam Pulang</th>
                    <th className="py-2.5 px-3 border border-slate-300">Status</th>
                    <th className="py-2.5 px-3 border border-slate-300">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students
                    .filter((s) => selectedClass === 'SEMUA' || s.className === selectedClass)
                    .map((st, index) => {
                      const rec = records.find((r) => r.studentId === st.id && r.date === selectedDate);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 border border-slate-300 font-mono text-slate-500">{index + 1}</td>
                          <td className="py-2 px-3 border border-slate-300 font-mono">{st.nis}</td>
                          <td className="py-2 px-3 border border-slate-300 font-bold text-slate-900">{st.name}</td>
                          <td className="py-2 px-3 border border-slate-300">{st.className}</td>
                          <td className="py-2 px-3 border border-slate-300 font-mono">{rec?.timeIn || '-'}</td>
                          <td className="py-2 px-3 border border-slate-300 font-mono">{rec?.timeOut || '-'}</td>
                          <td className="py-2 px-3 border border-slate-300">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                rec?.status === 'hadir'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec?.status === 'terlambat'
                                  ? 'bg-amber-100 text-amber-800'
                                  : rec?.status === 'sakit'
                                  ? 'bg-sky-100 text-sky-800'
                                  : rec?.status === 'izin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {(rec?.status || 'ALPA').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 border border-slate-300 text-slate-500">{rec?.notes || '-'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Official Signatures Section (Tanda Tangan Pengesahan) */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-16">
            <div>
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-bold text-slate-900">Kepala Sekolah</p>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 underline">{settings.headmasterName}</p>
              <p className="text-slate-500 font-mono text-[11px]">NIP. {settings.headmasterNip}</p>
            </div>
          </div>

          <div className="space-y-16">
            <div>
              <p className="text-slate-600">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold text-slate-900">Wali Kelas / Petugas Presensi</p>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 underline">{settings.operatorName}</p>
              <p className="text-slate-500 text-[11px]">Petugas Kesiswaan E-Presensi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
