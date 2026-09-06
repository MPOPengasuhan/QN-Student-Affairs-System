import React, { useState } from 'react';
import { Student, Room, Teacher, UserAccount, SchoolSettings } from '../types';
import { storageService } from '../services/storageService';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  Users,
  Search,
  Trash2,
  Send,
  Video,
  Globe,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface StandaloneRoomFormViewProps {
  students: Student[];
  rooms: Room[];
  teachers: Teacher[];
  currentUser?: UserAccount | null;
  settings: SchoolSettings;
  preselectedRoomNumber?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const StandaloneRoomFormView: React.FC<StandaloneRoomFormViewProps> = ({
  students,
  rooms,
  teachers,
  currentUser,
  settings,
  preselectedRoomNumber,
  onBack,
  onSuccess,
}) => {
  // 1. Musyrif & Kamar Information State
  const [supervisorName, setSupervisorName] = useState<string>(() => {
    return currentUser ? currentUser.name : '';
  });
  const [whatsapp, setWhatsapp] = useState<string>(() => {
    return currentUser?.phone || '';
  });
  const [email, setEmail] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<'QN1' | 'QN2'>('QN1');
  const [selectedGender, setSelectedGender] = useState<'L' | 'P'>(() => {
    return currentUser?.gender || 'L';
  });
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(() => {
    return preselectedRoomNumber || currentUser?.assignedRoomName || '';
  });

  // 2. Santri Selection State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => {
    if (preselectedRoomNumber) {
      return students.filter((s) => s.roomName === preselectedRoomNumber).map((s) => s.id);
    }
    return [];
  });

  // 3. CCTV, Cazh ID & Kendala
  const [cctvStatus, setCctvStatus] = useState<string>('SUDAH DAPAT AKSES MONITORING HP');
  const [cazhIdStatus, setCazhIdStatus] = useState<string>('SUDAH MENGABSEN VIA LINK CAZHID');
  const [kendalaNotes, setKendalaNotes] = useState<string>('');

  // Status & Notification
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Get occupied rooms and unavailable students
  const occupiedRooms = storageService.getOccupiedRoomNames();
  const unavailableStudentMap = storageService.getUnavailableStudentMap();

  // Filter rooms strictly by selected Pondok (QN1/QN2) and Gender (L/P)
  const filteredRooms = rooms.filter((r) => {
    const matchesLocation = r.location === selectedLocation;
    const matchesGender = r.gender === selectedGender;
    return matchesLocation && matchesGender;
  });

  const handleRoomChange = (roomNum: string) => {
    setSelectedRoomNumber(roomNum);
  };

  // Autocomplete matching students for search:
  // Must match selectedGender, selectedLocation (if defined on student), and not already in this room
  const matchingStudents = students.filter((s) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.noKartu && s.noKartu.includes(q)) ||
      s.className.toLowerCase().includes(q);

    const matchesGender = s.gender === selectedGender;
    const matchesPondok = !s.tempat || s.tempat === selectedLocation;
    const isAlreadySelected = selectedStudentIds.includes(s.id);

    return matchesQuery && matchesGender && matchesPondok && !isAlreadySelected;
  }).slice(0, 10);

  const handleAddStudent = (student: Student) => {
    const unavail = unavailableStudentMap.get(student.id) || (student.nis && unavailableStudentMap.get(student.nis));
    if (unavail) {
      setNotification({
        type: 'error',
        message: `Santri ${student.name} tidak dapat dipilih karena ${
          unavail.status === 'APPROVED'
            ? `sudah terdaftar di ${unavail.roomName}`
            : `sedang diajukan ke ${unavail.roomName} (menunggu approval admin)`
        }.`,
      });
      return;
    }

    if (!selectedStudentIds.includes(student.id)) {
      setSelectedStudentIds((prev) => [...prev, student.id]);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
  };

  // Selected students full objects
  const addedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  // Handle Form Submit (Procedural Submission -> Approval Center)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!supervisorName.trim()) {
      setNotification({ type: 'error', message: 'Nama Musyrif / Guru wajib diisi.' });
      return;
    }

    if (!selectedLocation) {
      setNotification({ type: 'error', message: 'Silakan pilih Pondok (QN1 / QN2).' });
      return;
    }

    if (!selectedRoomNumber) {
      setNotification({ type: 'error', message: 'Silakan pilih kamar asrama.' });
      return;
    }

    // Check if room is already occupied or pending by someone else
    const roomConflict = occupiedRooms.find((r) => r.roomName === selectedRoomNumber);
    if (roomConflict && roomConflict.supervisorName !== supervisorName) {
      setNotification({
        type: 'error',
        message: `Kamar ${selectedRoomNumber} sudah ${
          roomConflict.status === 'APPROVED' ? 'terisi' : 'dalam pengajuan'
        } oleh ${roomConflict.supervisorName}. Kamar yang sudah terisi tidak bisa diisi lagi oleh guru lain.`,
      });
      return;
    }

    if (selectedStudentIds.length === 0) {
      setNotification({ type: 'error', message: 'Tambahkan minimal 1 santri anggota kamar.' });
      return;
    }

    // Check if any selected student is already assigned elsewhere
    const conflictStudent = addedStudents.find((s) => {
      const u = unavailableStudentMap.get(s.id) || (s.nis && unavailableStudentMap.get(s.nis));
      return u && u.roomName !== selectedRoomNumber;
    });
    if (conflictStudent) {
      const u = unavailableStudentMap.get(conflictStudent.id)!;
      setNotification({
        type: 'error',
        message: `Santri ${conflictStudent.name} sudah terdata di ${u.roomName}. Anggota yang sudah terdata tidak bisa didaftarkan lagi.`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const targetRoom = rooms.find((r) => r.roomNumber === selectedRoomNumber);
      const studentList = addedStudents.map((s) => ({
        id: s.id,
        name: s.name,
        nis: s.nis,
        className: s.className,
      }));

      // Procedural Submission -> Approval Center
      storageService.submitRoomAssignment({
        roomId: targetRoom?.id || `room-${selectedRoomNumber}`,
        roomName: selectedRoomNumber,
        building: targetRoom?.building || `Gedung ${selectedLocation}`,
        location: selectedLocation,
        gender: selectedGender,
        supervisorCode: currentUser?.teacherCode || currentUser?.username || supervisorName,
        supervisorName: supervisorName.trim(),
        supervisorPhone: whatsapp.trim(),
        supervisorEmail: email.trim(),
        studentIds: selectedStudentIds,
        studentList,
        cctvStatus,
        cazhIdStatus,
        kendalaNotes: kendalaNotes.trim(),
        notes: `Pengajuan prosedural kamar ${selectedRoomNumber} (${selectedLocation}, JK: ${selectedGender === 'L' ? 'Putra' : 'Putri'}).`,
      });

      setNotification({
        type: 'success',
        message: `Pengajuan kamar ${selectedRoomNumber} (${addedStudents.length} santri) BERHASIL dikirim ke Approval Center! Anda akan resmi menjadi Wali Kamar setelah disetujui Admin.`,
      });

      setTimeout(() => {
        onSuccess();
        onBack();
      }, 1800);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Terjadi kesalahan saat mengajukan data. Silakan coba lagi.',
      });
      setIsSubmitting(false);
    }
  };

  const userRoleBadge = `Pondok ${selectedLocation} • ${selectedGender === 'L' ? 'Putra' : 'Putri'}`;

  return (
    <div className="min-h-screen bg-emerald-50/40 py-8 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Form Pendataan Kamar Santri
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Lengkapi data santri anggota kamar, CCTV, dan pengabsenan Cazh ID.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {userRoleBadge}
            </span>
          </div>
        </div>

        {/* Procedural Banner Info */}
        <div className="bg-emerald-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Prosedur Pendataan Kamar & Status Wali Kamar</span>
          </div>
          <p className="text-xs text-emerald-50 leading-relaxed">
            Seluruh santri belum mendapatkan kamar sampai guru/musyrif mengisi form pendataan ini.
            Pengisian bersifat prosedural: data akan dikirim ke <strong>Approval Center</strong>. Setelah disetujui Admin, Anda otomatis menjadi <strong>Wali Kamar resmi</strong> untuk kamar tersebut. Kamar dan santri yang sudah terisi terkunci dan tidak dapat didata oleh guru lain.
          </p>
        </div>

        {/* Notification Toast/Banner */}
        {notification && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 shadow-xs animate-in fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. INFORMASI MUSYRIF, PONDOK & KAMAR */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide uppercase">
              <User className="w-4 h-4 text-emerald-600" />
              <span>1. INFORMASI MUSYRIF, PONDOK & KAMAR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Nama Musyrif */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Musyrif / Guru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Musyrif / Ustadz"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Nomor WhatsApp */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 08123456789"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Email Gmail Aktif */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Gmail Aktif <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {/* Pilih Pondok (QN1 / QN2) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pondok <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation('QN1');
                      setSelectedRoomNumber('');
                      setSelectedStudentIds([]);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedLocation === 'QN1'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Pondok QN1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation('QN2');
                      setSelectedRoomNumber('');
                      setSelectedStudentIds([]);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedLocation === 'QN2'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Pondok QN2</span>
                  </button>
                </div>
              </div>

              {/* Jenis Kelamin (Putra / Putri) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jenis Kelamin Kamar & Santri <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGender('L');
                      setSelectedRoomNumber('');
                      setSelectedStudentIds([]);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedGender === 'L'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Putra (L)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGender('P');
                      setSelectedRoomNumber('');
                      setSelectedStudentIds([]);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedGender === 'P'
                        ? 'bg-pink-600 text-white border-pink-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Putri (P)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pilih Kamar Kelolaan */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pilih Kamar Kelolaan ({selectedLocation} • {selectedGender === 'L' ? 'Putra' : 'Putri'}) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedRoomNumber}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">
                  {filteredRooms.length > 0
                    ? `-- Pilih Kamar (${filteredRooms.length} Kamar di Pondok ${selectedLocation}) --`
                    : `-- Tidak ada kamar ${selectedGender === 'L' ? 'Putra' : 'Putri'} di Pondok ${selectedLocation} --`}
                </option>
                {filteredRooms.map((r) => {
                  const occ = occupiedRooms.find((o) => o.roomName === r.roomNumber);
                  const isLocked = Boolean(occ && occ.supervisorName !== supervisorName);

                  return (
                    <option key={r.id} value={r.roomNumber} disabled={isLocked}>
                      {r.roomNumber} - {r.building}
                      {occ
                        ? occ.status === 'APPROVED'
                          ? ` 🔒 (SUDAH TERISI - Wali: ${occ.supervisorName})`
                          : ` ⏳ (SEDANG DIAJUKAN - Oleh: ${occ.supervisorName})`
                        : ' ✅ (Tersedia)'}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                *Kamar yang sudah terisi atau sedang dalam pengajuan terkunci dan tidak dapat dipilih oleh guru lain.
              </p>
            </div>
          </div>

          {/* 2. ANGGOTA SANTRI KAMAR */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide uppercase">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>2. ANGGOTA SANTRI KAMAR ( {addedStudents.length} SANTRI )</span>
              </div>
              <span className="text-[11px] italic text-slate-400">
                *Cari nama santri lalu klik untuk menambahkan
              </span>
            </div>

            {/* Search Input with Autocomplete Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama santri, NIP Pondok, atau kelas..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Autocomplete Popup */}
              {isSearchOpen && matchingStudents.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {matchingStudents.map((s) => {
                    const unavail = unavailableStudentMap.get(s.id) || (s.nis && unavailableStudentMap.get(s.nis));
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => handleAddStudent(s)}
                        disabled={Boolean(unavail)}
                        className={`w-full p-3 text-left flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                          unavail ? 'bg-slate-50 opacity-60 cursor-not-allowed' : 'hover:bg-emerald-50/70'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            NIP: {s.nis} • Kelas: {s.className} • Pondok: {s.tempat || selectedLocation}
                          </p>
                          {unavail && (
                            <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                              {unavail.status === 'APPROVED'
                                ? `Sudah terdata di ${unavail.roomName}`
                                : `Sedang diajukan ke ${unavail.roomName}`}
                            </p>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-1.5 font-bold text-[11px] px-2 py-1 rounded-lg ${
                            unavail
                              ? 'bg-slate-200 text-slate-500'
                              : 'text-emerald-700 bg-emerald-100'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{unavail ? 'Terkunci' : 'Tambah'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Added Students Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">NIP / ID</th>
                    <th className="py-2.5 px-3">NAMA SANTRI</th>
                    <th className="py-2.5 px-3">KELAS</th>
                    <th className="py-2.5 px-3 text-center w-16">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {addedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Belum ada santri yang ditambahkan.
                      </td>
                    </tr>
                  ) : (
                    addedStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                          {s.nis}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {s.name}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[11px]">
                            {s.className}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(s.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus dari kamar ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. AKSES CCTV, ABSEN CAZH ID, & KENDALA */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide uppercase">
              <Video className="w-4 h-4 text-emerald-600" />
              <span>3. AKSES CCTV, ABSEN CAZH ID, & KENDALA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Akses Monitoring CCTV */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Akses Monitoring CCTV Kamar (HP) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={cctvStatus}
                  onChange={(e) => setCctvStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="SUDAH DAPAT AKSES MONITORING HP">
                    SUDAH DAPAT AKSES MONITORING HP
                  </option>
                  <option value="BELUM DAPAT AKSES / KENDALA HP">
                    BELUM DAPAT AKSES / KENDALA HP
                  </option>
                </select>
              </div>

              {/* Pengabsenan Kamar via Web Cazh ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pengabsenan Kamar via Web Cazh ID <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={cazhIdStatus}
                  onChange={(e) => setCazhIdStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="SUDAH MENGABSEN VIA LINK CAZHID">
                    SUDAH MENGABSEN VIA LINK CAZHID
                  </option>
                  <option value="BELUM MENGABSEN / KENDALA JARINGAN">
                    BELUM MENGABSEN / KENDALA JARINGAN
                  </option>
                </select>
              </div>
            </div>

            {/* Catatan Kendala Musyrif */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Catatan Kendala Musyrif (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Tuliskan jika ada kendala fasilitas kamar atau perilaku santri..."
                value={kendalaNotes}
                onChange={(e) => setKendalaNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Kirim Data Kamar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
