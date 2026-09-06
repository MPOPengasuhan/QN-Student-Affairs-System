import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { Student, AttendanceRecord, SchoolSettings, ScanResult, Room, UserAccount, RoomAttendanceSession } from '../types';
import { storageService } from '../services/storageService';
import { soundService } from '../services/soundService';
import {
  Camera,
  CameraOff,
  Upload,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  Clock,
  User,
  Volume2,
  VolumeX,
  RefreshCw,
  LogOut,
  LogIn,
  Layers,
  HelpCircle,
  ShieldAlert,
  Keyboard,
  Check,
  ChevronRight,
  Sun,
  Moon,
  Home,
  Lock,
  Building,
} from 'lucide-react';

interface QRScannerViewProps {
  students: Student[];
  rooms?: Room[];
  settings: SchoolSettings;
  currentUser?: UserAccount | null;
  onAttendanceUpdated: () => void;
  recentRecords: AttendanceRecord[];
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  students,
  rooms = [],
  settings,
  currentUser,
  onAttendanceUpdated,
  recentRecords,
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

  const [sessionType, setSessionType] = useState<RoomAttendanceSession>('HARIAN_KAMAR');
  const [selectedTargetRoom, setSelectedTargetRoom] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [cameraPermissionState, setCameraPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [cameraError, setCameraError] = useState<{
    type: 'permission_denied' | 'not_found' | 'in_use' | 'other';
    message: string;
  } | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(settings.soundEnabled ?? true);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const scanCooldownRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // USB Barcode Scanner hardware buffer
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#10b981', '#f59e0b', '#3b82f6'],
      });
    } catch {
      // ignore
    }
  }, []);

  const processCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      setIsProcessing(true);
      const targetRoom = isWaliKamar ? assignedRoom : selectedTargetRoom;
      const result = storageService.processScan(code, sessionType, targetRoom, user);
      setLastResult(result);

      if (result.success) {
        if (audioEnabled) {
          if (result.record?.status === 'terlambat') {
            soundService.playWarning();
          } else {
            soundService.playSuccess();
          }
        }
        triggerConfetti();
        onAttendanceUpdated();
      } else {
        if (audioEnabled) {
          if (result.isAlreadyRecorded) {
            soundService.playWarning();
          } else {
            soundService.playError();
          }
        }
      }

      setIsProcessing(false);
    },
    [audioEnabled, onAttendanceUpdated, sessionType, isWaliKamar, assignedRoom, selectedTargetRoom, user, triggerConfetti]
  );

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (scanCooldownRef.current || isProcessing) return;

      // Cooldown 2.5s for identical code to prevent double-firing
      if (lastScannedCodeRef.current === decodedText) {
        return;
      }

      lastScannedCodeRef.current = decodedText;
      scanCooldownRef.current = true;
      setTimeout(() => {
        scanCooldownRef.current = false;
        lastScannedCodeRef.current = '';
      }, 2500);

      processCode(decodedText);
    },
    [isProcessing, processCode]
  );

  // Stop camera helper
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // Silently clear if already stopped
      } finally {
        scannerRef.current = null;
      }
    }
    if (isMountedRef.current) {
      setIsScanning(false);
      setIsStartingCamera(false);
    }
  };

  // Start camera helper with robust error triage
  const startCamera = async (deviceId?: string, isUserInitiated: boolean = false) => {
    if (isStartingCamera) return;
    setIsStartingCamera(true);
    setCameraError(null);

    // Stop previous instance if running
    if (scannerRef.current) {
      await stopCamera();
    }

    // Check if navigator.mediaDevices exists
    if (!navigator?.mediaDevices?.getUserMedia) {
      if (isMountedRef.current) {
        setCameraError({
          type: 'not_found',
          message: 'Browser ini tidak mendukung akses kamera secara langsung (WebRTC). Silakan gunakan opsi Upload QR atau Input Manual NIS.',
        });
        setIsStartingCamera(false);
      }
      return;
    }

    try {
      // Ensure DOM element is present
      const readerElem = document.getElementById('qr-reader');
      if (!readerElem) {
        throw new Error('Elemen pemindai kamera tidak ditemukan.');
      }

      // If user-initiated click, trigger getUserMedia directly to provoke browser permission prompt on user gesture
      if (isUserInitiated) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
          });
          // Release test stream
          stream.getTracks().forEach((track) => track.stop());
          setCameraPermissionState('granted');
        } catch (permErr: any) {
          const pName = permErr?.name || '';
          if (pName === 'NotAllowedError' || pName === 'PermissionDeniedError') {
            setCameraPermissionState('denied');
            setCameraError({
              type: 'permission_denied',
              message: 'Izin kamera ditolak oleh browser. Silakan klik ikon gembok di sebelah alamat web browser Anda, lalu ubah izin Kamera menjadi "Izinkan".',
            });
            setIsStartingCamera(false);
            return;
          }
        }
      }

      const html5QrCode = new Html5Qrcode('qr-reader', {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = html5QrCode;

      // Determine camera config: try specific device ID if available, otherwise environment facing mode
      const camConfig = deviceId || selectedCamera || { facingMode: 'environment' };

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(Math.floor(minDim * 0.7), 200);
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        camConfig,
        qrConfig,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // scanning frame - searching for QR
        }
      );

      if (isMountedRef.current) {
        setIsScanning(true);
        setIsStartingCamera(false);
        setCameraPermissionState('granted');
        setCameraError(null);

        // Fetch cameras list if not already populated
        Html5Qrcode.getCameras()
          .then((devices) => {
            if (isMountedRef.current && devices && devices.length > 0) {
              setAvailableCameras(
                devices.map((d, idx) => ({
                  id: d.id,
                  label: d.label || `Kamera ${idx + 1}`,
                }))
              );
              if (!selectedCamera && devices[0]) {
                setSelectedCamera(devices[0].id);
              }
            }
          })
          .catch(() => {
            // ignore
          });
      }
    } catch (err: any) {
      const errName = err?.name || '';
      const errMsg = err instanceof Error ? err.message : String(err);

      // If OverconstrainedError (e.g. no back camera on laptop), try fallback to generic user camera
      if (errName === 'OverconstrainedError' || errMsg.includes('OverconstrainedError')) {
        try {
          if (scannerRef.current && isMountedRef.current) {
            await scannerRef.current.start(
              { facingMode: 'user' },
              { fps: 15, qrbox: { width: 220, height: 220 } },
              (decodedText) => handleScanSuccess(decodedText),
              () => {}
            );
            if (isMountedRef.current) {
              setIsScanning(true);
              setIsStartingCamera(false);
              setCameraError(null);
              return;
            }
          }
        } catch {
          // continue to error categorization
        }
      }

      if (isMountedRef.current) {
        setIsScanning(false);
        setIsStartingCamera(false);

        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errMsg.includes('Permission') ||
          errMsg.includes('NotAllowedError')
        ) {
          setCameraPermissionState('denied');
          setCameraError({
            type: 'permission_denied',
            message: 'Izin akses kamera belum diaktifkan di browser. Silakan klik tombol "Minta Izin & Aktifkan Kamera" di bawah atau gunakan alternatif Upload Foto QR / Input Manual.',
          });
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errMsg.includes('NotFound')) {
          setCameraError({
            type: 'not_found',
            message: 'Perangkat kamera/webcam tidak terdeteksi pada komputer atau perangkat ini.',
          });
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError' || errMsg.includes('NotReadable')) {
          setCameraError({
            type: 'in_use',
            message: 'Kamera sedang digunakan oleh aplikasi lain (seperti Zoom/Meet). Tutup aplikasi tersebut lalu coba lagi.',
          });
        } else {
          setCameraError({
            type: 'other',
            message: `Kamera belum dapat dibuka (${errMsg || 'Perlu interaksi pengguna'}). Silakan klik tombol di bawah untuk membuka kamera.`,
          });
        }
      }
    }
  };

  // Check camera permission on mount & try gentle start
  useEffect(() => {
    isMountedRef.current = true;

    // Check navigator permissions API if supported
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((permissionStatus) => {
          if (isMountedRef.current) {
            setCameraPermissionState(permissionStatus.state as any);
            permissionStatus.onchange = () => {
              if (isMountedRef.current) {
                setCameraPermissionState(permissionStatus.state as any);
                if (permissionStatus.state === 'granted' && !isScanning) {
                  startCamera();
                }
              }
            };
          }
        })
        .catch(() => {
          // Permissions API might not support 'camera' on all browsers
        });
    }

    // Auto-attempt camera start with a small delay
    const timer = setTimeout(() => {
      startCamera();
    }, 250);

    // Global listener for USB / Bluetooth Barcode Hardware Scanner
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Barcode scanners send keys with very rapid interval (< 50ms)
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const scannedCode = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          processCode(scannedCode);
        } else {
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        // Reset buffer if delay between keystrokes is too long (human typing)
        if (timeDiff > 200) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      stopCamera();
    };
  }, [processCode]);

  const handleCameraChange = async (newCamId: string) => {
    setSelectedCamera(newCamId);
    await startCamera(newCamId, true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-temp');
      const result = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      processCode(result);
    } catch (err) {
      setLastResult({
        success: false,
        message: 'Kode QR pada foto/gambar tidak terbaca. Pastikan foto QR cukup jelas dan tidak buram.',
      });
      if (audioEnabled) soundService.playError();
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      processCode(manualInput.trim());
      setManualInput('');
    }
  };

  // Access control check: Only Wali Kamar and Admin can use this scanner
  if (!isAdmin && !isWaliKamar) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800">Akses Scanner Ditolak</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          HANYA <strong>Wali Kamar</strong> dan <strong>Admin Pengasuhan</strong> yang bisa melakukan scan presensi QR.
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
          Anda terdaftar sebagai <strong>Wali Kamar</strong> ({user?.name}), namun belum terhubung ke kamar asrama.
          Scanner presensi QR hanya bisa dilakukan oleh wali kamar yang terhubung ke kamar dan hanya bisa presensi anggota kamarnya.
        </p>
        <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
          Silakan lengkapi Form Pendataan Kamar terlebih dahulu.
        </div>
      </div>
    );
  }

  return (
    <div id="qr-scanner-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Controls Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <span>Pemindai Presensi QR Kamar</span>
              {isWaliKamar && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Kamar {assignedRoom}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500">
              {isWaliKamar
                ? `Hanya santri anggota kamar ${assignedRoom} yang dapat dipresensi.`
                : 'Mode Admin: Memantau dan mempresensi santri antar kamar asrama.'}
            </p>
          </div>
        </div>

        {/* Scan Mode Toggle: HARIAN_KAMAR vs SEBELUM_TIDUR */}
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
              <Building className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <select
                value={selectedTargetRoom}
                onChange={(e) => setSelectedTargetRoom(e.target.value)}
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="">Semua Kamar Asrama</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>
                    Kamar {r.roomNumber} ({r.location})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              id="mode-harian-btn"
              onClick={() => setSessionType('HARIAN_KAMAR')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sessionType === 'HARIAN_KAMAR'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Harian Kamar</span>
            </button>
            <button
              id="mode-sebelum-tidur-btn"
              onClick={() => setSessionType('SEBELUM_TIDUR')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sessionType === 'SEBELUM_TIDUR'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Sebelum Tidur</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-2xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              audioEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={audioEnabled ? 'Efek Suara Aktif' : 'Efek Suara Dimatikan'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Scanner Box + Live Verification Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera / Alternative Scanner Views */}
        <div className="lg:col-span-7 space-y-4">
          {/* Method Selector Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                setActiveTab('camera');
                if (!isScanning) startCamera(undefined, true);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kamera Langsung</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Upload Gambar QR</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('manual');
                stopCamera();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Input Manual / USB Gun</span>
            </button>
          </div>

          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="bg-slate-900 rounded-3xl overflow-hidden border-4 border-white shadow-xl text-white relative">
              {/* Camera Header Status Bar */}
              <div className="bg-slate-950/90 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isScanning ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isScanning ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    ></span>
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {isScanning ? 'Kamera Sedang Aktif' : 'Kamera Siaga'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {availableCameras.length > 1 && (
                    <select
                      value={selectedCamera}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 border border-slate-700 focus:outline-none cursor-pointer"
                    >
                      {availableCameras.map((cam) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Bantuan Izin Kamera"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Video Viewport Area */}
              <div className="relative min-h-[360px] sm:min-h-[400px] bg-slate-950 flex flex-col items-center justify-center p-4">
                {/* HTML5-QRCode Target Element */}
                <div
                  id="qr-reader"
                  className="w-full max-w-md mx-auto rounded-2xl overflow-hidden"
                ></div>
                <div id="qr-reader-temp" className="hidden"></div>

                {/* Camera Starting / Loading State */}
                {isStartingCamera && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-white">Menghubungkan Kamera...</p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Sedang memuat stream video webcam perangkat Anda.
                    </p>
                  </div>
                )}

                {/* Idle / Off / Permission Blocked State */}
                {!isScanning && !isStartingCamera && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Kamera Belum Aktif</h2>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {cameraPermissionState === 'denied'
                          ? 'Izin kamera belum diberikan pada browser. Klik tombol di bawah untuk meminta izin ulang.'
                          : 'Klik tombol di bawah untuk mengaktifkan kamera laptop / HP Anda dan mulai memindai QR santri.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        id="start-camera-btn"
                        onClick={() => startCamera(undefined, true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Minta Izin & Aktifkan Kamera</span>
                      </button>

                      <button
                        onClick={() => setShowPermissionGuide(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>Panduan Izin Browser</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Laser Line Scanning Guide when active */}
                {isScanning && (
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center z-10">
                    <div className="w-64 h-64 border-2 border-dashed border-emerald-400/90 rounded-3xl relative shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce"></div>
                      <span className="absolute -bottom-8 inset-x-0 text-center text-[10px] font-mono font-bold text-emerald-300 bg-slate-900/90 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
                        Arahkan Kode QR Santri ke Sini
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Action Footer */}
              <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isScanning ? (
                    <button
                      id="stop-camera-btn"
                      onClick={stopCamera}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold cursor-pointer"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Matikan Kamera</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => startCamera(undefined, true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Buka Kamera</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  Sesi: <strong className="text-white uppercase">{sessionType === 'HARIAN_KAMAR' ? 'Harian Kamar' : 'Sebelum Tidur'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Upload Foto Gambar QR Code */}
          {activeTab === 'upload' && (
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Foto atau Tangkapan Layar QR</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Pilih file gambar kartu santri (.jpg, .png) dari galeri atau penyimpanan perangkat Anda untuk diverifikasi secara instan.
                </p>
              </div>

              <div className="pt-2">
                <label
                  htmlFor="qr-file-input"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Pilih Gambar QR dari Perangkat</span>
                </label>
                <input
                  id="qr-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Manual Input & USB Scanner Gun */}
          {activeTab === 'manual' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Input Manual NIS & Scanner USB/Bluetooth</h3>
                  <p className="text-xs text-slate-500">
                    Ketik NIS siswa langsung, atau tembakkan alat scanner barcode fisik (USB Gun) ke kartu santri.
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2">
                <input
                  id="manual-nis-input"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Ketik NIS Santri (contoh: 20241001)..."
                  className="flex-1 px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  autoFocus
                />
                <button
                  id="manual-nis-submit-btn"
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  Proses Presensi
                </button>
              </form>
            </div>
          )}

          {/* Camera Error / Permission Notice */}
          {cameraError && activeTab === 'camera' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">Pemberitahuan Akses Kamera</p>
                <p className="text-amber-800 leading-relaxed">{cameraError.message}</p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => startCamera(undefined, true)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    Coba Hubungkan Ulang
                  </button>
                  <button
                    onClick={() => setShowPermissionGuide(true)}
                    className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    Lihat Cara Mengizinkan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Browser Permission Guide Modal / Banner */}
          {showPermissionGuide && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Cara Mengaktifkan Izin Kamera di Browser</span>
                </h4>
                <button
                  onClick={() => setShowPermissionGuide(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="p-3.5 bg-slate-800/80 rounded-2xl space-y-1.5">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 inline-flex items-center justify-center text-[10px]">1</span>
                    <span>Google Chrome / Edge (Laptop & HP):</span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Klik ikon <strong>gembok / pengaturan situs</strong> di sebelah kiri URL address bar &gt; Ubah opsi <strong>Kamera</strong> menjadi <strong>Izinkan (Allow)</strong> &gt; Refresh halaman.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/80 rounded-2xl space-y-1.5">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 inline-flex items-center justify-center text-[10px]">2</span>
                    <span>Safari (iPhone / iPad / Mac):</span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Klik ikon <strong>aA</strong> di bilah alamat &gt; <strong>Pengaturan Situs Web (Website Settings)</strong> &gt; Pilih <strong>Kamera: Izinkan</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 1-Click Fast Test Buttons */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Simulasi Presensi Cepat 1-Klik
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                Klik santri untuk uji coba scan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {students.slice(0, 8).map((st) => (
                <button
                  key={st.id}
                  id={`quick-scan-${st.nis}`}
                  onClick={() => processCode(st.nis)}
                  className="flex flex-col text-left p-3 bg-white hover:bg-emerald-50/70 hover:border-emerald-200 border border-slate-200 rounded-2xl transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-700">{st.nis}</span>
                    <span className="text-[9px] font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                      {st.className}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate mt-1 group-hover:text-emerald-950">
                    {st.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Result Verification Card & Recent Scans */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Result Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Hasil Verifikasi Presensi
              </h2>
              {lastResult && (
                <span
                  className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    lastResult.success
                      ? lastResult.record?.status === 'terlambat'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                      : lastResult.isAlreadyRecorded
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {lastResult.success
                    ? lastResult.type === 'checkout'
                      ? 'PULANG SUKSES'
                      : lastResult.record?.status?.toUpperCase()
                    : lastResult.isAlreadyRecorded
                    ? 'SUDAH TERCATAT'
                    : 'GAGAL'}
                </span>
              )}
            </div>

            {lastResult ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {lastResult.student ? (
                  <div className="space-y-4">
                    {/* Student Info Card */}
                    <div className="flex items-center gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <img
                        src={
                          lastResult.student.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(lastResult.student.name)}&background=10b981&color=fff`
                        }
                        alt={lastResult.student.name}
                        className="w-13 h-13 rounded-2xl object-cover ring-1 ring-slate-200 shadow-xs shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">
                          {lastResult.student.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                          <span className="font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px]">
                            NIS: {lastResult.student.nis}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-emerald-700">{lastResult.student.className}</span>
                        </div>
                        {lastResult.student.roomName && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Kamar: {lastResult.student.roomName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Attendance Details Grid */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Waktu Masuk</span>
                        <span className="font-mono font-extrabold text-slate-800 text-lg">
                          {lastResult.record?.timeIn || '-'}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Waktu Pulang</span>
                        <span className="font-mono font-extrabold text-slate-800 text-lg">
                          {lastResult.record?.timeOut || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Notification message */}
                    <div
                      className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 ${
                        lastResult.success
                          ? lastResult.record?.status === 'terlambat'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : lastResult.isAlreadyRecorded
                          ? 'bg-sky-50 text-sky-900 border border-sky-200'
                          : 'bg-rose-50 text-rose-900 border border-rose-200'
                      }`}
                    >
                      {lastResult.success ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : lastResult.isAlreadyRecorded ? (
                        <AlertTriangle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <p className="leading-relaxed">{lastResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Scan Gagal</p>
                      <p className="mt-0.5 text-rose-800 leading-relaxed">{lastResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <User className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-slate-700">Belum Ada Scan Presensi</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Data santri dan konfirmasi kehadiran akan langsung tampil di sini secara real-time.
                </p>
              </div>
            )}
          </div>

          {/* Recent Live Scans */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Aktivitas Presensi Terkini
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                {recentRecords.length} Data Hari Ini
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {recentRecords.length > 0 ? (
                recentRecords.slice(0, 6).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-emerald-50/40 transition-colors text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[170px]">
                          {rec.studentName}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {rec.className}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                        <span>NIS: {rec.studentNis}</span>
                        {rec.roomName && <span>• {rec.roomName}</span>}
                        {rec.timeOut && <span>• Pulang: {rec.timeOut}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block uppercase ${
                          rec.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'terlambat'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.status === 'sakit'
                            ? 'bg-sky-100 text-sky-800'
                            : rec.status === 'izin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                      <span className="block text-[10px] font-mono font-bold text-slate-600 mt-0.5">
                        {rec.timeIn}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Belum ada santri yang melakukan presensi hari ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
