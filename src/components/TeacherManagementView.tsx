import React, { useState } from 'react';
import { Teacher, SchoolSettings } from '../types';
import { storageService } from '../services/storageService';
import { TeacherExcelImportModal } from './TeacherExcelImportModal';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Edit2,
  Phone,
  BookOpen,
  QrCode,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  X,
  Printer,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface TeacherManagementViewProps {
  teachers: Teacher[];
  settings: SchoolSettings;
  onRefresh: () => void;
}

export const TeacherManagementView: React.FC<TeacherManagementViewProps> = ({
  teachers,
  settings,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('SEMUA');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState<boolean>(false);
  const [teacherToDelete, setTeacherToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherForCard, setSelectedTeacherForCard] = useState<Teacher | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [nip, setNip] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [role, setRole] = useState<Teacher['role']>('Ustadz');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'SEMUA' || t.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setNip(`199${Math.floor(10000000000 + Math.random() * 90000000000)}`);
    setName('');
    setSubject('');
    setPhone('');
    setGender('L');
    setRole('Ustadz');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setNip(t.nip);
    setName(t.name);
    setSubject(t.subject);
    setPhone(t.phone);
    setGender(t.gender);
    setRole(t.role);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nip.trim()) return;

    const teacherData: Teacher = {
      id: editingTeacher ? editingTeacher.id : `tch-${Date.now()}`,
      teacherCode: editingTeacher?.teacherCode || nip.trim(),
      nip: nip.trim(),
      name: name.trim(),
      subject: subject.trim() || 'Pendidikan Agama Islam',
      phone: phone.trim(),
      gender,
      role,
      qrCodeData: nip.trim(),
      createdAt: editingTeacher ? editingTeacher.createdAt : new Date().toISOString(),
    };

    storageService.saveTeacher(teacherData);
    setIsModalOpen(false);
    onRefresh();
    showToast(`Data "${teacherData.name}" berhasil disimpan.`);
  };

  const handleDelete = (id: string, teacherName: string) => {
    setTeacherToDelete({ id, name: teacherName });
  };

  const handleConfirmDeleteSingle = () => {
    if (!teacherToDelete) return;
    const { id, name: teacherName } = teacherToDelete;
    storageService.deleteTeacher(id);
    setTeacherToDelete(null);
    onRefresh();
    showToast(`Data "${teacherName}" berhasil dihapus.`);
  };

  const handleDeleteAll = () => {
    storageService.deleteAllTeachers();
    setIsDeleteAllConfirmOpen(false);
    onRefresh();
    showToast('Semua data dewan asatidz & guru berhasil dihapus.');
  };

  const handleImportSuccess = (imported: Teacher[], replaceAll: boolean) => {
    storageService.saveTeachersBulk(imported, replaceAll);
    setIsExcelModalOpen(false);
    onRefresh();
    showToast(`Berhasil mengimpor ${imported.length} data guru/asatidz!`);
  };

  const handleExportExcel = () => {
    if (teachers.length === 0) return;
    const exportData = filteredTeachers.map((t, idx) => ({
      'No': idx + 1,
      'NIP/NIY': t.nip,
      'Nama Asatidz/Guru': t.name,
      'Tugas/Mapel': t.subject,
      'Peran/Jabatan': t.role,
      'Jenis Kelamin': t.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'No. WhatsApp': t.phone || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Guru & Asatidz');
    XLSX.writeFile(wb, `Data_Asatidz_QN_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Database Dewan Asatidz & Guru
              </h2>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {teachers.length} Asatidz/Guru
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kelola data dewan guru, ustadz/ustadzah, wali kamar, cetak kartu QR, dan impor file Excel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Import Excel */}
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Excel</span>
            </button>

            {/* Export Excel */}
            {teachers.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}

            {/* Delete All */}
            {teachers.length > 0 && (
              <button
                onClick={() => setIsDeleteAllConfirmOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Semua</span>
              </button>
            )}

            {/* Add Teacher */}
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Guru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, NIP, atau mata pelajaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 shrink-0">Peran:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="SEMUA">Semua Peran ({teachers.length})</option>
            <option value="Ustadz">Ustadz</option>
            <option value="Ustadzah">Ustadzah</option>
            <option value="Guru">Guru</option>
            <option value="Wali Kamar">Wali Kamar</option>
            <option value="Pengasuhan">Pengasuhan</option>
            <option value="Staf">Staf</option>
          </select>
        </div>
      </div>

      {/* Teachers List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredTeachers.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">
              Belum ada data asatidz/guru
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan klik tombol "Import Excel" untuk memuat data dari spreadsheet, atau klik "Tambah Guru" untuk mengisi manual.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
              >
                <Upload className="w-4 h-4" />
                Import File Excel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                    <th className="py-3 px-4">NIP / NIY</th>
                    <th className="py-3 px-4">Peran / Jabatan</th>
                    <th className="py-3 px-4">Mata Pelajaran / Tugas</th>
                    <th className="py-3 px-4">WhatsApp</th>
                    <th className="py-3 px-4 text-center">QR Code</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTeachers.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-200">
                            {t.gender === 'L' ? '👨‍🏫' : '🧕'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{t.name}</p>
                            <span className="text-[10px] text-slate-400">
                              {t.gender === 'L' ? 'Ikhwan' : 'Akhwat'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {t.nip}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {t.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{t.subject}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {t.phone ? (
                          <a
                            href={`https://wa.me/${t.phone.replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{t.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedTeacherForCard(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer text-[11px] font-semibold"
                          title="Lihat Kartu QR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Kartu QR</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredTeachers.map((t, idx) => (
                <div key={t.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0 border border-indigo-200">
                        {t.gender === 'L' ? '👨‍🏫' : '🧕'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{t.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">NIP: {t.nip}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      {t.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{t.subject}</span>
                    </div>
                    <div>
                      {t.phone ? (
                        <a
                          href={`https://wa.me/${t.phone.replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 font-semibold truncate"
                        >
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{t.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No WA: -</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => setSelectedTeacherForCard(t)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Kartu QR</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 bg-slate-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 text-rose-600 bg-rose-50 rounded-lg"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Add / Edit Teacher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {editingTeacher ? '✏️' : '➕'}
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {editingTeacher ? 'Edit Data Asatidz/Guru' : 'Tambah Asatidz / Guru Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ust. Ahmad Fauzan, M.Pd.I"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP / NIY *
                  </label>
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="L">Laki-Laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peran / Jabatan *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Teacher['role'])}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="Ustadz">Ustadz</option>
                    <option value="Ustadzah">Ustadzah</option>
                    <option value="Guru">Guru</option>
                    <option value="Wali Kamar">Wali Kamar</option>
                    <option value="Pengasuhan">Pengasuhan</option>
                    <option value="Staf">Staf</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran / Tugas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Dirasah Islamiyah"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Aktif
                </label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete All Teachers */}
      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-100 animate-in fade-in zoom-in duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Semua Data Guru?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan mengosongkan seluruh {teachers.length} data asatidz & guru dari sistem dan database cloud.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllConfirmOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Teacher */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-100 animate-in fade-in zoom-in duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Data Guru / Asatidz?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data <strong>&quot;{teacherToDelete.name}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Excel Import Modal */}
      {isExcelModalOpen && (
        <TeacherExcelImportModal
          existingCount={teachers.length}
          onClose={() => setIsExcelModalOpen(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}

      {/* Teacher QR ID Card Modal */}
      {selectedTeacherForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-700">Kartu Digital QR Asatidz</span>
              <button
                onClick={() => setSelectedTeacherForCard(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="p-4 bg-gradient-to-br from-indigo-900 to-indigo-800 text-white rounded-2xl shadow-md text-left relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-indigo-700/60 pb-2 mb-3">
                  <div>
                    <h4 className="text-xs font-black tracking-wider uppercase">{settings.schoolName || 'QN SYSTEM'}</h4>
                    <p className="text-[9px] text-indigo-200">KARTU TANDA PENGAJAR / ASATIDZ</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white text-indigo-900 font-bold flex items-center justify-center text-xl shrink-0">
                    {selectedTeacherForCard.gender === 'L' ? '👨‍🏫' : '🧕'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate">{selectedTeacherForCard.name}</p>
                    <p className="text-[10px] font-mono text-indigo-200">NIP: {selectedTeacherForCard.nip}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-700 rounded text-[9px] font-semibold text-indigo-100">
                      {selectedTeacherForCard.role} - {selectedTeacherForCard.subject}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-700/60 flex items-center justify-center">
                  <div className="bg-white p-2.5 rounded-xl shadow-xs">
                    <QRCodeSVG value={selectedTeacherForCard.qrCodeData || selectedTeacherForCard.nip} size={110} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
