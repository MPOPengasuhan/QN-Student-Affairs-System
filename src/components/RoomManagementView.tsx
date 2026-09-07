import React, { useState } from 'react';
import { Room, Student, SchoolSettings } from '../types';
import { storageService } from '../services/storageService';
import { RoomExcelImportModal } from './RoomExcelImportModal';
import * as XLSX from 'xlsx';
import {
  Home,
  Plus,
  Search,
  Trash2,
  Edit2,
  Users,
  Phone,
  Bed,
  Building,
  CheckCircle2,
  X,
  Upload,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface RoomManagementViewProps {
  rooms: Room[];
  students: Student[];
  settings: SchoolSettings;
  onRefresh: () => void;
}

export const RoomManagementView: React.FC<RoomManagementViewProps> = ({
  rooms,
  students,
  settings,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [buildingFilter, setBuildingFilter] = useState<string>('SEMUA');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState<boolean>(false);
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [building, setBuilding] = useState<string>('Gedung Asrama Putra Al-Fatih');
  const [capacity, setCapacity] = useState<number>(12);
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [supervisorPhone, setSupervisorPhone] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const buildingOptions = Array.from(new Set(rooms.map((r) => r.building))).filter(Boolean);

  const filteredRooms = rooms.filter((r) => {
    const matchSearch =
      r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supervisorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBuilding = buildingFilter === 'SEMUA' || r.building === buildingFilter;
    return matchSearch && matchBuilding;
  });

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setBuilding(buildingOptions[0] || 'Gedung Asrama Putra Al-Fatih');
    setCapacity(12);
    setSupervisorName('');
    setSupervisorPhone('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Room) => {
    setEditingRoom(r);
    setRoomNumber(r.roomNumber);
    setBuilding(r.building);
    setCapacity(r.capacity);
    setSupervisorName(r.supervisorName);
    setSupervisorPhone(r.supervisorPhone || '');
    setDescription(r.description || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !building.trim()) return;

    const roomData: Room = {
      id: editingRoom ? editingRoom.id : `rm-${Date.now()}`,
      roomNumber: roomNumber.trim(),
      building: building.trim(),
      capacity: Number(capacity) || 10,
      supervisorName: supervisorName.trim() || 'Wali Kamar',
      supervisorPhone: supervisorPhone.trim(),
      description: description.trim(),
      createdAt: editingRoom ? editingRoom.createdAt : new Date().toISOString(),
    };

    storageService.saveRoom(roomData);
    setIsModalOpen(false);
    onRefresh();
    showToast(`Data kamar "${roomData.roomNumber}" berhasil disimpan.`);
  };

  const handleDelete = (id: string, roomName: string) => {
    setRoomToDelete({ id, name: roomName });
  };

  const handleConfirmDeleteSingle = () => {
    if (!roomToDelete) return;
    const { id, name: roomName } = roomToDelete;
    storageService.deleteRoom(id);
    setRoomToDelete(null);
    onRefresh();
    showToast(`Data kamar "${roomName}" berhasil dihapus.`);
  };

  const handleDeleteAll = () => {
    storageService.deleteAllRooms();
    setIsDeleteAllConfirmOpen(false);
    onRefresh();
    showToast('Semua data kamar asrama berhasil dihapus.');
  };

  const handleImportSuccess = (imported: Room[], replaceAll: boolean) => {
    storageService.saveRoomsBulk(imported, replaceAll);
    setIsExcelModalOpen(false);
    onRefresh();
    showToast(`Berhasil mengimpor ${imported.length} data kamar asrama!`);
  };

  const handleExportExcel = () => {
    if (rooms.length === 0) return;
    const exportData = filteredRooms.map((rm, idx) => ({
      'No': idx + 1,
      'Nama/Nomor Kamar': rm.roomNumber,
      'Gedung Asrama': rm.building,
      'Kapasitas Kasur': rm.capacity,
      'Jumlah Penghuni Saat Ini': getOccupantsCount(rm.roomNumber),
      'Wali Kamar / Musyrif': rm.supervisorName,
      'No. HP Musyrif': rm.supervisorPhone || '-',
      'Keterangan': rm.description || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Kamar & Asrama');
    XLSX.writeFile(wb, `Data_Kamar_Asrama_QN_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Count occupants per room
  const getOccupantsCount = (rName: string) => {
    return students.filter((s) => s.roomName === rName).length;
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
                Database Kamar & Komplek Asrama
              </h2>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {rooms.length} Kamar Terdaftar
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kelola kamar santri, komplek gedung asrama, kapasitas kasur, musyrif kamar, dan import Excel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Import Excel */}
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Excel</span>
            </button>

            {/* Export Excel */}
            {rooms.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}

            {/* Delete All */}
            {rooms.length > 0 && (
              <button
                onClick={() => setIsDeleteAllConfirmOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Semua</span>
              </button>
            )}

            {/* Add Room */}
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kamar</span>
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
            placeholder="Cari nama kamar, gedung, atau musyrif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 shrink-0">Gedung:</span>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="SEMUA">Semua Gedung ({rooms.length})</option>
            {buildingOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <Building className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Belum ada data kamar asrama</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan klik tombol "Import Excel" untuk memuat data dari spreadsheet atau "Tambah Kamar" untuk menambahkan secara manual.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition"
              >
                <Upload className="w-4 h-4" />
                Import File Excel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama/Nomor Kamar</th>
                    <th className="py-3 px-4">Komplek / Gedung</th>
                    <th className="py-3 px-4 text-center">Kapasitas & Hunian</th>
                    <th className="py-3 px-4">Wali Kamar / Musyrif</th>
                    <th className="py-3 px-4">No. WhatsApp Musyrif</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredRooms.map((r, idx) => {
                    const occupants = getOccupantsCount(r.roomNumber);
                    const isFull = occupants >= r.capacity;
                    const percent = Math.min(100, Math.round((occupants / r.capacity) * 100));

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-200">
                              <Bed className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{r.roomNumber}</p>
                              <span className="text-[10px] text-slate-400">{r.building}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {r.building}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isFull
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {occupants} / {r.capacity} Santri ({percent}%)
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {r.supervisorName || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.supervisorPhone ? (
                            <a
                              href={`https://wa.me/${r.supervisorPhone.replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{r.supervisorPhone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {r.description || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id, r.roomNumber)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredRooms.map((r, idx) => {
                const occupants = getOccupantsCount(r.roomNumber);
                const isFull = occupants >= r.capacity;

                return (
                  <div key={r.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0 border border-amber-200">
                          <Bed className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">{r.roomNumber}</p>
                          <p className="text-[11px] text-slate-500">{r.building}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isFull
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {occupants}/{r.capacity} Santri
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Musyrif:</span>
                        <span className="font-semibold text-slate-800">{r.supervisorName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">No. WhatsApp:</span>
                        {r.supervisorPhone ? (
                          <a
                            href={`https://wa.me/${r.supervisorPhone.replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 font-semibold inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{r.supervisorPhone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-1">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 bg-slate-100 rounded-lg text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.roomNumber)}
                        className="p-1.5 text-rose-600 bg-rose-50 rounded-lg text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Add / Edit Room */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  {editingRoom ? '✏️' : '➕'}
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {editingRoom ? 'Edit Data Kamar Asrama' : 'Tambah Kamar Asrama Baru'}
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
                  Nomor / Nama Kamar *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kamar 01 (Abu Bakar)"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gedung / Asrama *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Gedung Putra Al-Fatih"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Kasur *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Musyrif / Wali Kamar
                </label>
                <input
                  type="text"
                  placeholder="Ust. Ahmad Fauzan"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. WhatsApp Musyrif
                </label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={supervisorPhone}
                  onChange={(e) => setSupervisorPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Kamar
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan kondisi kamar..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition"
                >
                  Simpan Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete All Rooms */}
      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-100 animate-in fade-in zoom-in duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Semua Kamar?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan mengosongkan seluruh {rooms.length} data kamar asrama dari database.
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

      {/* Confirmation Modal: Delete Single Room */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-100 animate-in fade-in zoom-in duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Data Kamar?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data kamar <strong>&quot;{roomToDelete.name}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Hapus Kamar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Excel Import Modal */}
      {isExcelModalOpen && (
        <RoomExcelImportModal
          existingCount={rooms.length}
          onClose={() => setIsExcelModalOpen(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};
