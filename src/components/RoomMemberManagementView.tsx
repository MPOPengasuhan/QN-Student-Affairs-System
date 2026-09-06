import React, { useState, useMemo } from 'react';
import { Student, Room, SchoolSettings, UserAccount } from '../types';
import { storageService } from '../services/storageService';
import * as XLSX from 'xlsx';
import {
  Users,
  Home,
  UserPlus,
  Trash2,
  ArrowRightLeft,
  Search,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Plus,
  X,
  Building,
  Filter,
} from 'lucide-react';

interface RoomMemberManagementViewProps {
  rooms: Room[];
  students: Student[];
  settings: SchoolSettings;
  currentUser?: UserAccount | null;
  onRefresh: () => void;
  onOpenStandaloneForm?: (roomNumber: string) => void;
}

export const RoomMemberManagementView: React.FC<RoomMemberManagementViewProps> = ({
  rooms,
  students,
  settings,
  currentUser,
  onRefresh,
  onOpenStandaloneForm,
}) => {
  const user = currentUser || storageService.getCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'PEMBINA';
  const isWaliKamar = user?.role === 'WALI_KAMAR' || user?.role === 'MUSYRIF';
  const assignedRoomName = (user?.assignedRoomName || '').trim();
  const hasAssignedRoom = Boolean(
    assignedRoomName &&
    assignedRoomName !== '-' &&
    assignedRoomName.toLowerCase() !== 'belum ada kamar' &&
    assignedRoomName.toLowerCase() !== 'tanpa kamar'
  );

  const isRestrictedWaliKamar = !isAdmin && isWaliKamar;

  const [selectedLocation, setSelectedLocation] = useState<'ALL' | 'QN1' | 'QN2'>('ALL');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(() => {
    if (isRestrictedWaliKamar && assignedRoomName) {
      return assignedRoomName;
    }
    return rooms[0]?.roomNumber || '';
  });
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addSearchQuery, setAddSearchQuery] = useState<string>('');
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string[]>([]);

  // Move Member Modal State
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [targetRoomNumber, setTargetRoomNumber] = useState<string>('');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    if (isRestrictedWaliKamar && assignedRoomName) {
      const myRoom = rooms.filter((r) => r.roomNumber.toLowerCase() === assignedRoomName.toLowerCase());
      if (myRoom.length > 0) return myRoom;
      return [{
        id: `room-assigned-${assignedRoomName}`,
        roomNumber: assignedRoomName,
        building: 'Asrama Terhubung',
        capacity: 20,
        supervisorName: currentUser?.name || 'Wali Kamar',
        gender: currentUser?.gender || 'L',
        location: (currentUser?.campus as 'QN1' | 'QN2') || 'QN2',
        isFilled: true,
        currentStudents: [],
      }];
    }

    return rooms.filter((r) => {
      if (selectedLocation === 'ALL') return true;
      if (selectedLocation === 'QN1') {
        return r.location === 'QN1' || r.gender === 'P' || r.building.toLowerCase().includes('putri') || r.building.toLowerCase().includes('qn1');
      }
      if (selectedLocation === 'QN2') {
        return r.location === 'QN2' || r.gender === 'L' || r.building.toLowerCase().includes('putra') || r.building.toLowerCase().includes('qn2');
      }
      return true;
    });
  }, [rooms, selectedLocation, isRestrictedWaliKamar, assignedRoomName, currentUser]);

  const activeRoom = (isRestrictedWaliKamar && assignedRoomName)
    ? (rooms.find((r) => r.roomNumber.toLowerCase() === assignedRoomName.toLowerCase()) || filteredRooms[0])
    : (rooms.find((r) => r.roomNumber === selectedRoomNumber) || filteredRooms[0]);

  const currentRoomNumber = (isRestrictedWaliKamar && assignedRoomName)
    ? assignedRoomName
    : (activeRoom?.roomNumber || selectedRoomNumber);

  // Members of the selected room
  const roomMembers = students.filter((s) => s.roomName === currentRoomNumber);

  const filteredMembers = roomMembers.filter((s) => {
    const q = searchMemberQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.noKartu && s.noKartu.includes(q)) ||
      s.className.toLowerCase().includes(q)
    );
  });

  // Students available to add (not in current room)
  const availableStudentsToAdd = students.filter((s) => {
    if (s.roomName === currentRoomNumber) return false;
    if (!addSearchQuery.trim()) return true;
    const q = addSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.noKartu && s.noKartu.includes(q)) ||
      s.className.toLowerCase().includes(q)
    );
  }).slice(0, 30);

  // Remove student from room
  const handleRemoveMember = (student: Student) => {
    if (confirm(`Keluarkan ${student.name} dari ${currentRoomNumber}?`)) {
      storageService.removeStudentFromRoom(student.id, currentUser?.name);
      onRefresh();
      showToast(`${student.name} berhasil dikeluarkan dari kamar.`);
    }
  };

  // Bulk add selected students
  const handleConfirmAddMembers = () => {
    if (selectedStudentToAdd.length === 0) return;
    selectedStudentToAdd.forEach((stId) => {
      storageService.addStudentToRoom(stId, currentRoomNumber, currentUser?.name);
    });
    setIsAddModalOpen(false);
    setSelectedStudentToAdd([]);
    setAddSearchQuery('');
    onRefresh();
    showToast(`Berhasil menambahkan ${selectedStudentToAdd.length} santri ke ${currentRoomNumber}!`);
  };

  // Move student to another room
  const handleConfirmMove = () => {
    if (!movingStudent || !targetRoomNumber) return;
    storageService.moveStudentToRoom(movingStudent.id, targetRoomNumber, currentUser?.name);
    setMovingStudent(null);
    setTargetRoomNumber('');
    onRefresh();
    showToast(`${movingStudent.name} berhasil dipindahkan ke ${targetRoomNumber}!`);
  };

  // Export room members to Excel
  const handleExportExcel = () => {
    const data = roomMembers.map((s, idx) => ({
      NO: idx + 1,
      'NIP PONDOK': s.nis,
      'NAMA SANTRI': s.name,
      KELAS: s.className,
      JK: s.gender,
      'NO KARTU': s.noKartu || s.nisn || '-',
      'KAMAR ASRAMA': currentRoomNumber,
      'NO WA WALI': s.parentPhone || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 6 }, { wch: 20 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Anggota Kamar');
    XLSX.writeFile(wb, `Anggota_${currentRoomNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Access control check: Only Wali Kamar and Admin can use this page
  if (!isAdmin && !isWaliKamar) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800">Akses Ditolak</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Atur Anggota Kamar <strong>TIDAK BISA DIAKSES OLEH SIAPAPUN</strong> kecuali Wali Kamar yang sudah terdata sebagai wali kamar tersebut, dan Admin Pengasuhan di halaman admin.
        </p>
        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono border border-slate-200">
          Akun saat ini: {user?.name || 'Tamu'} ({user?.role || 'Guest'})
        </div>
      </div>
    );
  }

  // Wali Kamar must be assigned to a room
  if (isWaliKamar && !hasAssignedRoom) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-amber-200 shadow-sm text-center space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800">Akun Belum Terhubung Kamar</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Anda terdaftar sebagai <strong>Wali Kamar</strong> ({user?.name}), namun akun Anda belum terhubung ke kamar asrama.
          Hanya wali kamar yang sudah terhubung ke kamar yang dapat mengatur anggota kamarnya.
        </p>
        {onOpenStandaloneForm && (
          <button
            type="button"
            onClick={() => onOpenStandaloneForm('')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            Isi Form Pendataan Kamar Sekarang
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Home className="w-6 h-6 text-emerald-600" />
            Pengaturan & Edit Anggota Kamar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola penempatan, penambahan, pemindahan, dan penghapusan santri pada masing-masing kamar asrama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenStandaloneForm && (
            <button
              type="button"
              onClick={() => onOpenStandaloneForm(currentRoomNumber)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Buka Form Musyrif</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Anggota (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Selection Control Card / Wali Kamar Room Lock Indicator */}
      {isRestrictedWaliKamar ? (
        !assignedRoomName ? (
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-900">
                  Akun Anda Belum Terhubung ke Kamar Asrama
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Anda harus mengisi Form Pendataan Kamar terlebih dahulu untuk mengklaim kamar dan santri asrama Anda.
                </p>
              </div>
            </div>
            {onOpenStandaloneForm && (
              <button
                type="button"
                onClick={onOpenStandaloneForm}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                Isi Form Pendataan Kamar Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    Kamar Terhubung Anda
                  </span>
                  <span className="text-xs text-emerald-700 font-bold">Wali: {currentUser?.name}</span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {assignedRoomName}
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({roomMembers.length} Santri Terdaftar)
                  </span>
                </h3>
              </div>
            </div>

            <div className="text-xs text-emerald-800 font-medium bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200">
              🔒 Dibatasi hanya untuk kamar terhubung Anda
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Campus Location Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Lokasi Kampus:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedLocation('ALL')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedLocation === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedLocation('QN2')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedLocation === 'QN2'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                QN2 (Putra)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLocation('QN1')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedLocation === 'QN1'
                    ? 'bg-pink-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                QN1 (Putri)
              </button>
            </div>
          </div>

          {/* Room Dropdown Selector */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Pilih Kamar yang Dikelola:
            </label>
            <select
              value={currentRoomNumber}
              onChange={(e) => setSelectedRoomNumber(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {filteredRooms.map((r) => {
                const count = students.filter((s) => s.roomName === r.roomNumber).length;
                return (
                  <option key={r.id} value={r.roomNumber}>
                    {r.roomNumber} — {count} Santri ({r.building || r.location || 'Asrama'} • Wali: {r.supervisorName})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Active Room Information Card */}
      {activeRoom && (
        <div className="bg-emerald-800 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                {activeRoom.location || 'QN'} • {activeRoom.gender === 'P' ? 'Putri' : 'Putra'}
              </span>
              <span className="text-emerald-200 text-xs font-medium">
                {activeRoom.building || 'Gedung Asrama'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {activeRoom.roomNumber}
            </h2>
            <p className="text-xs text-emerald-100">
              Musyrif / Pembina: <span className="font-bold text-white">{activeRoom.supervisorName}</span>
              {activeRoom.supervisorPhone ? ` (${activeRoom.supervisorPhone})` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/10">
              <p className="text-[10px] uppercase font-bold text-emerald-200">Total Anggota</p>
              <p className="text-2xl font-black">{roomMembers.length}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedStudentToAdd([]);
                setAddSearchQuery('');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Tambah Santri</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari santri di kamar ini..."
              value={searchMemberQuery}
              onChange={(e) => setSearchMemberQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <span className="text-xs font-bold text-slate-600 self-center">
            {filteredMembers.length} Santri Terdaftar di Kamar Ini
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">NIP Pondok</th>
                <th className="py-3 px-4">Nama Santri</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">JK</th>
                <th className="py-3 px-4">Nomor Kartu</th>
                <th className="py-3 px-4">No. WA Wali</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada santri yang terdaftar di kamar {currentRoomNumber}. Klik tombol "Tambah Santri" di atas untuk menambahkan.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{st.nis}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{st.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold text-[11px]">
                        {st.className}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.gender === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                      }`}>
                        {st.gender === 'L' ? 'Putra' : 'Putri'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{st.noKartu || st.nisn || '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{st.parentPhone || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMovingStudent(st);
                            setTargetRoomNumber(rooms.find((r) => r.roomNumber !== currentRoomNumber)?.roomNumber || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Pindahkan ke kamar lain"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Pindah</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(st)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Keluarkan dari kamar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Santri ke Kamar */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Santri ke {currentRoomNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih santri dari database untuk dimasukkan ke kamar ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama santri, NIP, atau kelas..."
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {availableStudentsToAdd.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ada santri ditemukan.
                </div>
              ) : (
                availableStudentsToAdd.map((st) => {
                  const isChecked = selectedStudentToAdd.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      className={`p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/60 rounded-xl cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50 border border-emerald-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentToAdd((prev) => [...prev, st.id]);
                            } else {
                              setSelectedStudentToAdd((prev) => prev.filter((id) => id !== st.id));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{st.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            NIP: {st.nis} • Kelas: {st.className} {st.roomName ? `• Saat ini di: ${st.roomName}` : '• (Belum ada kamar)'}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        st.gender === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                      }`}>
                        {st.gender === 'L' ? 'L' : 'P'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {selectedStudentToAdd.length} Santri Dipilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={selectedStudentToAdd.length === 0}
                  onClick={handleConfirmAddMembers}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Tambahkan ({selectedStudentToAdd.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pindah Kamar Santri */}
      {movingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pindahkan Santri ke Kamar Baru
              </h3>
              <p className="text-xs text-slate-500">
                Pindahkan <span className="font-bold text-slate-800">{movingStudent.name}</span> dari <span className="font-semibold text-emerald-700">{currentRoomNumber}</span> ke kamar lain.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pilih Kamar Tujuan:
              </label>
              <select
                value={targetRoomNumber}
                onChange={(e) => setTargetRoomNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {rooms
                  .filter((r) => r.roomNumber !== currentRoomNumber)
                  .map((r) => (
                    <option key={r.id} value={r.roomNumber}>
                      {r.roomNumber} ({r.building || r.location || 'Asrama'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Konfirmasi Pindah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
