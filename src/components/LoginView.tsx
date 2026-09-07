import React, { useState } from 'react';
import { Teacher, SchoolSettings, UserAccount } from '../types';
import {
  Lock,
  User,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  ShieldCheck,
} from 'lucide-react';
import { QOTRUN_NADA_LOGO_SVG } from '../data/mockData';

interface LoginViewProps {
  settings: SchoolSettings;
  teachers: Teacher[];
  onLogin: (username: string, password: string) => Promise<{ success: boolean; user?: UserAccount; message: string }> | { success: boolean; user?: UserAccount; message: string };
  onBackToLanding: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  teachers,
  onLogin,
  onBackToLanding,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTeacherCodeModal, setShowTeacherCodeModal] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Silakan masukkan Username atau Kode Guru.');
      return;
    }

    if (!password) {
      setErrorMsg('Silakan masukkan Password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await onLogin(username.trim(), password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMsg(result.message);
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Terjadi kesalahan saat memproses login ke database Supabase.');
    }
  };

  const filteredTeachers = React.useMemo(() => {
    // 1. Strict deduplication by normalized teacherCode, nip, and name
    const seen = new Set<string>();
    const uniqueList: Teacher[] = [];

    teachers.forEach((t) => {
      const codeKey = (t.teacherCode || t.nip || '').trim().toUpperCase();
      const nameKey = (t.name || '').trim().toLowerCase().replace(/^ust\.?\s*/i, '').replace(/^ustadz[a-z]*\.?\s*/i, '');

      // Create identifier for dedup
      const dedupId = codeKey ? `code:${codeKey}` : `name:${nameKey}`;
      if (seen.has(dedupId)) return;
      seen.add(dedupId);
      if (codeKey) seen.add(`code:${codeKey}`);
      if (nameKey) seen.add(`name:${nameKey}`);

      uniqueList.push(t);
    });

    // Sort by code or name
    uniqueList.sort((a, b) => {
      const codeA = (a.teacherCode || a.nip || '').toUpperCase();
      const codeB = (b.teacherCode || b.nip || '').toUpperCase();
      if (codeA && codeB) {
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // 2. Filter by search query
    const q = teacherSearchQuery.trim().toLowerCase();
    if (!q) return uniqueList;

    return uniqueList.filter((t) => {
      return (
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.teacherCode && t.teacherCode.toLowerCase().includes(q)) ||
        (t.nip && t.nip.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.role && t.role.toLowerCase().includes(q))
      );
    });
  }, [teachers, teacherSearchQuery]);

  const handleSelectTeacherCode = (code: string) => {
    setUsername(code);
    setPassword('');
    setShowTeacherCodeModal(false);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top Decoration Bar */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 w-full" />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-7 sm:p-9 relative">
          {/* Top Header Row with Back Button and Logo */}
          <div className="flex items-center justify-between mb-6">
            <button
              id="btn-back-to-landing"
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>

            {/* Small Pesantren Logo */}
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
              <img
                src={settings.logoUrl || QOTRUN_NADA_LOGO_SVG}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = QOTRUN_NADA_LOGO_SVG;
                }}
              />
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Masuk Akun
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Silakan login menggunakan Kode Guru / Username terdaftar.
            </p>
          </div>

          {/* Error Notification */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Username / Kode Guru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                *Akun default: <span className="font-bold text-slate-800">admin</span> / <span className="font-bold text-emerald-700">12345</span>
              </p>
            </div>

            {/* Main Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#064e3b] hover:bg-[#043d2e] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk Sekarang</span>
                </>
              )}
            </button>
          </form>

          {/* Secondary Action: Cek Kode Guru */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <button
              id="btn-check-teacher-code"
              type="button"
              onClick={() => setShowTeacherCodeModal(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>🔍 Cek Kode Guru</span>
            </button>
          </div>
        </div>
      </main>

      {/* Teacher Code Lookup Modal */}
      {showTeacherCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Daftar Kode Guru / Asatidz
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cari nama Anda untuk melihat Kode Guru & Username login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherCodeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input & Count */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama guru atau kode..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-1">
              <span>{teacherSearchQuery ? `Hasil pencarian: "${teacherSearchQuery}"` : 'Semua dewan guru / asatidz'}</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {filteredTeachers.length} Guru
              </span>
            </div>

            {/* Teacher List Table */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ditemukan guru dengan kata kunci tersebut.
                </div>
              ) : (
                filteredTeachers.map((tch) => {
                  const teacherCode = tch.teacherCode || (tch.nip ? `GR-${tch.nip.slice(-3)}` : 'GR-000');
                  return (
                    <div
                      key={tch.id}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-emerald-50/60 rounded-lg transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                          {tch.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {teacherCode}
                          </span>
                          <span>•</span>
                          <span>{tch.subject || tch.role}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTeacherCode(teacherCode)}
                        className="px-3 py-1.5 rounded-lg bg-[#064e3b] text-white text-xs font-bold shrink-0 hover:bg-[#043d2e] transition-colors"
                      >
                        Gunakan Kode
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 mt-3 text-right">
              <button
                type="button"
                onClick={() => setShowTeacherCodeModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white/50">
        <p className="font-medium">
          Berkhidmat Untuk Ummat – QN Student Affairs System &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
