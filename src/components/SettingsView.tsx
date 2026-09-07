import React, { useState } from 'react';
import { SchoolSettings } from '../types';
import { storageService } from '../services/storageService';
import { soundService } from '../services/soundService';
import {
  Settings as SettingsIcon,
  School,
  Clock,
  Volume2,
  Database,
  RotateCcw,
  Save,
  Download,
  Upload,
  CheckCircle,
  Play,
  Calendar,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface SettingsViewProps {
  settings: SchoolSettings;
  initialTab?: 'pesantren' | 'presensi';
  onSettingsUpdated: () => void;
  onResetData: () => void;
}

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  initialTab = 'presensi',
  onSettingsUpdated,
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<'pesantren' | 'presensi'>(initialTab);
  const [formData, setFormData] = useState<SchoolSettings>(() => ({
    ...settings,
    harianKamarStart: settings.harianKamarStart || '05:00',
    harianKamarLimit: settings.harianKamarLimit || settings.timeInLimit || '06:30',
    harianToleranceMinutes: settings.harianToleranceMinutes ?? 15,
    tidurKamarStart: settings.tidurKamarStart || '21:00',
    tidurKamarLimit: settings.tidurKamarLimit || settings.timeLateLimit || '22:00',
    tidurToleranceMinutes: settings.tidurToleranceMinutes ?? 15,
    activeAttendanceDays: settings.activeAttendanceDays || ALL_DAYS,
    activeAttendanceSessions: settings.activeAttendanceSessions || ['HARIAN_KAMAR', 'SEBELUM_TIDUR'],
  }));

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showResetRoomModal, setShowResetRoomModal] = useState<boolean>(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSettings(formData);
    setSaveSuccess(true);
    onSettingsUpdated();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDayToggle = (day: string) => {
    const currentDays = formData.activeAttendanceDays || ALL_DAYS;
    let nextDays: string[];
    if (currentDays.includes(day)) {
      nextDays = currentDays.filter((d) => d !== day);
    } else {
      nextDays = [...currentDays, day];
    }
    setFormData({ ...formData, activeAttendanceDays: nextDays });
  };

  const handleSessionToggle = (session: 'HARIAN_KAMAR' | 'SEBELUM_TIDUR') => {
    const currentSessions = formData.activeAttendanceSessions || ['HARIAN_KAMAR', 'SEBELUM_TIDUR'];
    let nextSessions: ('HARIAN_KAMAR' | 'SEBELUM_TIDUR')[];
    if (currentSessions.includes(session)) {
      if (currentSessions.length === 1) return; // Must have at least 1 session
      nextSessions = currentSessions.filter((s) => s !== session);
    } else {
      nextSessions = [...currentSessions, session];
    }
    setFormData({ ...formData, activeAttendanceSessions: nextSessions });
  };

  const handleExportBackup = () => {
    const jsonStr = storageService.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Presensi_QR_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const ok = storageService.importBackupJSON(content);
      if (ok) {
        setImportStatus('Backup berhasil dipulihkan!');
        onSettingsUpdated();
      } else {
        setImportStatus('Gagal memulihkan file backup. Format tidak sesuai.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleConfirmResetRooms = () => {
    storageService.resetAllStudentRooms();
    setShowResetRoomModal(false);
    setResetFeedback('Seluruh kamar santri berhasil dikosongkan. Siap untuk pendataan ulang!');
    onSettingsUpdated();
    setTimeout(() => setResetFeedback(null), 5000);
  };

  return (
    <div id="settings-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header with Navigation Tabs */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-600" />
            Pengaturan Sistem & Operasional
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengaturan terpisah antara jadwal & jam presensi kamar dan profil umum pesantren.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('presensi')}
            className={`px-3.5 py-1.5 rounded-lg font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'presensi'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pengaturan Presensi & Jadwal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pesantren')}
            className={`px-3.5 py-1.5 rounded-lg font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pesantren'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School className="w-3.5 h-3.5 text-blue-600" />
            <span>Pengaturan Pesantren & Profil</span>
          </button>
        </div>
      </div>

      {resetFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resetFeedback}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================= TAB 1: PENGATURAN PRESENSI & JADWAL ================= */}
        {activeTab === 'presensi' && (
          <div className="space-y-6">
            {/* Sesi 1: Presensi Harian Kamar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-slate-900">
                      Sesi 1: Presensi Harian Kamar (Pagi / Sore)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Pengabsenan kehadiran rutin harian santri perkamar oleh Wali Kamar.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Harian Kamar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Mulai Presensi
                  </label>
                  <input
                    type="time"
                    value={formData.harianKamarStart || '05:00'}
                    onChange={(e) => setFormData({ ...formData, harianKamarStart: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Jam pembukaan gerbang presensi harian.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Batas Waktu Tepat Waktu (Hadir)
                  </label>
                  <input
                    type="time"
                    value={formData.harianKamarLimit || formData.timeInLimit || '06:30'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        harianKamarLimit: e.target.value,
                        timeInLimit: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Lewat dari jam ini otomatis dihitung Terlambat.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Toleransi Keterlambatan (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.harianToleranceMinutes ?? 15}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        harianToleranceMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Tambahan menit sebelum santri tercatat alpa/terlambat.
                  </span>
                </div>
              </div>
            </div>

            {/* Sesi 2: Presensi Sebelum Tidur Kamar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-slate-900">
                      Sesi 2: Presensi Sebelum Tidur Kamar (Malam)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Pengecekan santri di kamar asrama sebelum jam istirahat malam / curfew.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                  Malam Tidur
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Mulai Presensi Masuk Kamar
                  </label>
                  <input
                    type="time"
                    value={formData.tidurKamarStart || '21:00'}
                    onChange={(e) => setFormData({ ...formData, tidurKamarStart: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Santri mulai wajib berada di dalam kamar.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Batas Jam Wajib Tidur (Curfew)
                  </label>
                  <input
                    type="time"
                    value={formData.tidurKamarLimit || formData.timeLateLimit || '22:00'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tidurKamarLimit: e.target.value,
                        timeLateLimit: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Lampu kamar padam, santri belum scan dianggap terlambat.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Toleransi Keterlambatan Malam (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.tidurToleranceMinutes ?? 15}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tidurToleranceMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Toleransi kegiatan mengaji / halaqoh malam.
                  </span>
                </div>
              </div>
            </div>

            {/* Pengaturan Jadwal Pengabsenan & Hari Aktif */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Jadwal Pengabsenan & Hari Aktif
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Hari Aktif Pengabsenan Kamar:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {ALL_DAYS.map((day) => {
                      const isSelected = (formData.activeAttendanceDays || ALL_DAYS).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDayToggle(day)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Klik pada hari untuk mengaktifkan atau menonaktifkan presensi kamar pada hari tersebut.
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Sesi Pengabsenan yang Diaktifkan:
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.activeAttendanceSessions || []).includes('HARIAN_KAMAR')}
                        onChange={() => handleSessionToggle('HARIAN_KAMAR')}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Aktifkan Sesi Presensi Harian Kamar</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.activeAttendanceSessions || []).includes('SEBELUM_TIDUR')}
                        onChange={() => handleSessionToggle('SEBELUM_TIDUR')}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span>Aktifkan Sesi Presensi Sebelum Tidur Kamar</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Suara & Audio Scanner */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Pengaturan Audio & Suara Pemindai
                </h2>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Efek Suara Audio Scanner</h3>
                  <p className="text-[11px] text-slate-500">
                    Memutar nada notifikasi audio saat scan berhasil, terlambat, atau ditolak.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => soundService.playSuccess()}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-emerald-600" />
                    <span>Uji Suara</span>
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.soundEnabled ?? true}
                      onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PENGATURAN PESANTREN & PROFIL ================= */}
        {activeTab === 'pesantren' && (
          <div className="space-y-6">
            {/* Profil Pesantren & Kop Surat */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <School className="w-4 h-4 text-blue-600" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Identitas Pesantren & Kop Laporan Resmi
                </h2>
              </div>

              <div className="space-y-4 text-xs">
                {/* Logo Pondok Pesantren */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lambang / Logo Pondok Pesantren</label>
                  <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo Pesantren"
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <School className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-[240px] space-y-2">
                      <input
                        type="text"
                        value={formData.logoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="URL gambar logo (https://...)"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-400 block">
                        Logo resmi tampil pada kop surat laporan eksekutif dan lembar presensi.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Pondok Pesantren / Sekolah</label>
                    <input
                      type="text"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Pimpinan / Pengasuh Pondok</label>
                    <input
                      type="text"
                      value={formData.headmasterName || ''}
                      onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NIP / ID Pimpinan Pondok</label>
                    <input
                      type="text"
                      value={formData.headmasterNip || ''}
                      onChange={(e) => setFormData({ ...formData, headmasterNip: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Operator / Biro Pengasuhan</label>
                    <input
                      type="text"
                      value={formData.operatorName || ''}
                      onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran Aktif</label>
                    <input
                      type="text"
                      value={formData.academicYear || ''}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Semester</label>
                    <select
                      value={formData.semester || 'Ganjil'}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telepon / WhatsApp Kantor</label>
                    <input
                      type="text"
                      value={formData.schoolPhone || ''}
                      onChange={(e) => setFormData({ ...formData, schoolPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(021) 7788-9900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Email Resmi Pesantren</label>
                    <input
                      type="email"
                      value={formData.schoolEmail || ''}
                      onChange={(e) => setFormData({ ...formData, schoolEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sekretariat@qotrunnada.sch.id"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap Pesantren</label>
                    <input
                      type="text"
                      value={formData.schoolAddress || ''}
                      onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reset & Sinkronisasi Kamar Santri */}
            <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Riset Kamar Santri (Inisialisasi Data Baru)
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800">Kosongkan Seluruh Kamar Santri</h3>
                  <p className="text-[11px] text-slate-500 max-w-xl mt-0.5 leading-relaxed">
                    Gunakan tombol ini untuk mereset seluruh alokasi kamar santri menjadi kosong. Saat ini seharusnya belum ada santri yang memiliki kamar agar wali kamar dapat mengisi form pendataan kamar dari awal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetRoomModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Riset / Kosongkan Kamar</span>
                </button>
              </div>
            </div>

            {/* Backup & Pulihkan Database Cloud */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Database className="w-4 h-4 text-blue-600" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Cadangan & Pemulihan Database
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Unduh Cadangan Lengkap (.JSON)</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Simpan seluruh data santri, kamar, presensi, dan pengaturan ke komputer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Unduh Cadangan</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Pulihkan dari File (.JSON)</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Unggah file cadangan untuk memulihkan seluruh data sistem.
                    </p>
                  </div>
                  <label className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pilih File Cadangan</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {importStatus && (
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-xl font-medium border border-blue-200">
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                <CheckCircle className="w-4 h-4" />
                Pengaturan berhasil disimpan ke cloud database!
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Resetting All Rooms */}
      {showResetRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Kosongkan Seluruh Kamar Santri?</h3>
                <p className="text-xs text-slate-500">Aksi ini akan mereset seluruh alokasi kamar santri.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p>
                • Seluruh santri akan di-set menjadi <strong className="text-slate-800">belum memiliki kamar (-)</strong>.
              </p>
              <p>
                • Seluruh status kamar asrama akan di-set menjadi <strong className="text-slate-800">kosong (0 santri)</strong>.
              </p>
              <p>
                • Wali kamar dapat mulai melakukan pendataan baru melalui form kamar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetRoomModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetRooms}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Ya, Kosongkan Semua Kamar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
