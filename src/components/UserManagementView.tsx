import React, { useState } from 'react';
import { UserAccount, Teacher, Room, UserRole } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Lock,
  X,
  Check,
} from 'lucide-react';
import { storageService } from '../services/storageService';

interface UserManagementViewProps {
  users: UserAccount[];
  teachers: Teacher[];
  rooms: Room[];
  currentUser: UserAccount;
  onRefresh: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  teachers,
  rooms,
  currentUser,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('12345');
  const [formRole, setFormRole] = useState<UserRole>('GURU');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formTeacherCode, setFormTeacherCode] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAssignedRoom, setFormAssignedRoom] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.teacherCode && u.teacherCode.toLowerCase().includes(q));
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormName('');
    setFormPassword('12345');
    setFormRole('GURU');
    setFormGender('L');
    setFormTeacherCode('');
    setFormPhone('');
    setFormAssignedRoom('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormPassword(user.password || '12345');
    setFormRole(user.role);
    setFormGender(user.gender);
    setFormTeacherCode(user.teacherCode || '');
    setFormPhone(user.phone || '');
    setFormAssignedRoom(user.assignedRoomName || '');
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formUsername.trim() || !formName.trim()) {
      setFeedback({ type: 'error', message: 'Username dan Nama wajib diisi!' });
      return;
    }

    const newUserObj: UserAccount = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      username: formUsername.trim(),
      name: formName.trim(),
      password: formPassword.trim() || '12345',
      role: formRole,
      gender: formGender,
      teacherCode: formTeacherCode.trim() || formUsername.trim(),
      phone: formPhone.trim(),
      assignedRoomName: formAssignedRoom || undefined,
      isActive: editingUser ? editingUser.isActive : true,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    storageService.saveUser(newUserObj);
    storageService.addActivityLog(
      'user',
      editingUser ? 'Update Akun User' : 'Tambah Akun User',
      `Akun user ${newUserObj.name} (${newUserObj.username}) dengan role ${newUserObj.role} berhasil ${editingUser ? 'diperbarui' : 'dibuat'}.`,
      currentUser.name
    );

    setFeedback({
      type: 'success',
      message: `Akun ${newUserObj.name} (${newUserObj.username}) berhasil disimpan!`,
    });
    setIsModalOpen(false);
    onRefresh();
  };

  const handleDeleteUser = (user: UserAccount) => {
    if (user.id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri saat sedang login.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus akun user "${user.name}" (${user.username})?`)) {
      storageService.deleteUser(user.id);
      storageService.addActivityLog(
        'user',
        'Hapus Akun User',
        `Akun user ${user.name} (${user.username}) telah dihapus dari sistem.`,
        currentUser.name
      );
      setFeedback({ type: 'success', message: `Akun ${user.name} berhasil dihapus.` });
      onRefresh();
    }
  };

  // Sync / Auto Generate accounts from Teacher list
  const handleSyncFromTeachers = () => {
    let createdCount = 0;
    teachers.forEach((t) => {
      const code = t.teacherCode || (t.nip ? `GR-${t.nip.slice(-3)}` : `GR-${t.id.slice(-3)}`);
      const existing = users.find((u) => u.username.toUpperCase() === code.toUpperCase() || (u.teacherCode && u.teacherCode.toUpperCase() === code.toUpperCase()));
      if (!existing) {
        createdCount++;
        const newU: UserAccount = {
          id: `usr-${t.id}`,
          username: code,
          name: t.name,
          password: '12345',
          role: t.role === 'Pengasuhan' ? 'ADMIN' : (t.role === 'Wali Kamar' ? 'MUSYRIF' : 'GURU'),
          gender: t.gender,
          teacherCode: code,
          nip: t.nip,
          phone: t.phone,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        storageService.saveUser(newU);
      }
    });

    storageService.addActivityLog(
      'user',
      'Generate Akun Guru',
      `Sinkronisasi akun otomatis membuat ${createdCount} akun baru dari data Dewan Asatidz.`,
      currentUser.name
    );

    setFeedback({
      type: 'success',
      message: `Sinkronisasi selesai! Berhasil membuat ${createdCount} akun baru dengan password default: 12345.`,
    });
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Kelola User & Akun Guru
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola hak akses pengguna sistem (ADMIN, MUSYRIF, GURU, PIKET) dan reset password.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncFromTeachers}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Otomatis buat akun untuk semua guru yang ada di database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate Akun dari Data Guru</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah User Baru</span>
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
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari username, kode guru, atau nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Role ({users.length})</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MUSYRIF">MUSYRIF</option>
              <option value="GURU">GURU</option>
              <option value="PIKET">PIKET</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-bold">No</th>
                <th className="py-3 px-4 font-bold">Kode / Username</th>
                <th className="py-3 px-4 font-bold">Nama Pengguna</th>
                <th className="py-3 px-4 font-bold">Role Akses</th>
                <th className="py-3 px-4 font-bold">Kamar Binaan</th>
                <th className="py-3 px-4 font-bold">Password</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data pengguna.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr, idx) => (
                  <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {usr.username}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{usr.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {usr.gender === 'L' ? 'Laki-laki' : 'Perempuan'} {usr.phone ? `• ${usr.phone}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          usr.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : usr.role === 'MUSYRIF'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : usr.role === 'PIKET'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {usr.assignedRoomName ? (
                        <span className="text-amber-800 font-medium">{usr.assignedRoomName}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      •••••••• <span className="text-[10px] text-slate-400">({usr.password || '12345'})</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(usr)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Edit User & Password"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(usr)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit Akun User' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username / Kode Guru <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Contoh: GR146 / admin"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Akun <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Default: 12345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Guru / Pegawai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Ust. Ahmad Fauzan, M.Pd.I"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role Hak Akses
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ADMIN">ADMIN (Akses Penuh)</option>
                    <option value="MUSYRIF">MUSYRIF (Wali Kamar)</option>
                    <option value="GURU">GURU (Pengajar)</option>
                    <option value="PIKET">PIKET (Petugas Scanner)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kamar Binaan (Khusus Wali Kamar / Musyrif)
                </label>
                <select
                  value={formAssignedRoom}
                  onChange={(e) => setFormAssignedRoom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Tidak Ada / Bukan Wali Kamar --</option>
                  {rooms.map((rm) => (
                    <option key={rm.id} value={rm.roomNumber}>
                      {rm.roomNumber} ({rm.building})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
