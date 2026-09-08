export type AttendanceStatus = 'hadir' | 'terlambat' | 'sakit' | 'izin' | 'alpa';

export type Gender = 'L' | 'P';

export type RoomAttendanceSession = 'HARIAN_KAMAR' | 'SEBELUM_TIDUR';

export type UserRole = 'ADMIN' | 'MUSYRIF' | 'GURU' | 'WALI_KELAS' | 'WALI_KAMAR' | 'PEMBINA' | 'PIMPINAN' | 'PIKET' | 'OPERATOR';

export interface UserAccount {
  id: string;
  no?: number | string;
  username: string; // e.g. "admin" or "GR027" or "GR146"
  name: string; // nama_pengguna, e.g. "Ustzh. Eni Fitriyah, S.Pd.I"
  password: string; // default "12345" or custom
  role: UserRole; // role_akses
  gender: Gender;
  teacherCode?: string; // e.g. "GR027"
  nip?: string;
  phone?: string;
  position?: string; // e.g. "Wali Kelas", "Pimpinan", "Guru"
  positionDetail?: string; // e.g. "6.3", "5.4"
  assignedRoomName?: string; // kamar_binaan
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Student {
  id: string;
  no?: number | string;
  nis: string; // NIP PONDOK (e.g. 131232760014268544) atau NIS
  nipPondok?: string; // nip_pondok
  nisn?: string;
  name: string; // nama_santri (e.g. KIRANA QURRATU' AINI)
  className: string; // kelas (e.g. 4-5, 5-1)
  gender: Gender; // jk (L / P)
  tempat?: string; // lokasi (QN1 / QN2)
  idb?: string; // idb (e.g. 23192, 12084)
  noKartu?: string; // no_kartu (e.g. 1002435734233363)
  qrCodeData: string; // qr_code (e.g. CAZHIDPKYLN9RBQJC) - Presensi QR!
  idIzin?: string; // id_izin (e.g. QN2/P/4.5/0413)
  roomName?: string; // kode_kamar / nama_kamar
  parentPhone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  no?: number | string;
  teacherCode: string; // kode (e.g. GR006, GR027)
  nip: string; // kode / NIP
  name: string; // nama_guru (e.g. Ustzh. Eni Fitriyah, S.Pd.I)
  gender: Gender; // jk (L / P)
  status?: string; // status (e.g. AKTIF)
  position?: string; // jabatan (e.g. Pimpinan, Guru, Wali Kelas, Musyrif)
  positionDetail?: string; // ket / Keterangan Jabatan (e.g. "6.3", "5.4" jika Wali Kelas)
  subject: string; // Mapel / Bidang Tugas
  phone: string; // WA / HP
  role: 'Guru' | 'Ustadz' | 'Ustadzah' | 'Wali Kamar' | 'Pengasuhan' | 'Staf' | 'Pimpinan';
  avatarUrl?: string;
  qrCodeData: string;
  createdAt: string;
}

export interface Room {
  id: string;
  no?: number | string;
  roomNumber: string; // nama_kamar (e.g. MAJMU'AH ARABIYAH (PUTRA), BAITUL ALIM (PUTRI))
  roomCode?: string; // kode_kamar (e.g. QN2-KM04, QN1-KM18)
  location?: string; // lokasi (e.g. QN1, QN2)
  gender?: Gender; // jk (L / P)
  building: string; // Komplek / Gedung (e.g. Komplek QN1 (Putri), Komplek QN2 (Putra))
  capacity: number; // Kapasitas santri
  supervisorName: string; // Pembina / Musyrif / Wali Kamar
  supervisorCode?: string; // Kode Guru Musyrif (e.g. GR027)
  supervisorPhone?: string;
  description?: string;
  isFilled?: boolean;
  createdAt: string;
}

// ============================================================================
// SUPABASE 4 TABEL UTAMA SCHEMAS
// ============================================================================

/**
 * Tabel: users (no, username, nama_pengguna, role_akses, kamar_binaan, password)
 * Digunakan KHUSUS untuk Autentikasi/Login dan manajemen hak akses.
 */
export interface SupabaseUserRow {
  no?: number | string;
  username: string;
  nama_pengguna: string;
  role_akses: string;
  kamar_binaan?: string | null;
  password: string;
}

/**
 * Tabel: master_guru (no, kode, nama_guru, jk, status, jabatan, ket)
 * Penyimpanan data biodata guru.
 */
export interface SupabaseMasterGuruRow {
  no?: number | string;
  kode: string;
  nama_guru: string;
  jk: string;
  status?: string | null;
  jabatan?: string | null;
  ket?: string | null;
}

/**
 * Tabel: master_kamar (no, nama_kamar, lokasi, kode_kamar, jk)
 * Penyimpanan data kamar.
 */
export interface SupabaseMasterKamarRow {
  no?: number | string;
  nama_kamar: string;
  lokasi?: string | null;
  kode_kamar?: string | null;
  jk?: string | null;
}

/**
 * Tabel: master_santri (no, nip_pondok, nama_santri, kelas, jk, lokasi, idb, no_kartu, qr_code, id_izin, kode_kamar)
 * Penyimpanan data santri.
 */
export interface SupabaseMasterSantriRow {
  no?: number | string;
  nip_pondok: string;
  nama_santri: string;
  kelas: string;
  jk: string;
  lokasi?: string | null;
  idb?: string | null;
  no_kartu?: string | null;
  qr_code?: string | null;
  id_izin?: string | null;
  kode_kamar?: string | null;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentNis: string;
  studentName: string;
  className: string;
  roomName?: string;
  sessionType?: RoomAttendanceSession; // 'HARIAN_KAMAR' | 'SEBELUM_TIDUR'
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm:ss
  timeOut?: string; // HH:mm:ss
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string;
  syncedAt: string;
}

export interface LandingInfoCard {
  id: string;
  tag: string; // e.g. "01", "02", "03"
  title: string; // e.g. "INFO"
  content: string;
  isActive: boolean;
}

export interface SchoolSettings {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  logoUrl?: string;
  headmasterName: string;
  headmasterNip: string;
  operatorName: string;
  timeInLimit: string; // "06:30" (Batas Presensi Harian Kamar)
  timeLateLimit: string; // "22:00" (Batas Presensi Sebelum Tidur Kamar)
  timeOutStart: string; // "15:00"
  // Detail Pengaturan Presensi Kamar & Jadwal
  harianKamarStart?: string; // e.g. "05:00"
  harianKamarLimit?: string; // e.g. "06:30"
  harianToleranceMinutes?: number; // e.g. 15
  tidurKamarStart?: string; // e.g. "21:00"
  tidurKamarLimit?: string; // e.g. "22:00"
  tidurToleranceMinutes?: number; // e.g. 15
  activeAttendanceDays?: string[]; // ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad']
  activeAttendanceSessions?: RoomAttendanceSession[]; // ['HARIAN_KAMAR', 'SEBELUM_TIDUR']
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  autoSync: boolean;
  soundEnabled: boolean;
  scannerMode: 'checkin' | 'checkout';
  googleSheetId?: string;
  googleSheetUrl?: string;
  googleSheetWebhookUrl?: string;
  autoSyncGoogleSheets?: boolean;
  lastGoogleSync?: string;
  landingHeadline?: string;
  landingSubheadline?: string;
  landingDescription?: string;
  landingInfoCards?: LandingInfoCard[];
}

export interface RoomAssignmentSubmission {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  location?: string; // QN1 or QN2
  gender?: Gender; // L or P
  supervisorCode: string;
  supervisorName: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  studentIds: string[];
  studentList: { id: string; name: string; nis: string; className: string; gender?: Gender; tempat?: string }[];
  cctvStatus?: string;
  cazhIdStatus?: string;
  kendalaNotes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ActivityLog {
  id: string;
  type: 'presensi' | 'kamar' | 'pendataan_kamar' | 'laporan_kamar' | 'user' | 'approval' | 'system' | 'santri' | 'guru' | 'google_sheets';
  category?: 'presensi' | 'pendataan_kamar' | 'laporan_kamar' | 'user' | 'system' | 'santri' | 'guru' | 'kamar' | 'google_sheets' | 'approval';
  title?: string;
  action: string;
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: any;
}

export interface DailySummary {
  date: string;
  totalStudents: number;
  presentCount: number; // hadir tepat waktu
  lateCount: number; // terlambat
  sickCount: number; // sakit
  leaveCount: number; // izin
  absentCount: number; // alpa / belum hadir
  totalAttended: number; // hadir + terlambat
  attendanceRate: number; // %
  hadir?: number;
  terlambat?: number;
  sakit?: number;
  izin?: number;
  alpa?: number;
  belumAbsen?: number;
  attendancePercentage?: number;
}

export interface ClassSummary {
  className: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  sickCount: number;
  leaveCount: number;
  absentCount: number;
  attendanceRate: number;
  total?: number;
  hadir?: number;
  terlambat?: number;
  sakit?: number;
  izin?: number;
  alpa?: number;
  belumAbsen?: number;
  percentage?: number;
}

export interface RoomSummary {
  roomName: string;
  building: string;
  location?: string; // QN1 or QN2
  gender?: Gender;
  supervisorName?: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  sickCount: number;
  leaveCount: number;
  absentCount: number;
  attendanceRate: number;
  total?: number;
  capacity?: number;
  hadir?: number;
  terlambat?: number;
  sakit?: number;
  izin?: number;
  alpa?: number;
  belumAbsen?: number;
  percentage?: number;
}

export interface ScanResult {
  success: boolean;
  message: string;
  type?: 'checkin' | 'checkout';
  sessionType?: RoomAttendanceSession;
  student?: Student;
  record?: AttendanceRecord;
  isAlreadyRecorded?: boolean;
}

export type AppScreen =
  | 'landing'
  | 'login'
  | 'welcome'
  | 'admin'
  | 'room_form_standalone'
  | 'scanner_standalone'
  | 'room_members_standalone'
  | 'wali_kelas_dashboard'
  | 'wali_kamar_dashboard'
  | 'pembina_dashboard'
  | 'pimpinan_dashboard'
  | 'monitoring_standalone';

export type AdminTab =
  | 'dashboard'
  | 'master_data'
  | 'room_members'
  | 'approval_center'
  | 'presensi'
  | 'publish_center'
  | 'user_management'
  | 'activity_logs'
  | 'room_logs'
  | 'settings';

export type ViewTab =
  | 'monitoring'
  | 'room_members'
  | 'room_form'
  | 'approval'
  | 'wali_kelas'
  | 'wali_kamar'
  | 'pembina'
  | 'pimpinan'
  | 'scanner'
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'rooms'
  | 'rekap'
  | 'publish_center'
  | 'users'
  | 'activity_logs'
  | 'room_logs'
  | 'settings_presensi'
  | 'settings';


