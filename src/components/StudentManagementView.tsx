import React, { useState } from 'react';
import { Student, SchoolSettings } from '../types';
import { storageService } from '../services/storageService';
import { StudentCardModal } from './StudentCardModal';
import { BatchCardsModal } from './BatchCardsModal';
import { ExcelImportModal } from './ExcelImportModal';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  Search,
  QrCode,
  Edit2,
  Trash2,
  Download,
  Printer,
  Upload,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface StudentManagementViewProps {
  students: Student[];
  settings: SchoolSettings;
  onRefresh: () => void;
}

export const StudentManagementView: React.FC<StudentManagementViewProps> = ({
  students,
  settings,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('SEMUA');
  const [activeStudentCard, setActiveStudentCard] = useState<Student | null>(null);
  const [isBatchPrinting, setIsBatchPrinting] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formNis, setFormNis] = useState<string>('');
  const [formNoKartu, setFormNoKartu] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formClass, setFormClass] = useState<string>('Kulliyatul Muallimin 1');
  const [formRoom, setFormRoom] = useState<string>('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formParentPhone, setFormParentPhone] = useState<string>('');
  const [formAvatarUrl, setFormAvatarUrl] = useState<string>('');

  const availableRooms = storageService.getRooms();

  const classList = ['SEMUA', ...Array.from(new Set(students.map((s) => s.className))).sort()];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered students list
  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass === 'SEMUA' || s.className === selectedClass;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.roomName && s.roomName.toLowerCase().includes(q)) ||
      (s.noKartu && s.noKartu.toLowerCase().includes(q)) ||
      (s.nisn && s.nisn.toLowerCase().includes(q)) ||
      s.className.toLowerCase().includes(q);
    return matchClass && matchQuery;
  });

  const openAddModal = () => {
    setEditingStudent(null);
    setFormNis(`2025${Math.floor(1000 + Math.random() * 9000)}`);
    setFormNoKartu(`0089${Math.floor(100000 + Math.random() * 900000)}`);
    setFormName('');
    setFormClass(selectedClass !== 'SEMUA' ? selectedClass : 'Kulliyatul Muallimin 1');
    setFormRoom(availableRooms[0]?.roomNumber || '');
    setFormGender('L');
    setFormParentPhone('');
    setFormAvatarUrl('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormNis(student.nis);
    setFormNoKartu(student.noKartu || student.nisn || '');
    setFormName(student.name);
    setFormClass(student.className);
    setFormRoom(student.roomName || '');
    setFormGender(student.gender);
    setFormParentPhone(student.parentPhone || '');
    setFormAvatarUrl(student.avatarUrl || '');
    setIsAddModalOpen(true);
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete) return;
    const name = studentToDelete.name;
    storageService.deleteStudent(studentToDelete.id);
    setStudentToDelete(null);
    onRefresh();
    showToast(`Data santri ${name} berhasil dihapus.`);
  };

  const handleDeleteAllStudents = () => {
    storageService.deleteAllStudents();
    setIsDeleteAllConfirmOpen(false);
    onRefresh();
    showToast('Semua data santri berhasil dihapus dari database.');
  };

  const handleImportSuccess = (imported: Student[], replaceAll: boolean) => {
    storageService.saveStudentsBulk(imported, replaceAll);
    setIsExcelModalOpen(false);
    onRefresh();
    showToast(`Berhasil mengimpor ${imported.length} santri ke dalam database!`);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNis || !formName || !formClass) return;

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : `snt-${Date.now()}`,
      nis: formNis.trim(),
      noKartu: formNoKartu.trim(),
      nisn: formNoKartu.trim(),
      name: formName.trim(),
      className: formClass,
      roomName: formRoom ? formRoom.trim() : undefined,
      gender: formGender,
      parentPhone: formParentPhone.trim(),
      avatarUrl: formAvatarUrl.trim() || undefined,
      qrCodeData: formNis.trim(),
      createdAt: editingStudent ? editingStudent.createdAt : new Date().toISOString(),
    };

    storageService.saveStudent(studentData);
    setIsAddModalOpen(false);
    onRefresh();
    showToast(`Data santri ${studentData.name} berhasil disimpan.`);
  };

  // Export student list to Excel (.xlsx)
  const handleExportStudentsExcel = () => {
    const data = filteredStudents.map((s, idx) => ({
      NO: idx + 1,
      'NIP PONDOK': s.nis,
      'NOMOR KARTU': s.noKartu || s.nisn || '-',
      'NAMA SANTRI': s.name,
      'KELAS / ROMBEL': s.className,
      'KAMAR ASRAMA': s.roomName || '-',
      'JENIS KELAMIN': s.gender === 'L' ? 'Laki-Laki' : 'Perempuan',
      'NO WA WALI': s.parentPhone || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 22 }, { wch: 15 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Santri');
    XLSX.writeFile(wb, `Data_Santri_${selectedClass}_${settings.schoolName.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  };

  // Export student list to CSV
  const handleExportStudentsCSV = () => {
    const headers = ['NO', 'NIP Pondok', 'Nomor Kartu', 'Nama Santri', 'Kelas/Asrama', 'Kamar', 'Jenis Kelamin', 'Nomor WA Wali'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      `"${s.nis}"`,
      `"${s.noKartu || s.nisn || ''}"`,
      `"${s.name}"`,
      `"${s.className}"`,
      `"${s.roomName || ''}"`,
      s.gender === 'L' ? 'Laki-Laki' : 'Perempuan',
      `"${s.parentPhone || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Santri_${selectedClass}_${settings.schoolName.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
  };

  return (
    <div id="student-management-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Manajemen Database Santri / Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {settings.schoolName} • Import Excel, cetak kartu QR Code, dan perbarui data santri secara massal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Import Excel Button */}
          <button
            id="import-excel-btn"
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Import Excel / CSV</span>
          </button>

          {/* Batch Print Cards */}
          {students.length > 0 && (
            <button
              onClick={() => setIsBatchPrinting(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Cetak Kartu Massal (A4)</span>
            </button>
          )}

          {/* Export Excel (.xlsx) */}
          {students.length > 0 && (
            <button
              onClick={handleExportStudentsExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          )}

          {/* Export CSV */}
          {students.length > 0 && (
            <button
              onClick={handleExportStudentsCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV</span>
            </button>
          )}

          {/* Delete All Students Button */}
          {students.length > 0 && (
            <button
              id="delete-all-students-btn"
              onClick={() => setIsDeleteAllConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Hapus Semua Santri</span>
            </button>
          )}

          {/* Add Student Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Santri</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, Nomor Kartu, atau kamar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-56 sm:w-72"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Kelas/Asrama:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none"
            >
              {classList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Menampilkan <span className="text-slate-900 font-bold">{filteredStudents.length}</span> dari {students.length} Santri
        </span>
      </div>

      {/* Student Table or Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {students.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs border border-blue-100">
              <Users className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                Database Santri Masih Kosong
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda dapat mengunggah file Excel (.xlsx / .csv) data santri Pondok Pesantren Qotrun Nada atau menambahkan santri satu per satu.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Import File Excel Sekarang</span>
              </button>

              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Manual</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Foto</th>
                    <th className="py-3 px-4">NIP Pondok</th>
                    <th className="py-3 px-4">Nomor Kartu</th>
                    <th className="py-3 px-4">Nama Lengkap Santri</th>
                    <th className="py-3 px-4">Kelas / Rombel</th>
                    <th className="py-3 px-4">Kamar / Asrama</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">No. HP Orang Tua / Wali</th>
                    <th className="py-3 px-4 text-center">Kartu QR</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((st, index) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-3 px-4">
                          <img
                            src={
                              st.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name)}&background=2563eb&color=fff`
                            }
                            alt={st.name}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 bg-slate-100"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {st.nis}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {st.noKartu || st.nisn || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{st.name}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                            {st.className}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {st.roomName ? (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {st.roomName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              st.gender === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {st.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{st.parentPhone || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setActiveStudentCard(st)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
                            title="Lihat & Cetak Kartu ID QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Lihat Kartu</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(st)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Santri"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(st)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Santri"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Tidak ada santri ditemukan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st) => (
                  <div key={st.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            st.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name)}&background=2563eb&color=fff`
                          }
                          alt={st.name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 bg-slate-100 shrink-0"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">{st.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            NIS: {st.nis} {st.nisn ? `• NISN: ${st.nisn}` : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          st.gender === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                        }`}
                      >
                        {st.gender === 'L' ? 'L' : 'P'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kelas:</span>
                        <span className="font-semibold text-blue-700">{st.className}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kamar:</span>
                        <span className="font-semibold text-emerald-700">{st.roomName || '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        onClick={() => setActiveStudentCard(st)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Lihat Kartu QR</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(st)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 bg-slate-100 rounded-lg text-xs"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st)}
                          className="p-1.5 text-rose-600 bg-rose-50 rounded-lg text-xs"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada santri yang sesuai kriteria pencarian.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Hapus Semua Data Santri?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini akan mengosongkan seluruh database santri ({students.length} santri). Anda dapat memperbarui kembali data kapan saja melalui tombol <strong>Import Excel</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteAllConfirmOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAllStudents}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Student Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Hapus Data Santri?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Yakin ingin menghapus data santri <strong>&quot;{studentToDelete.name}&quot;</strong> (NIP/NIS: {studentToDelete.nis})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Ya, Hapus Santri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isExcelModalOpen && (
        <ExcelImportModal
          onClose={() => setIsExcelModalOpen(false)}
          onImportSuccess={handleImportSuccess}
          existingCount={students.length}
        />
      )}

      {/* Add / Edit Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-semibold text-slate-900 text-base">
                {editingStudent ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Pondok (NIS) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    placeholder="20251001"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Kartu (Cazh ID)</label>
                  <input
                    type="text"
                    value={formNoKartu}
                    onChange={(e) => setFormNoKartu(e.target.value)}
                    placeholder="0089234011"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Santri *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Muhammad Faiz Pratama"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas / Rombel *</label>
                  <input
                    type="text"
                    required
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    placeholder="Contoh: Kulliyatul Muallimin 1 / Kelas 7"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kamar / Asrama</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="Contoh: Kamar 01 (Abu Bakar)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Foto Santri (Opsional)</label>
                <input
                  type="url"
                  value={formAvatarUrl}
                  onChange={(e) => setFormAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Santri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Student Card Modal */}
      {activeStudentCard && (
        <StudentCardModal
          student={activeStudentCard}
          settings={settings}
          onClose={() => setActiveStudentCard(null)}
        />
      )}

      {/* Batch Cards Print Modal */}
      {isBatchPrinting && (
        <BatchCardsModal
          students={students}
          settings={settings}
          onClose={() => setIsBatchPrinting(false)}
        />
      )}
    </div>
  );
};

