import React, { useState, useEffect } from 'react';
import {
  Student,
  Room,
  Teacher,
  UserAccount,
  SchoolSettings,
} from '../types';
import {
  Home,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Bed,
  Moon,
  ClipboardCheck,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Info,
} from 'lucide-react';
import { storageService } from '../services/storageService';

interface RoomAssignmentFormViewProps {
  students: Student[];
  rooms: Room[];
  teachers: Teacher[];
  currentUser: UserAccount;
  settings: SchoolSettings;
  preselectedRoomNumber?: string;
  onSubmitSuccess?: () => void;
}

export const RoomAssignmentFormView: React.FC<RoomAssignmentFormViewProps> = ({
  students,
  rooms,
  teachers,
  currentUser,
  settings,
  preselectedRoomNumber,
  onSubmitSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'assignment' | 'night_attendance'>('assignment');
  
  // Selected Room
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(
    preselectedRoomNumber || currentUser.assignedRoomName || (rooms.length > 0 ? rooms[0].roomNumber : '')
  );

  // Search & Filter for unassigned students
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  // Selected student IDs to add to room
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Night attendance state
  const [nightAttendanceStatus, setNightAttendanceStatus] = useState<Record<string, 'hadir' | 'sakit' | 'izin' | 'alpa'>>({});
  const [nightNotes, setNightNotes] = useState('');

  const currentRoom = rooms.find((r) => r.roomNumber === selectedRoomNumber);
  const existingMembers = students.filter((s) => s.roomName === selectedRoomNumber);

  // Available students who are either not assigned or already in this room
  const availableStudents = students.filter((s) => {
    const isUnassigned = !s.roomName || s.roomName.trim() === '';
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery) ||
      (s.nisn && s.nisn.includes(searchQuery));
    const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;
    const matchesClass = classFilter === 'ALL' || s.className === classFilter;

    return isUnassigned && matchesSearch && matchesGender && matchesClass;
  });

  // Unique classes for filter
  const classesList = Array.from(new Set(students.map((s) => s.className).filter(Boolean)));

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAvailable = () => {
    const availableIds = availableStudents.map((s) => s.id);
    const remainingSlots = currentRoom ? Math.max(0, currentRoom.capacity - existingMembers.length) : 10;
    const toSelect = availableIds.slice(0, remainingSlots);
    setSelectedStudentIds(toSelect);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  // Submit Room Assignment
  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedRoomNumber) {
      setFeedback({ type: 'error', message: 'Pilih kamar asrama terlebih dahulu.' });
      return;
    }

    if (selectedStudentIds.length === 0) {
      setFeedback({ type: 'error', message: 'Pilih minimal 1 santri untuk didaftarkan ke kamar.' });
      return;
    }

    const targetRoom = currentRoom;
    if (!targetRoom) {
      setFeedback({ type: 'error', message: 'Data kamar tidak valid.' });
      return;
    }

    const selectedStudentsData = students
      .filter((s) => selectedStudentIds.includes(s.id))
      .map((s) => ({ id: s.id, name: s.name, nis: s.nis, className: s.className }));

    setIsSubmitting(true);

    try {
      // If user is ADMIN, approve directly or submit for approval
      if (currentUser.role === 'ADMIN') {
        const sub = storageService.submitRoomAssignment({
          roomId: targetRoom.id,
          roomName: targetRoom.roomNumber,
          building: targetRoom.building,
          supervisorCode: currentUser.teacherCode || currentUser.username,
          supervisorName: currentUser.name,
          studentIds: selectedStudentIds,
          studentList: selectedStudentsData,
          notes: notes || 'Pendataan langsung oleh Administrator',
        });

        storageService.approveRoomAssignment(sub.id, currentUser.name);

        setFeedback({
          type: 'success',
          message: `Berhasil! ${selectedStudentIds.length} santri langsung ditempatkan di ${targetRoom.roomNumber}.`,
        });
      } else {
        // Musyrif submit to Approval Center
        storageService.submitRoomAssignment({
          roomId: targetRoom.id,
          roomName: targetRoom.roomNumber,
          building: targetRoom.building,
          supervisorCode: currentUser.teacherCode || currentUser.username,
          supervisorName: currentUser.name,
          studentIds: selectedStudentIds,
          studentList: selectedStudentsData,
          notes: notes || 'Diajukan oleh Musyrif kamar',
        });

        setFeedback({
          type: 'success',
          message: `Pengajuan pendataan ${selectedStudentIds.length} santri ke ${targetRoom.roomNumber} berhasil dikirim ke Approval Center Admin.`,
        });
      }

      setSelectedStudentIds([]);
      setNotes('');
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal mengirim pengajuan: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Night Attendance
  const handleSubmitNightAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (existingMembers.length === 0) {
      setFeedback({ type: 'error', message: 'Belum ada santri terdaftar di kamar ini untuk absen malam.' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    existingMembers.forEach((member) => {
      const status = nightAttendanceStatus[member.id] || 'hadir';
      storageService.saveAttendanceManual({
        id: `att-night-${member.id}-${Date.now()}`,
        studentId: member.id,
        studentNis: member.nis,
        studentName: member.name,
        className: member.className,
        roomName: selectedRoomNumber,
        date: todayStr,
        timeIn: timeStr,
        status,
        notes: `Absen Tidur Malam Asrama (${status.toUpperCase()}) - Musyrif: ${currentUser.name}`,
        recordedBy: `Musyrif ${currentUser.name}`,
        syncedAt: new Date().toISOString(),
      });
    });

    storageService.addActivityLog(
      'kamar',
      'Laporan Absen Malam Asrama',
      `Musyrif ${currentUser.name} menyelesaikan rekap absen malam untuk ${selectedRoomNumber} (${existingMembers.length} santri).`,
      currentUser.name
    );

    setFeedback({
      type: 'success',
      message: `Laporan absen tidur malam untuk kamar ${selectedRoomNumber} berhasil disimpan ke sistem!`,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Home className="w-6 h-6 text-emerald-600" />
            Form Pengisian Kamar Santri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Modul Musyrif / Wali Kamar untuk penempatan anggota asrama dan laporan harian kamar.
          </p>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode('assignment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'assignment'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Pendataan Santri Kamar
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('night_attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'night_attendance'
                ? 'bg-white text-indigo-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌙 Absen Tidur Malam
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Select Room Info Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Room Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Kamar Asrama <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRoomNumber}
              onChange={(e) => {
                setSelectedRoomNumber(e.target.value);
                setSelectedStudentIds([]);
                setFeedback(null);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              {rooms.map((rm) => (
                <option key={rm.id} value={rm.roomNumber}>
                  {rm.roomNumber} ({rm.building})
                </option>
              ))}
            </select>
          </div>

          {/* Room Stats */}
          {currentRoom && (
            <>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs">
                <div className="text-slate-500 font-medium">Musyrif Pembina:</div>
                <div className="font-bold text-emerald-900 mt-0.5 truncate">
                  {currentRoom.supervisorName || currentUser.name}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kapasitas Kamar:</span>
                  <span className="font-bold text-slate-800">
                    {existingMembers.length} / {currentRoom.capacity} Santri
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (existingMembers.length / currentRoom.capacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {activeMode === 'assignment' ? (
        /* MODE: ASSIGNMENT FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Member list currently in room */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Anggota Kamar Saat Ini ({existingMembers.length})
                </h3>
              </div>

              {existingMembers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
                  Kamar ini masih kosong. Silakan pilih santri dari daftar di sebelah kanan untuk didaftarkan.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                  {existingMembers.map((member, idx) => (
                    <div key={member.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">
                          {idx + 1}. {member.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NIS: {member.nis} • {member.className}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        Terdaftar
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Submission Meta */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Catatan Musyrif & Kondisi Kamar
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kondisi ranjang No. 1-6 lengkap, lemari santri sudah dialokasikan, santri pindahan dari kamar sebelumnya..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Dipilih: <strong className="text-emerald-700">{selectedStudentIds.length}</strong> santri baru
                </span>

                <button
                  type="button"
                  onClick={handleSubmitAssignment}
                  disabled={isSubmitting || selectedStudentIds.length === 0}
                  className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {currentUser.role === 'ADMIN' ? 'Terapkan Langsung' : 'Kirim Pengajuan ke Admin'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Available Unassigned Students Selection */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pilih Santri Belum Ada Kamar
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Centang santri yang akan dimasukkan ke {selectedRoomNumber}.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllAvailable}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Pilih Sesuai Kuota
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama / NIS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">Semua Gender</option>
                  <option value="L">Putra (L)</option>
                  <option value="P">Putri (P)</option>
                </select>

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">Semua Rombel/Kelas</option>
                  {classesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Checklist Table */}
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto border border-slate-100 rounded-xl">
                {availableStudents.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    Tidak ada santri belum ber-kamar yang sesuai filter.
                  </div>
                ) : (
                  availableStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleSelectStudent(st.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div className="text-emerald-700">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                              {st.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono">NIS: {st.nis}</span>
                              <span>•</span>
                              <span>{st.className}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            st.gender === 'L'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {st.gender === 'L' ? 'Putra' : 'Putri'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE: NIGHT ATTENDANCE ROLL-CALL */
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-600" />
                Laporan Absen Tidur Malam Santri ({selectedRoomNumber})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cek kehadiran tidur malam santri di kasur / ranjang masing-masing.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg border border-indigo-200">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {existingMembers.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Kamar ini belum memiliki santri anggota. Silakan lakukan pendataan kamar terlebih dahulu.
            </div>
          ) : (
            <form onSubmit={handleSubmitNightAttendance} className="space-y-4">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {existingMembers.map((member, idx) => {
                  const currentStatus = nightAttendanceStatus[member.id] || 'hadir';
                  return (
                    <div key={member.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-800">
                          {idx + 1}. {member.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NIS: {member.nis} • {member.className}
                        </div>
                      </div>

                      {/* Status Buttons */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setNightAttendanceStatus({ ...nightAttendanceStatus, [member.id]: 'hadir' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            currentStatus === 'hadir'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Hadir (Di Kamar)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNightAttendanceStatus({ ...nightAttendanceStatus, [member.id]: 'sakit' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            currentStatus === 'sakit'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Sakit (UKS)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNightAttendanceStatus({ ...nightAttendanceStatus, [member.id]: 'izin' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            currentStatus === 'izin'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Izin Pulang
                        </button>
                        <button
                          type="button"
                          onClick={() => setNightAttendanceStatus({ ...nightAttendanceStatus, [member.id]: 'alpa' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            currentStatus === 'alpa'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Alpa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Simpan Rekap Absen Malam</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
