import React, { useState } from 'react';
import { UserAccount } from '../types';
import { X, KeyRound, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

interface AccountSettingsModalProps {
  user: UserAccount;
  onClose: () => void;
  onUserUpdated: (user: UserAccount) => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  user,
  onClose,
  onUserUpdated,
}) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const updated: UserAccount = {
      ...user,
      name,
      phone,
    };

    storageService.saveUser(updated);
    storageService.setCurrentUser(updated);
    onUserUpdated(updated);
    setMsg({ type: 'success', text: 'Profil pengguna berhasil diperbarui!' });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!oldPassword) {
      setMsg({ type: 'error', text: 'Masukkan password lama saat ini.' });
      return;
    }

    if (newPassword.length < 4) {
      setMsg({ type: 'error', text: 'Password baru minimal 4 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    const res = storageService.changeUserPassword(user.id, oldPassword, newPassword);
    if (res.success) {
      setMsg({ type: 'success', text: 'Password berhasil diubah! Gunakan password baru untuk login berikutnya.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const updated = { ...user, password: newPassword };
      onUserUpdated(updated);
    } else {
      setMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2 text-slate-900">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold">Pengaturan Akun Pengguna</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* User Info Readonly Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Username / Kode Guru:</span>
              <span className="font-mono font-bold text-slate-800">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Role Hak Akses:</span>
              <span className="font-bold text-emerald-700">{user.role}</span>
            </div>
          </div>

          {/* Form Update Profile */}
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Simpan Profil
            </button>
          </form>

          {/* Form Change Password */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              Ganti Password Akun (Default: 12345)
            </h4>
            <form onSubmit={handleChangePassword} className="space-y-2.5">
              <input
                type="password"
                placeholder="Password Lama saat ini"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Password Baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Konfirmasi Password Baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Perbarui Password
              </button>
            </form>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 mt-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
