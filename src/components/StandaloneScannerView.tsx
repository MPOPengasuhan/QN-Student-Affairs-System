import React, { useState, useEffect, useRef } from 'react';
import { Student, Room, SchoolSettings, AttendanceRecord, ScanResult, UserAccount, RoomAttendanceSession } from '../types';
import { storageService } from '../services/storageService';
import { soundService } from '../services/soundService';
import {
  ArrowLeft,
  QrCode,
  Camera,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Users,
  Search,
  Keyboard,
  RefreshCw,
  Sun,
  Moon,
  Home,
  Shield,
  Lock,
  Building,
} from 'lucide-react';
import { getTodayDateStr } from '../data/mockData';

interface StandaloneScannerViewProps {
  students?: Student[];
  rooms?: Room[];
  settings: SchoolSettings;
  currentUser?: UserAccount | null;
  onBack: () => void;
  onAttendanceUpdated?: () => void;
}

export const StandaloneScannerView: React.FC<StandaloneScannerViewProps> = ({
  students = [],
  rooms = [],
  settings,
  currentUser,
  onBack,
  onAttendanceUpdated,
}) => {
  const user = currentUser || storageService.getCurrentUser();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'PEMBINA';
  const isWaliKamar = user?.role === 'WALI_KAMAR' || user?.role === 'MUSYRIF';
  const assignedRoom = (user?.assignedRoomName || '').trim();
  const hasAssignedRoom = Boolean(
    assignedRoom &&
    assignedRoom !== '-' &&
    assignedRoom.toLowerCase() !== 'belum ada kamar' &&
    assignedRoom.toLowerCase() !== 'tanpa kamar'
  );

  // Scanner session: Strictly HARIAN_KAMAR or SEBELUM_TIDUR
  const [sessionType, setSessionType] = useState<RoomAttendanceSession>('HARIAN_KAMAR');
  const [selectedTargetRoom, setSelectedTargetRoom] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(settings.soundEnabled ?? true);
  const [manualInput, setManualInput] = useState<string>('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = getTodayDateStr();
  const allRecords = storageService.getAttendanceRecords();
  const todayRecords = allRecords.filter(
    (r) => r.date === today && (r.sessionType === sessionType || (!r.sessionType && sessionType === 'HARIAN_KAMAR'))
  );

  // Initialize camera stream
  useEffect(() => {
    let mounted = true;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Kamera tidak didukung pada browser ini.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (mounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraActive(true);
        }
      } catch (err: any) {
        if (mounted) {
          setCameraError('Akses kamera tidak diizinkan atau kamera sedang digunakan.');
          setCameraActive(false);
        }
      }
    }

    if (isAdmin || (isWaliKamar && hasAssignedRoom)) {
      initCamera();
    }

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isAdmin, isWaliKamar, hasAssignedRoom]);

  // Process raw code scanned or entered
  const handleProcessCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const targetRoom = isWaliKamar ? assignedRoom : selectedTargetRoom;
    const result = storageService.processScan(code, sessionType, targetRoom, user);
    setLastResult(result);

    if (soundEnabled) {
      if (result.success && !result.isAlreadyRecorded) {
        soundService.playSuccess();
      } else if (result.isAlreadyRecorded) {
        soundService.playWarning();
      } else {
        soundService.playError();
      }
    }

    if (onAttendanceUpdated) {
      onAttendanceUpdated();
    }
    setManualInput('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleProcessCode(manualInput.trim());
    }
  };

  // Quick stats
  const presentCount = todayRecords.filter((r) => r.status === 'hadir').length;
  const lateCount = todayRecords.filter((r) => r.status === 'terlambat').length;
  const totalScanned = presentCount + lateCount;

  // Access control check 1: Only Wali Kamar and Admin can use this scanner
  if (!isAdmin && !isWaliKamar) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Akses Scanner Ditolak</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Hanya <strong>Wali Kamar</strong> dan <strong>Admin Pengasuhan</strong> yang berwenang melakukan scan presensi QR.
          </p>
          <div className="p-3.5 bg-slate-950 rounded-xl text-xs text-slate-400 border border-slate-800">
            Akun saat ini: <strong>{user?.name || 'Tamu'}</strong> ({user?.role || 'Tanpa Peran'})
          </div>
          <button
            type="button"
            onClick={onBack}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer text-sm"
          >
            Kembali ke Portal
          </button>
        </div>
      </div>
    );
  }

  // Access control check 2: Wali Kamar must have an assigned room
  if (isWaliKamar && !hasAssignedRoom) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Akun Belum Terhubung Kamar</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Anda login sebagai <strong>Wali Kamar</strong> ({user?.name}), namun belum terhubung ke kamar asrama.
            Presensi QR hanya bisa dilakukan oleh wali kamar yang terhubung ke kamar dan hanya bisa mempresensi anggota kamarnya sendiri.
          </p>
          <p className="text-xs text-amber-400 font-medium">
            Silakan lengkapi "Form Pendataan Kamar" terlebih dahulu untuk menghubungkan akun Anda ke kamar.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer text-sm"
          >
            Kembali ke Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Standalone Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke Portal</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              <span>Scanner Presensi QR Kamar</span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isWaliKamar ? (
                <span className="text-emerald-400 font-bold">
                  📍 Kamar Anda: {assignedRoom} • Khusus Anggota Kamar Ini
                </span>
              ) : (
                <span>Mode Admin • Pengawasan Presensi Kamar Asrama</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Admin Room Filter Dropdown */}
          {isAdmin && (
            <div className="flex items-center bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
              <Building className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <select
                value={selectedTargetRoom}
                onChange={(e) => setSelectedTargetRoom(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-white">Semua Kamar Asrama</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.roomNumber} className="bg-slate-900 text-white">
                    Kamar {r.roomNumber} ({r.location})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sesi Switcher: HARIAN_KAMAR vs SEBELUM_TIDUR */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSessionType('HARIAN_KAMAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                sessionType === 'HARIAN_KAMAR'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Presensi Harian</span>
            </button>
            <button
              type="button"
              onClick={() => setSessionType('SEBELUM_TIDUR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                sessionType === 'SEBELUM_TIDUR'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Sebelum Tidur</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Suara Aktif' : 'Suara Dimatikan'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Wali Kamar Room Assignment Banner */}
      {isWaliKamar && (
        <div className="bg-emerald-950/40 border-b border-emerald-900/60 px-4 sm:px-6 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <Home className="w-4 h-4 text-emerald-400" />
            <span>
              Wali Kamar: <strong>{user?.name}</strong> • Terhubung ke: <strong>Kamar {assignedRoom}</strong>
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/80 hidden sm:inline">
            Scanner hanya menerima presensi santri dari Kamar {assignedRoom}
          </span>
        </div>
      )}

      {/* Main Scanner Workspace Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera View & Manual Barcode Input (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Camera Frame */}
          <div className="relative flex-1 min-h-[360px] sm:min-h-[420px] bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-2xl">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
              </div>
            )}

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-64 h-64 sm:w-80 sm:h-80 border-2 border-emerald-400/80 rounded-3xl relative shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                {/* Laser scan line animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Floating Top Badge */}
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                KAMERA AKTIF ({sessionType === 'HARIAN_KAMAR' ? 'PRESENSI HARIAN KAMAR' : 'PRESENSI SEBELUM TIDUR'})
              </span>
            </div>
          </div>

          {/* Manual Input / Barcode Scanner Device Field */}
          <form onSubmit={handleManualSubmit} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Scan Barcode / Ketik NIP Pondok, No. Kartu, atau QR Code..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Scan
            </button>
          </form>
        </div>

        {/* Right Column: Scan Result Card & Recent Records Feed (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Active Result Card */}
          {lastResult ? (
            <div
              className={`p-5 rounded-3xl border shadow-xl animate-in zoom-in-95 ${
                lastResult.success && !lastResult.isAlreadyRecorded
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-100'
                  : lastResult.isAlreadyRecorded
                  ? 'bg-amber-950/70 border-amber-700 text-amber-100'
                  : 'bg-rose-950/70 border-rose-700 text-rose-100'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {lastResult.success && !lastResult.isAlreadyRecorded ? (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : lastResult.isAlreadyRecorded ? (
                  <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    {lastResult.success && !lastResult.isAlreadyRecorded
                      ? 'PRESENSI BERHASIL'
                      : lastResult.isAlreadyRecorded
                      ? 'SUDAH TERCATAT HARI INI'
                      : 'PRESENSI DITOLAK'}
                  </p>
                  <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5 break-words">
                    {lastResult.student ? lastResult.student.name : lastResult.message}
                  </h3>
                  {lastResult.student && (
                    <p className="text-xs opacity-90 mt-1 font-medium">
                      Kamar: <strong className="text-white">{lastResult.student.roomName || '-'}</strong> • Kelas: {lastResult.student.className} • NIP: {lastResult.student.nis}
                    </p>
                  )}
                  {lastResult.record && (
                    <p className="text-[11px] font-mono opacity-80 mt-1">
                      Waktu: {lastResult.record.timeIn} • Sesi: {lastResult.record.sessionType === 'HARIAN_KAMAR' ? 'Harian Kamar' : 'Sebelum Tidur'} • Status: {lastResult.record.status.toUpperCase()}
                    </p>
                  )}
                  {!lastResult.success && (
                    <p className="text-xs text-rose-200 mt-2 bg-rose-900/50 p-2.5 rounded-xl border border-rose-800">
                      {lastResult.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
              Arahkan kamera ke QR Code santri atau masukkan kode manual untuk mulai mencatat presensi {sessionType === 'HARIAN_KAMAR' ? 'Harian' : 'Sebelum Tidur'}.
            </div>
          )}

          {/* Quick Counter Ticker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Hadir Sesi Ini</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{totalScanned}</p>
              <p className="text-[11px] text-slate-500">Santri Terdata</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Terlambat</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{lateCount}</p>
              <p className="text-[11px] text-slate-500">Lewat Jam Batas</p>
            </div>
          </div>

          {/* Recent Records List */}
          <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-4 flex flex-col min-h-[220px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Riwayat Presensi ({todayRecords.length})</span>
              <span className="font-mono text-[10px] text-slate-500">
                {sessionType === 'HARIAN_KAMAR' ? 'Harian Kamar' : 'Sebelum Tidur'} • {today}
              </span>
            </h4>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60 max-h-[280px]">
              {todayRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Belum ada presensi yang tercatat untuk sesi ini hari ini.
                </div>
              ) : (
                todayRecords.slice(0, 15).map((rec) => (
                  <div key={rec.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{rec.studentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Kamar {rec.roomName || '-'} • NIP: {rec.studentNis}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'hadir'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {rec.timeIn}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
