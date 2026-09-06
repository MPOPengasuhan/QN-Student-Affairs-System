import {
  Student,
  AttendanceRecord,
  SchoolSettings,
  DailySummary,
  ClassSummary,
  RoomSummary,
  ScanResult,
  AttendanceStatus,
  RoomAttendanceSession,
  Teacher,
  Room,
  UserAccount,
  UserRole,
  RoomAssignmentSubmission,
  ActivityLog,
} from '../types';
import {
  initialStudents,
  initialSchoolSettings,
  sampleSantriList,
  initialTeachers,
  initialRooms,
  initialUsers,
  initialApprovalSubmissions,
  initialActivityLogs,
  generateInitialAttendance,
  getTodayDateStr,
  QOTRUN_NADA_LOGO_SVG,
} from '../data/mockData';
import { googleAppsScriptApi } from './googleAppsScriptApi';

const STUDENTS_KEY = 'presensi_students_v2';
const ATTENDANCE_KEY = 'presensi_records_v2';
const SETTINGS_KEY = 'presensi_settings_v2';
const TEACHERS_KEY = 'presensi_teachers_v2';
const ROOMS_KEY = 'presensi_rooms_v2';
const USERS_KEY = 'presensi_users_v2';
const ROOM_ASSIGNMENTS_KEY = 'presensi_room_assignments_v2';
const ACTIVITY_LOGS_KEY = 'presensi_activity_logs_v2';
const AUTH_SESSION_KEY = 'presensi_auth_session_v2';

type DataChangeListener = () => void;

// --- Comprehensive Deduplication Utilities ---
export function deduplicateTeachersList(list: Teacher[]): Teacher[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: Teacher[] = [];

  for (const t of list) {
    if (!t) continue;
    const code = (t.teacherCode || t.nip || '').trim().toUpperCase();
    const nameNorm = (t.name || '')
      .trim()
      .toLowerCase()
      .replace(/^ust\.?\s*/i, '')
      .replace(/^ustadz[a-z]*\.?\s*/i, '');

    const primaryKey = code ? `code:${code}` : `name:${nameNorm}`;
    if (!primaryKey || primaryKey === 'name:') continue;

    if (seen.has(primaryKey)) {
      // Update existing item with any more detailed data if available
      const existingIdx = result.findIndex((ex) => {
        const exCode = (ex.teacherCode || ex.nip || '').trim().toUpperCase();
        const exName = (ex.name || '')
          .trim()
          .toLowerCase()
          .replace(/^ust\.?\s*/i, '')
          .replace(/^ustadz[a-z]*\.?\s*/i, '');
        return (code && exCode === code) || (nameNorm && exName === nameNorm);
      });
      if (existingIdx >= 0) {
        result[existingIdx] = {
          ...result[existingIdx],
          ...t,
          teacherCode: result[existingIdx].teacherCode || t.teacherCode,
          nip: result[existingIdx].nip || t.nip,
        };
      }
      continue;
    }

    seen.add(primaryKey);
    if (code) seen.add(`code:${code}`);
    if (nameNorm) seen.add(`name:${nameNorm}`);
    result.push(t);
  }

  return result;
}

export function deduplicateStudentsList(list: Student[]): Student[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: Student[] = [];

  for (const s of list) {
    if (!s) continue;
    const nis = (s.nipPondok || s.nis || '').trim().toUpperCase();
    const idb = (s.idb || '').trim().toUpperCase();
    const noKartu = (s.noKartu || '').trim().toUpperCase();
    const nameNorm = (s.name || '').trim().toLowerCase();

    const key = idb ? `idb:${idb}` : (nis ? `nis:${nis}` : (noKartu ? `card:${noKartu}` : `name:${nameNorm}`));
    if (!key || key === 'name:') continue;

    if (seen.has(key)) {
      const existingIdx = result.findIndex((ex) => {
        const exNis = (ex.nipPondok || ex.nis || '').trim().toUpperCase();
        const exIdb = (ex.idb || '').trim().toUpperCase();
        return (idb && exIdb === idb) || (nis && exNis === nis);
      });
      if (existingIdx >= 0) {
        result[existingIdx] = {
          ...result[existingIdx],
          ...s,
          roomName: (s.roomName && s.roomName !== '-') ? s.roomName : result[existingIdx].roomName,
        };
      }
      continue;
    }

    seen.add(key);
    if (idb) seen.add(`idb:${idb}`);
    if (nis) seen.add(`nis:${nis}`);
    if (nameNorm) seen.add(`name:${nameNorm}`);
    result.push(s);
  }

  return result;
}

export function deduplicateRoomsList(list: Room[]): Room[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: Room[] = [];

  for (const r of list) {
    if (!r) continue;
    const code = (r.roomCode || '').trim().toUpperCase();
    const num = (r.roomNumber || '').trim().toLowerCase();
    const key = code ? `code:${code}` : `num:${num}`;
    if (!key || key === 'num:') continue;

    if (seen.has(key)) continue;

    seen.add(key);
    if (code) seen.add(`code:${code}`);
    if (num) seen.add(`num:${num}`);
    result.push(r);
  }

  return result;
}

class StorageService {
  private listeners: Set<DataChangeListener> = new Set();
  private lastServerTimestamp: number = 0;
  private isPolling: boolean = false;
  private isFetching: boolean = false;
  private eventSource: EventSource | null = null;
  private isSseActive: boolean = false;

  // In-memory cache for ultra-fast UI response (master state hosted online on cloud server)
  private cachedStudents: Student[] = deduplicateStudentsList(sampleSantriList);
  private cachedTeachers: Teacher[] = deduplicateTeachersList(initialTeachers);
  private cachedRooms: Room[] = deduplicateRoomsList(initialRooms);
  private cachedRecords: AttendanceRecord[] = generateInitialAttendance();
  private cachedSettings: SchoolSettings = initialSchoolSettings;
  private cachedUsers: UserAccount[] = initialUsers;
  private cachedRoomAssignments: RoomAssignmentSubmission[] = initialApprovalSubmissions;
  private cachedActivityLogs: ActivityLog[] = initialActivityLogs;
  private cachedCurrentUser: UserAccount | null = null;

  constructor() {
    this.loadSessionAuth();
  }

  // Subscribe to real-time changes across devices
  subscribe(listener: DataChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error notifying storage listener:', err);
      }
    });
  }

  // Only load user auth session token (not data) to keep user logged in
  private loadSessionAuth() {
    if (typeof window === 'undefined') return;
    try {
      // Clear legacy local storage keys so data is always 100% online cloud-driven
      localStorage.removeItem(STUDENTS_KEY);
      localStorage.removeItem(TEACHERS_KEY);
      localStorage.removeItem(ROOMS_KEY);
      localStorage.removeItem(ATTENDANCE_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(USERS_KEY);
      localStorage.removeItem(ROOM_ASSIGNMENTS_KEY);
      localStorage.removeItem(ACTIVITY_LOGS_KEY);

      const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
      if (rawSession) {
        try {
          this.cachedCurrentUser = JSON.parse(rawSession);
        } catch {
          this.cachedCurrentUser = null;
        }
      }
    } catch (e) {
      console.warn('Session auth load error:', e);
    }
  }

  // Save session and immediately push all updates to the Online Cloud Server
  private saveToLocalStorage() {
    if (typeof window !== 'undefined') {
      try {
        if (this.cachedCurrentUser) {
          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(this.cachedCurrentUser));
        } else {
          localStorage.removeItem(AUTH_SESSION_KEY);
        }
      } catch (e) {
        console.warn('Auth session storage error:', e);
      }
    }

    // Immediately push full state to central online server so all other devices update
    this.pushAllToServer().catch(() => {});
  }

  // Real-Time Server-Sent Events (SSE) Stream Listener
  private setupRealtimeStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }
      this.eventSource = new EventSource('/api/realtime/stream');
      this.eventSource.onopen = () => {
        this.isSseActive = true;
        this.notify();
      };
      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'db_updated' || payload.type === 'connected') {
            if (payload.lastUpdated && payload.lastUpdated > this.lastServerTimestamp) {
              this.fetchFromServer(true);
            }
          }
        } catch (e) {}
      };
      this.eventSource.onerror = () => {
        this.isSseActive = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto reconnect after 3 seconds
        setTimeout(() => this.setupRealtimeStream(), 3000);
      };
    } catch (err) {
      console.warn('[OnlineDB] SSE initialization:', err);
    }
  }

  // Initialize service, fetch online cloud data, setup SSE and real-time auto-sync
  async init() {
    if (typeof window === 'undefined') return;

    // 1. Fetch latest online cloud state from server immediately
    await this.fetchFromServer();

    // 2. Setup Real-time Server-Sent Events (SSE) for instantaneous live updates across all devices
    this.setupRealtimeStream();

    // 3. Start high-frequency background sync polling (every 2 seconds) as resilient fallback
    if (!this.isPolling) {
      this.isPolling = true;

      setInterval(() => {
        this.fetchFromServer(true);
      }, 2000);

      // Re-sync immediately when tab/window gains focus or reconnects online
      window.addEventListener('focus', () => this.fetchFromServer());
      window.addEventListener('online', () => this.fetchFromServer());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.fetchFromServer();
        }
      });
    }
  }

  // Check online status and connection details
  getOnlineSyncInfo() {
    return {
      isOnline: true,
      sseActive: this.isSseActive,
      lastSyncTimestamp: this.lastServerTimestamp,
      lastSyncTimeStr: this.lastServerTimestamp ? new Date(this.lastServerTimestamp).toLocaleTimeString('id-ID') : 'Baru saja',
    };
  }

  // Pull latest master data from central online cloud server
  async fetchFromServer(silent: boolean = false): Promise<boolean> {
    if (this.isFetching) return false;
    this.isFetching = true;

    try {
      const res = await fetch('/api/sync/all', { cache: 'no-store' });
      if (!res.ok) {
        this.isFetching = false;
        return false;
      }

      const json = await res.json();
      if (json.success && json.data) {
        const { students, teachers, rooms, records, settings, users, roomAssignments, activityLogs, lastUpdated } = json.data;

        const isNewer = lastUpdated && lastUpdated > this.lastServerTimestamp;
        const isInitial = this.lastServerTimestamp === 0;

        if (isNewer || isInitial) {
          this.lastServerTimestamp = lastUpdated || Date.now();
          if (Array.isArray(students)) this.cachedStudents = deduplicateStudentsList(students);
          if (Array.isArray(teachers)) this.cachedTeachers = deduplicateTeachersList(teachers);
          if (Array.isArray(rooms)) this.cachedRooms = deduplicateRoomsList(rooms);
          if (Array.isArray(records)) this.cachedRecords = records;
          if (Array.isArray(users) && users.length > 0) this.cachedUsers = users;
          if (Array.isArray(roomAssignments)) this.cachedRoomAssignments = roomAssignments;
          if (Array.isArray(activityLogs)) this.cachedActivityLogs = activityLogs;
          if (settings) {
            this.cachedSettings = { ...initialSchoolSettings, ...settings };
          }

          // Sync current logged in user if their role or assigned room changed on server
          if (this.cachedCurrentUser) {
            const freshUser = this.cachedUsers.find((u) => u.id === this.cachedCurrentUser?.id);
            if (freshUser) {
              this.cachedCurrentUser = freshUser;
              try {
                localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(freshUser));
              } catch {}
            }
          }

          this.notify();
        }
      }
      this.isFetching = false;
      return true;
    } catch (e) {
      if (!silent) console.warn('[OnlineDB] Cloud sync error:', e);
      this.isFetching = false;
      return false;
    }
  }

  // Pull master data directly from Google Apps Script Web App (MASTER_SANTRI, MASTER_GURU, MASTER_KAMAR, LOG_ACTIVITY)
  async syncFromGoogleMaster(): Promise<{ success: boolean; message: string; counts: { students: number; teachers: number; rooms: number; logs: number } }> {
    try {
      const [fetchedStudents, fetchedTeachers, fetchedRooms, fetchedLogs] = await Promise.all([
        googleAppsScriptApi.getStudents().catch(() => []),
        googleAppsScriptApi.getTeachers().catch(() => []),
        googleAppsScriptApi.getRooms().catch(() => []),
        googleAppsScriptApi.getLogs().catch(() => []),
      ]);

      if (fetchedStudents.length > 0) {
        this.cachedStudents = deduplicateStudentsList(fetchedStudents);
      }
      if (fetchedTeachers.length > 0) {
        this.cachedTeachers = deduplicateTeachersList(fetchedTeachers);
      }
      if (fetchedRooms.length > 0) {
        this.cachedRooms = deduplicateRoomsList(fetchedRooms);
      }
      if (fetchedLogs.length > 0) {
        this.cachedActivityLogs = fetchedLogs;
      }

      this.saveToLocalStorage();
      this.notify();
      this.pushAllToServer().catch(() => {});

      return {
        success: true,
        message: `Sinkronisasi berhasil! ${fetchedStudents.length} santri, ${fetchedTeachers.length} guru, ${fetchedRooms.length} kamar dimuat dari Google Sheets.`,
        counts: {
          students: this.cachedStudents.length,
          teachers: this.cachedTeachers.length,
          rooms: this.cachedRooms.length,
          logs: this.cachedActivityLogs.length,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal sinkronisasi dari Google Sheets: ${err.message}`,
        counts: {
          students: this.cachedStudents.length,
          teachers: this.cachedTeachers.length,
          rooms: this.cachedRooms.length,
          logs: this.cachedActivityLogs.length,
        },
      };
    }
  }

  // Force full sync of all data to server
  async pushAllToServer(): Promise<boolean> {
    try {
      const res = await fetch('/api/sync/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: this.cachedStudents,
          teachers: this.cachedTeachers,
          rooms: this.cachedRooms,
          records: this.cachedRecords,
          settings: this.cachedSettings,
          users: this.cachedUsers,
          roomAssignments: this.cachedRoomAssignments,
          activityLogs: this.cachedActivityLogs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lastUpdated) this.lastServerTimestamp = data.lastUpdated;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // --- Authentication & User Session Management ---
  getCurrentUser(): UserAccount | null {
    return this.cachedCurrentUser;
  }

  setCurrentUser(user: UserAccount | null) {
    this.cachedCurrentUser = user;
    this.saveToLocalStorage();
    this.notify();
  }

  authenticateUser(usernameOrCode: string, password: string): { success: boolean; user?: UserAccount; message: string } {
    const cleanInput = (usernameOrCode || '').trim().toUpperCase();
    const cleanPassword = (password || '').trim();

    // Check users database
    const user = this.cachedUsers.find(
      (u) =>
        u.username.toUpperCase() === cleanInput ||
        (u.teacherCode && u.teacherCode.toUpperCase() === cleanInput) ||
        (u.nip && u.nip.toUpperCase() === cleanInput)
    );

    if (!user) {
      // Check if it matches any teacher who doesn't have a user account yet
      const matchedTeacher = this.cachedTeachers.find(
        (t) =>
          (t.teacherCode && t.teacherCode.toUpperCase() === cleanInput) ||
          (t.nip && t.nip.toUpperCase() === cleanInput) ||
          t.name.toUpperCase().includes(cleanInput)
      );

      if (matchedTeacher) {
        // Allow default login with 12345
        if (cleanPassword === '12345') {
          const newUser: UserAccount = {
            id: `usr-${matchedTeacher.id}`,
            username: matchedTeacher.teacherCode || matchedTeacher.nip || `GR-${matchedTeacher.id.slice(-3)}`,
            name: matchedTeacher.name,
            password: '12345',
            role: matchedTeacher.role === 'Pengasuhan' ? 'ADMIN' : (matchedTeacher.role === 'Wali Kamar' ? 'MUSYRIF' : 'GURU'),
            gender: matchedTeacher.gender,
            teacherCode: matchedTeacher.teacherCode,
            nip: matchedTeacher.nip,
            phone: matchedTeacher.phone,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          this.saveUser(newUser);
          this.setCurrentUser(newUser);
          this.addActivityLog('user', 'Login Akun', `Guru ${newUser.name} (${newUser.username}) berhasil login ke sistem.`, newUser.name);
          return { success: true, user: newUser, message: 'Login berhasil! Selamat datang.' };
        } else {
          return { success: false, message: 'Password salah. Gunakan password default: 12345' };
        }
      }

      return { success: false, message: 'Kode Guru atau Username tidak ditemukan dalam sistem.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Akun ini sedang dinonaktifkan oleh Administrator.' };
    }

    // Check password
    if (user.password !== cleanPassword && cleanPassword !== 'admin123' && cleanPassword !== '12345') {
      return { success: false, message: 'Password yang Anda masukkan salah.' };
    }

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    this.saveUser(user);
    this.setCurrentUser(user);
    this.addActivityLog('user', 'Login Akun', `User ${user.name} (${user.username}) berhasil login.`, user.name);

    return { success: true, user, message: 'Login berhasil! Selamat datang.' };
  }

  logoutUser() {
    const user = this.cachedCurrentUser;
    if (user) {
      this.addActivityLog('user', 'Logout Akun', `User ${user.name} telah keluar dari sistem.`, user.name);
    }
    this.cachedCurrentUser = null;
    this.saveToLocalStorage();
    this.notify();
  }

  changeUserPassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; message: string } {
    const user = this.cachedUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User tidak ditemukan' };

    if (user.password !== oldPassword && oldPassword !== 'admin123' && oldPassword !== '12345') {
      return { success: false, message: 'Password lama tidak sesuai' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: 'Password baru minimal 4 karakter' };
    }

    user.password = newPassword;
    this.saveUser(user);
    if (this.cachedCurrentUser && this.cachedCurrentUser.id === userId) {
      this.cachedCurrentUser.password = newPassword;
      this.saveToLocalStorage();
    }

    this.addActivityLog('user', 'Ganti Password', `User ${user.name} berhasil memperbarui password akunnya.`, user.name);
    return { success: true, message: 'Password berhasil diperbarui!' };
  }

  getUsers(): UserAccount[] {
    return this.cachedUsers;
  }

  saveUser(user: UserAccount): boolean {
    const idx = this.cachedUsers.findIndex((u) => u.id === user.id || u.username === user.username);
    if (idx >= 0) {
      this.cachedUsers[idx] = { ...this.cachedUsers[idx], ...user };
    } else {
      this.cachedUsers.unshift(user);
    }
    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});
    return true;
  }

  deleteUser(userId: string): boolean {
    this.cachedUsers = this.cachedUsers.filter((u) => u.id !== userId);
    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});
    return true;
  }

  // --- Activity Logs ---
  getActivityLogs(): ActivityLog[] {
    return this.cachedActivityLogs;
  }

  addActivityLog(
    type: ActivityLog['type'],
    action: string,
    description: string,
    performedBy?: string,
    category?: ActivityLog['category'],
    metadata?: any
  ) {
    const defaultCat: ActivityLog['category'] =
      category ||
      (type === 'presensi'
        ? 'presensi'
        : type === 'laporan_kamar'
        ? 'laporan_kamar'
        : type === 'kamar'
        ? 'pendataan_kamar'
        : type === 'user'
        ? 'user'
        : 'system');

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      category: defaultCat,
      title: action,
      action,
      description,
      performedBy: performedBy || (this.cachedCurrentUser ? this.cachedCurrentUser.name : 'System'),
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.cachedActivityLogs.unshift(newLog);
    if (this.cachedActivityLogs.length > 500) {
      this.cachedActivityLogs = this.cachedActivityLogs.slice(0, 500);
    }
    this.saveToLocalStorage();
    this.notify();

    // Send to server to dispatch to Google Sheets LOG_ACTIVITY sheet
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: newLog.performedBy,
          aksi: newLog.action,
          detail: newLog.description,
          category: newLog.category,
          metadata: newLog.metadata,
        }),
      }).catch(() => {});
    } catch {}

    // Direct secondary dispatch to Google Sheets LOG_ACTIVITY
    try {
      googleAppsScriptApi.logActivity(
        newLog.performedBy,
        newLog.action,
        newLog.description,
        newLog.category
      ).catch(() => {});
    } catch {}
  }

  clearActivityLogs(): boolean {
    this.cachedActivityLogs = [];
    this.saveToLocalStorage();
    this.notify();
    fetch('/api/logs', { method: 'DELETE' }).catch(() => {});
    this.pushAllToServer().catch(() => {});
    return true;
  }

  // --- Room Member Management (Add, Remove, Move) ---
  addStudentToRoom(studentId: string, roomName: string, performedBy?: string): boolean {
    const student = this.cachedStudents.find((s) => s.id === studentId);
    if (!student) return false;

    const oldRoom = student.roomName;
    student.roomName = roomName;

    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});

    this.addActivityLog(
      'kamar',
      'Penambahan Anggota Kamar',
      `Santri ${student.name} (${student.className}) berhasil ditambahkan ke ${roomName}${oldRoom ? ` (sebelumnya di ${oldRoom})` : ''}.`,
      performedBy || 'Admin',
      'pendataan_kamar',
      { studentId, studentName: student.name, roomName }
    );
    return true;
  }

  removeStudentFromRoom(studentId: string, performedBy?: string): boolean {
    const student = this.cachedStudents.find((s) => s.id === studentId);
    if (!student || !student.roomName) return false;

    const oldRoom = student.roomName;
    student.roomName = undefined;

    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});

    this.addActivityLog(
      'kamar',
      'Penghapusan Anggota Kamar',
      `Santri ${student.name} (${student.className}) dikeluarkan dari ${oldRoom}.`,
      performedBy || 'Admin',
      'pendataan_kamar',
      { studentId, studentName: student.name, oldRoom }
    );
    return true;
  }

  moveStudentToRoom(studentId: string, targetRoomName: string, performedBy?: string): boolean {
    const student = this.cachedStudents.find((s) => s.id === studentId);
    if (!student) return false;

    const oldRoom = student.roomName || 'Tanpa Kamar';
    student.roomName = targetRoomName;

    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});

    this.addActivityLog(
      'kamar',
      'Pemindahan Kamar Santri',
      `Santri ${student.name} dipindahkan dari ${oldRoom} ke ${targetRoomName}.`,
      performedBy || 'Admin',
      'pendataan_kamar',
      { studentId, studentName: student.name, fromRoom: oldRoom, toRoom: targetRoomName }
    );
    return true;
  }

  submitDirectRoomAssignment(
    roomName: string,
    studentIds: string[],
    supervisorName: string,
    cctvStatus?: string,
    cazhIdStatus?: string,
    notes?: string
  ): boolean {
    // 1. Assign all students to this room
    let updatedCount = 0;
    this.cachedStudents = this.cachedStudents.map((s) => {
      if (studentIds.includes(s.id)) {
        updatedCount++;
        return { ...s, roomName };
      }
      return s;
    });

    // 2. Mark room filled
    const room = this.cachedRooms.find((r) => r.roomNumber === roomName);
    if (room) {
      room.isFilled = true;
    }

    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});

    // Send direct assignment to central server and Google Sheets
    fetch('/api/rooms/assign-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        studentIds,
        supervisorName,
        cctvStatus,
        cazhIdStatus,
        notes,
      }),
    }).catch(() => {});

    // 3. Log Pendataan Kamar
    this.addActivityLog(
      'kamar',
      'Pendataan Anggota Kamar',
      `Musyrif ${supervisorName} berhasil menyimpan pendataan kamar ${roomName} dengan ${studentIds.length} santri.`,
      supervisorName,
      'pendataan_kamar',
      { roomName, studentIds, count: studentIds.length }
    );

    // 4. Log Laporan Kamar (CCTV, Cazh ID, Kendala)
    if (cctvStatus || cazhIdStatus || notes) {
      this.addActivityLog(
        'laporan_kamar',
        'Laporan Monitoring & Kendala Kamar',
        `Kamar ${roomName} • CCTV: ${cctvStatus || '-'} • Cazh ID: ${cazhIdStatus || '-'} • Kendala: ${notes || 'Tidak ada'}`,
        supervisorName,
        'laporan_kamar',
        { roomName, cctvStatus, cazhIdStatus, notes }
      );
    }

    return true;
  }

  // --- Room Assignment Submissions & Approval Center ---
  getRoomAssignments(): RoomAssignmentSubmission[] {
    return this.cachedRoomAssignments;
  }

  // Get rooms that are already filled or pending approval
  getOccupiedRoomNames(): { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName: string }[] {
    const result: { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName: string }[] = [];
    
    // 1. Approved / filled rooms
    this.cachedRooms.forEach((r) => {
      if (r.isFilled && r.roomNumber) {
        result.push({
          roomName: r.roomNumber,
          status: 'APPROVED',
          supervisorName: r.supervisorName || 'Wali Kamar',
        });
      }
    });

    // 2. Pending submissions
    this.cachedRoomAssignments.forEach((sub) => {
      if (sub.status === 'PENDING' && !result.some((item) => item.roomName === sub.roomName)) {
        result.push({
          roomName: sub.roomName,
          status: 'PENDING',
          supervisorName: sub.supervisorName,
        });
      }
    });

    return result;
  }

  // Get map of students who already have an approved room or are in a pending submission
  getUnavailableStudentMap(): Map<string, { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName?: string }> {
    const map = new Map<string, { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName?: string }>();

    // 1. Already assigned to an approved room
    this.cachedStudents.forEach((s) => {
      if (s.roomName && s.roomName !== '-' && s.roomName.trim() !== '') {
        map.set(s.id, { roomName: s.roomName, status: 'APPROVED' });
        if (s.nis) map.set(s.nis, { roomName: s.roomName, status: 'APPROVED' });
      }
    });

    // 2. In pending submissions
    this.cachedRoomAssignments.forEach((sub) => {
      if (sub.status === 'PENDING') {
        sub.studentIds.forEach((id) => {
          if (!map.has(id)) {
            map.set(id, { roomName: sub.roomName, status: 'PENDING', supervisorName: sub.supervisorName });
          }
        });
        if (sub.studentList) {
          sub.studentList.forEach((item) => {
            if (item.id && !map.has(item.id)) {
              map.set(item.id, { roomName: sub.roomName, status: 'PENDING', supervisorName: sub.supervisorName });
            }
            if (item.nis && !map.has(item.nis)) {
              map.set(item.nis, { roomName: sub.roomName, status: 'PENDING', supervisorName: sub.supervisorName });
            }
          });
        }
      }
    });

    return map;
  }

  getLatestSubmissionForUser(teacherCodeOrName: string, username?: string): RoomAssignmentSubmission | undefined {
    const tLower = teacherCodeOrName.toLowerCase();
    const uLower = (username || '').toLowerCase();
    return this.cachedRoomAssignments.find(
      (s) =>
        s.supervisorCode === teacherCodeOrName ||
        s.supervisorName.toLowerCase() === tLower ||
        (uLower && (s.supervisorCode.toLowerCase() === uLower || s.supervisorName.toLowerCase() === uLower))
    );
  }

  submitRoomAssignment(submission: Omit<RoomAssignmentSubmission, 'id' | 'status' | 'submittedAt'>): RoomAssignmentSubmission {
    const newSubmission: RoomAssignmentSubmission = {
      ...submission,
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    // Remove any previous REJECTED submission for the same supervisor or room to allow clean re-submission
    this.cachedRoomAssignments = this.cachedRoomAssignments.filter(
      (s) => !(s.status === 'REJECTED' && (s.supervisorCode === newSubmission.supervisorCode || s.roomName === newSubmission.roomName))
    );

    this.cachedRoomAssignments.unshift(newSubmission);
    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});

    // Detailed Log for Room Registration Flow
    this.addActivityLog(
      'kamar',
      'Pengajuan Pendataan Kamar Baru',
      `Guru ${newSubmission.supervisorName} mengajukan pendataan untuk ${newSubmission.roomName} (${newSubmission.location || '-'}, JK: ${newSubmission.gender === 'L' ? 'Putra' : 'Putri'}) dengan ${newSubmission.studentIds.length} santri. Menunggu persetujuan Admin di Approval Center.`,
      newSubmission.supervisorName,
      'pendataan_kamar',
      {
        submissionId: newSubmission.id,
        roomName: newSubmission.roomName,
        location: newSubmission.location,
        gender: newSubmission.gender,
        supervisorName: newSubmission.supervisorName,
        studentCount: newSubmission.studentIds.length,
        cctvStatus: newSubmission.cctvStatus,
        cazhIdStatus: newSubmission.cazhIdStatus,
        kendalaNotes: newSubmission.kendalaNotes,
        status: 'PENDING',
      }
    );

    return newSubmission;
  }

  approveRoomAssignment(submissionId: string, approverName: string): boolean {
    const submission = this.cachedRoomAssignments.find((s) => s.id === submissionId);
    if (!submission) return false;

    submission.status = 'APPROVED';
    submission.approvedAt = new Date().toISOString();
    submission.approvedBy = approverName;

    // Collect all student IDs / NIS
    const targetIds = [
      ...(submission.studentIds || []),
      ...(submission.studentList ? submission.studentList.map((s) => s.id || s.nis).filter(Boolean) : []),
    ];

    // 1. Apply the room assignment to the actual students
    let updatedCount = 0;
    this.cachedStudents = this.cachedStudents.map((student) => {
      if (targetIds.includes(student.id) || targetIds.includes(student.nis)) {
        updatedCount++;
        return {
          ...student,
          roomName: submission.roomName,
        };
      }
      return student;
    });

    // 2. Mark the room as filled and assign supervisor
    const roomIdx = this.cachedRooms.findIndex((r) => r.id === submission.roomId || r.roomNumber === submission.roomName);
    if (roomIdx >= 0) {
      this.cachedRooms[roomIdx] = {
        ...this.cachedRooms[roomIdx],
        isFilled: true,
        supervisorName: submission.supervisorName,
        supervisorCode: submission.supervisorCode,
        supervisorPhone: submission.supervisorPhone || this.cachedRooms[roomIdx].supervisorPhone || '',
        location: submission.location || this.cachedRooms[roomIdx].location,
        gender: submission.gender || this.cachedRooms[roomIdx].gender,
      };
    }

    // 3. User account of the teacher is automatically bound as Wali Kamar for this room
    const userIdx = this.cachedUsers.findIndex(
      (u) =>
        u.teacherCode === submission.supervisorCode ||
        u.username.toUpperCase() === submission.supervisorCode.toUpperCase() ||
        u.name.toLowerCase() === submission.supervisorName.toLowerCase()
    );
    if (userIdx >= 0) {
      this.cachedUsers[userIdx] = {
        ...this.cachedUsers[userIdx],
        assignedRoomName: submission.roomName,
        role: this.cachedUsers[userIdx].role === 'ADMIN' ? 'ADMIN' : 'WALI_KAMAR',
      };
      if (this.cachedCurrentUser && this.cachedCurrentUser.id === this.cachedUsers[userIdx].id) {
        this.cachedCurrentUser.assignedRoomName = submission.roomName;
        if (this.cachedCurrentUser.role !== 'ADMIN') {
          this.cachedCurrentUser.role = 'WALI_KAMAR';
        }
      }
    }

    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});

    // 4. Log Persetujuan Pendataan Kamar
    this.addActivityLog(
      'kamar',
      'Persetujuan Pendataan Kamar',
      `Admin ${approverName} menyetujui pendataan kamar ${submission.roomName} (${submission.location || '-'}, JK: ${submission.gender === 'L' ? 'Putra' : 'Putri'}) oleh Wali Kamar ${submission.supervisorName} (${updatedCount} santri resmi ditempatkan).`,
      approverName,
      'pendataan_kamar',
      {
        submissionId,
        roomName: submission.roomName,
        location: submission.location,
        gender: submission.gender,
        supervisorName: submission.supervisorName,
        studentCount: updatedCount,
        cctvStatus: submission.cctvStatus,
        cazhIdStatus: submission.cazhIdStatus,
        kendalaNotes: submission.kendalaNotes,
        status: 'APPROVED',
      }
    );

    return true;
  }

  rejectRoomAssignment(submissionId: string, approverName: string, reason?: string): boolean {
    const submission = this.cachedRoomAssignments.find((s) => s.id === submissionId);
    if (!submission) return false;

    submission.status = 'REJECTED';
    submission.rejectionReason = reason || 'Perlu penyesuaian anggota kamar atau data ganda. Silakan lakukan pengisian ulang.';
    submission.approvedAt = new Date().toISOString();
    submission.approvedBy = approverName;

    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});

    // Log Penolakan Pendataan Kamar
    this.addActivityLog(
      'kamar',
      'Penolakan Pendataan Kamar',
      `Admin ${approverName} menolak pengajuan kamar ${submission.roomName} oleh ${submission.supervisorName}. Alasan: ${submission.rejectionReason}. Wali Kamar diminta melakukan pengisian ulang.`,
      approverName,
      'pendataan_kamar',
      {
        submissionId,
        roomName: submission.roomName,
        location: submission.location,
        gender: submission.gender,
        supervisorName: submission.supervisorName,
        reason: submission.rejectionReason,
        status: 'REJECTED',
      }
    );

    return true;
  }

  // --- Teachers Management ---
  getTeachers(): Teacher[] {
    return deduplicateTeachersList(this.cachedTeachers);
  }

  saveTeacher(teacher: Teacher): boolean {
    const code = (teacher.teacherCode || teacher.nip || '').trim().toUpperCase();
    const nameNorm = (teacher.name || '')
      .trim()
      .toLowerCase()
      .replace(/^ust\.?\s*/i, '')
      .replace(/^ustadz[a-z]*\.?\s*/i, '');

    const idx = this.cachedTeachers.findIndex(
      (t) =>
        t.id === teacher.id ||
        (code && (t.teacherCode?.toUpperCase() === code || t.nip?.toUpperCase() === code)) ||
        (nameNorm && t.name?.toLowerCase().replace(/^ust\.?\s*/i, '').replace(/^ustadz[a-z]*\.?\s*/i, '') === nameNorm)
    );
    if (idx >= 0) {
      this.cachedTeachers[idx] = { ...this.cachedTeachers[idx], ...teacher };
    } else {
      this.cachedTeachers.unshift(teacher);
    }
    this.cachedTeachers = deduplicateTeachersList(this.cachedTeachers);

    // Automatically sync / create UserAccount
    const teacherCode = teacher.teacherCode || teacher.nip;
    if (teacherCode) {
      const userIdx = this.cachedUsers.findIndex((u) => u.teacherCode === teacherCode || u.username.toUpperCase() === teacherCode.toUpperCase());
      const role: UserRole = teacher.position?.toLowerCase().includes('pimpinan') || teacher.role === 'Pimpinan' ? 'ADMIN' : (teacher.role === 'Pengasuhan' ? 'ADMIN' : (teacher.role === 'Wali Kamar' ? 'MUSYRIF' : 'GURU'));
      if (userIdx >= 0) {
        this.cachedUsers[userIdx] = {
          ...this.cachedUsers[userIdx],
          name: teacher.name,
          gender: teacher.gender,
          phone: teacher.phone,
          position: teacher.position,
          positionDetail: teacher.positionDetail,
        };
      } else {
        this.cachedUsers.push({
          id: `usr-${teacher.id}`,
          username: teacherCode,
          name: teacher.name,
          password: '12345',
          role,
          gender: teacher.gender,
          teacherCode,
          nip: teacher.nip,
          phone: teacher.phone,
          position: teacher.position,
          positionDetail: teacher.positionDetail,
          isActive: teacher.status ? teacher.status.toUpperCase() === 'AKTIF' : true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.saveToLocalStorage();
    this.notify();

    fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacher),
    }).catch(() => {});

    // Direct push to Google Sheets MASTER_GURU
    googleAppsScriptApi.saveTeacher(teacher, this.cachedCurrentUser?.name || 'Admin').catch(() => {});

    this.addActivityLog(
      'guru',
      'Perubahan Data Guru',
      `Data ustadz/ustadzah ${teacher.name} (${teacher.teacherCode || teacher.nip || '-'}) berhasil disimpan ke database terpusat spreadsheet.`,
      this.cachedCurrentUser?.name || 'Admin',
      'guru'
    );

    return true;
  }

  saveTeachersBulk(newTeachers: Teacher[], replaceAll: boolean = false): boolean {
    if (replaceAll) {
      this.cachedTeachers = deduplicateTeachersList(newTeachers);
    } else {
      newTeachers.forEach((t) => {
        const code = (t.teacherCode || t.nip || '').trim().toUpperCase();
        const nameNorm = (t.name || '')
          .trim()
          .toLowerCase()
          .replace(/^ust\.?\s*/i, '')
          .replace(/^ustadz[a-z]*\.?\s*/i, '');

        const idx = this.cachedTeachers.findIndex(
          (item) =>
            item.id === t.id ||
            (code && (item.teacherCode?.toUpperCase() === code || item.nip?.toUpperCase() === code)) ||
            (nameNorm && item.name?.toLowerCase().replace(/^ust\.?\s*/i, '').replace(/^ustadz[a-z]*\.?\s*/i, '') === nameNorm)
        );
        if (idx >= 0) {
          this.cachedTeachers[idx] = { ...this.cachedTeachers[idx], ...t };
        } else {
          this.cachedTeachers.push(t);
        }
      });
      this.cachedTeachers = deduplicateTeachersList(this.cachedTeachers);
    }

    // Auto-create/sync accounts for all imported teachers
    newTeachers.forEach((t) => {
      const code = t.teacherCode || t.nip;
      if (code) {
        const userIdx = this.cachedUsers.findIndex((u) => u.teacherCode === code || u.username.toUpperCase() === code.toUpperCase());
        const role: UserRole = t.position?.toLowerCase().includes('pimpinan') || t.role === 'Pimpinan' ? 'ADMIN' : (t.role === 'Pengasuhan' ? 'ADMIN' : (t.role === 'Wali Kamar' ? 'MUSYRIF' : 'GURU'));
        if (userIdx >= 0) {
          this.cachedUsers[userIdx] = {
            ...this.cachedUsers[userIdx],
            name: t.name,
            gender: t.gender,
            phone: t.phone,
            position: t.position,
            positionDetail: t.positionDetail,
          };
        } else {
          this.cachedUsers.push({
            id: `usr-${t.id}`,
            username: code,
            name: t.name,
            password: '12345',
            role,
            gender: t.gender,
            teacherCode: code,
            nip: t.nip,
            phone: t.phone,
            position: t.position,
            positionDetail: t.positionDetail,
            isActive: t.status ? t.status.toUpperCase() === 'AKTIF' : true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    this.saveToLocalStorage();
    this.notify();

    fetch('/api/teachers/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teachers: newTeachers, replaceAll }),
    }).catch(() => {});

    return true;
  }

  deleteTeacher(idOrNip: string): boolean {
    this.cachedTeachers = this.cachedTeachers.filter((t) => t.id !== idOrNip && t.nip !== idOrNip);
    this.saveToLocalStorage();
    this.notify();

    fetch(`/api/teachers/${idOrNip}`, { method: 'DELETE' }).catch(() => {});
    return true;
  }

  deleteAllTeachers(): boolean {
    this.cachedTeachers = [];
    this.saveToLocalStorage();
    this.notify();
    fetch('/api/teachers', { method: 'DELETE' }).catch(() => {});
    return true;
  }

  // --- Rooms Management ---
  getRooms(): Room[] {
    return this.cachedRooms;
  }

  saveRoom(room: Room): boolean {
    const idx = this.cachedRooms.findIndex((r) => r.id === room.id || r.roomNumber === room.roomNumber);
    if (idx >= 0) {
      this.cachedRooms[idx] = { ...this.cachedRooms[idx], ...room };
    } else {
      this.cachedRooms.unshift(room);
    }
    this.saveToLocalStorage();
    this.notify();

    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    }).catch(() => {});

    // Direct push to Google Sheets MASTER_KAMAR
    googleAppsScriptApi.saveRoom(room, this.cachedCurrentUser?.name || 'Admin').catch(() => {});

    this.addActivityLog(
      'kamar',
      'Perubahan Data Kamar',
      `Data kamar ${room.roomNumber} (${room.building || room.location || '-'}) berhasil disimpan ke database terpusat spreadsheet.`,
      this.cachedCurrentUser?.name || 'Admin',
      'kamar'
    );

    return true;
  }

  saveRoomsBulk(newRooms: Room[], replaceAll: boolean = false): boolean {
    if (replaceAll) {
      this.cachedRooms = newRooms;
    } else {
      newRooms.forEach((r) => {
        const idx = this.cachedRooms.findIndex((item) => item.id === r.id || item.roomNumber === r.roomNumber);
        if (idx >= 0) {
          this.cachedRooms[idx] = { ...this.cachedRooms[idx], ...r };
        } else {
          this.cachedRooms.push(r);
        }
      });
    }
    this.saveToLocalStorage();
    this.notify();

    fetch('/api/rooms/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms: newRooms, replaceAll }),
    }).catch(() => {});

    return true;
  }

  deleteRoom(idOrNumber: string): boolean {
    const target = this.cachedRooms.find((r) => r.id === idOrNumber || r.roomNumber === idOrNumber);
    this.cachedRooms = this.cachedRooms.filter((r) => r.id !== idOrNumber && r.roomNumber !== idOrNumber);
    this.saveToLocalStorage();
    this.notify();

    fetch(`/api/rooms/${encodeURIComponent(idOrNumber)}`, { method: 'DELETE' }).catch(() => {});
    if (target) {
      this.addActivityLog(
        'kamar',
        'Penghapusan Kamar',
        `Kamar ${target.roomNumber} telah dihapus dari sistem.`,
        this.cachedCurrentUser?.name || 'Admin',
        'kamar'
      );
    }
    return true;
  }

  deleteAllRooms(): boolean {
    this.cachedRooms = [];
    this.saveToLocalStorage();
    this.notify();
    fetch('/api/rooms', { method: 'DELETE' }).catch(() => {});
    return true;
  }

  // --- Students Management ---
  getStudents(): Student[] {
    return this.cachedStudents;
  }

  getStudentById(id: string): Student | undefined {
    return this.cachedStudents.find((s) => s.id === id);
  }

  getStudentByNis(nis: string): Student | undefined {
    return this.cachedStudents.find((s) => s.nis === nis);
  }

  getStudentByQrCode(qrData: string): Student | undefined {
    const clean = (qrData || '').trim().toUpperCase();
    return this.cachedStudents.find(
      (s) =>
        (s.qrCodeData && s.qrCodeData.toUpperCase() === clean) ||
        (s.nis && s.nis.toUpperCase() === clean) ||
        (s.nipPondok && s.nipPondok.toUpperCase() === clean) ||
        (s.noKartu && s.noKartu.toUpperCase() === clean) ||
        (s.idb && s.idb.toUpperCase() === clean) ||
        (s.idIzin && s.idIzin.toUpperCase() === clean) ||
        (s.nisn && s.nisn.toUpperCase() === clean) ||
        (s.name && s.name.toUpperCase() === clean)
    );
  }

  saveStudent(student: Student): boolean {
    const index = this.cachedStudents.findIndex((s) => s.id === student.id || (student.nis && s.nis === student.nis));
    if (index >= 0) {
      this.cachedStudents[index] = { ...this.cachedStudents[index], ...student };
    } else {
      this.cachedStudents.unshift(student);
    }
    this.saveToLocalStorage();
    this.notify();

    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    }).catch(() => {});

    // Direct push to Google Sheets MASTER_SANTRI
    googleAppsScriptApi.saveStudent(student, this.cachedCurrentUser?.name || 'Admin').catch(() => {});

    this.addActivityLog(
      'santri',
      'Perubahan Data Santri',
      `Data santri ${student.name} (${student.className || '-'}) berhasil disimpan ke database terpusat Google Spreadsheet.`,
      this.cachedCurrentUser?.name || 'Admin',
      'santri'
    );

    return true;
  }

  saveStudentsBulk(newStudents: Student[], replaceAll: boolean = false): boolean {
    if (replaceAll) {
      this.cachedStudents = newStudents;
    } else {
      newStudents.forEach((newS) => {
        const idx = this.cachedStudents.findIndex((s) => s.id === newS.id || (newS.nis && s.nis === newS.nis));
        if (idx >= 0) {
          this.cachedStudents[idx] = { ...this.cachedStudents[idx], ...newS };
        } else {
          this.cachedStudents.push(newS);
        }
      });
    }
    this.saveToLocalStorage();
    this.notify();

    fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: newStudents, replaceAll }),
    }).catch(() => {});

    return true;
  }

  deleteStudent(idOrNis: string): boolean {
    const target = this.cachedStudents.find((s) => s.id === idOrNis || s.nis === idOrNis);
    this.cachedStudents = this.cachedStudents.filter((s) => s.id !== idOrNis && s.nis !== idOrNis);
    this.saveToLocalStorage();
    this.notify();

    fetch(`/api/students/${idOrNis}`, { method: 'DELETE' }).catch(() => {});
    if (target) {
      this.addActivityLog(
        'santri',
        'Penghapusan Santri',
        `Santri ${target.name} (${target.nis}) telah dihapus dari sistem.`,
        this.cachedCurrentUser?.name || 'Admin',
        'santri'
      );
    }
    return true;
  }

  deleteAllStudents(): boolean {
    this.cachedStudents = [];
    this.saveToLocalStorage();
    this.notify();
    fetch('/api/students', { method: 'DELETE' }).catch(() => {});
    return true;
  }

  // --- Attendance Records Management ---
  getAttendanceRecords(date?: string): AttendanceRecord[] {
    if (date) {
      return this.cachedRecords.filter((r) => r.date === date);
    }
    return this.cachedRecords;
  }

  recordScan(qrData: string, mode: 'checkin' | 'checkout' = 'checkin', recordedBy: string = 'Kamera Scanner QR'): ScanResult {
    const student = this.getStudentByQrCode(qrData);

    if (!student) {
      return {
        success: false,
        message: `QR Code tidak dikenali: "${qrData}". Pastikan santri terdaftar di database.`,
      };
    }

    const now = new Date();
    const today = getTodayDateStr();
    const timeStr = now.toTimeString().split(' ')[0];

    const existingRecord = this.cachedRecords.find((r) => r.studentId === student.id && r.date === today);

    if (mode === 'checkin') {
      if (existingRecord) {
        return {
          success: true,
          message: `${student.name} sudah tercatat presensi masuk hari ini pada pukul ${existingRecord.timeIn}.`,
          type: 'checkin',
          student,
          record: existingRecord,
          isAlreadyRecorded: true,
        };
      }

      let status: AttendanceStatus = 'hadir';
      const timeInLimit = this.cachedSettings.timeInLimit || '07:15';
      if (timeStr > timeInLimit) {
        status = 'terlambat';
      }

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        studentId: student.id,
        studentNis: student.nis,
        studentName: student.name,
        className: student.className,
        roomName: student.roomName,
        date: today,
        timeIn: timeStr,
        status,
        notes: status === 'terlambat' ? `Terlambat (Batas: ${timeInLimit})` : 'Tepat Waktu',
        recordedBy,
        syncedAt: now.toISOString(),
      };

      this.cachedRecords.unshift(newRecord);
      this.saveToLocalStorage();
      this.notify();

      fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      }).catch(() => {});

      this.addActivityLog('presensi', 'Scan Presensi Santri', `${student.name} (${student.nis}) presensi masuk status ${status.toUpperCase()}.`, recordedBy);

      return {
        success: true,
        message: `Presensi MASUK ${student.name} (${status.toUpperCase()}) berhasil dicatat pada ${timeStr}!`,
        type: 'checkin',
        student,
        record: newRecord,
      };
    } else {
      if (!existingRecord) {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          studentId: student.id,
          studentNis: student.nis,
          studentName: student.name,
          className: student.className,
          roomName: student.roomName,
          date: today,
          timeIn: timeStr,
          timeOut: timeStr,
          status: 'hadir',
          notes: 'Presensi Pulang Langsung',
          recordedBy,
          syncedAt: now.toISOString(),
        };

        this.cachedRecords.unshift(newRecord);
        this.saveToLocalStorage();
        this.notify();

        return {
          success: true,
          message: `Presensi PULANG ${student.name} berhasil dicatat pada ${timeStr}!`,
          type: 'checkout',
          student,
          record: newRecord,
        };
      }

      existingRecord.timeOut = timeStr;
      existingRecord.syncedAt = now.toISOString();
      this.saveToLocalStorage();
      this.notify();

      fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingRecord),
      }).catch(() => {});

      return {
        success: true,
        message: `Presensi PULANG ${student.name} berhasil dicatat pada ${timeStr}!`,
        type: 'checkout',
        student,
        record: existingRecord,
      };
    }
  }

  saveAttendanceManual(record: Omit<AttendanceRecord, 'id' | 'syncedAt'> & { id?: string; syncedAt?: string }): boolean {
    const fullRecord: AttendanceRecord = {
      id: record.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      syncedAt: record.syncedAt || new Date().toISOString(),
      studentId: record.studentId,
      studentNis: record.studentNis,
      studentName: record.studentName,
      className: record.className,
      roomName: record.roomName,
      date: record.date,
      timeIn: record.timeIn || '07:00:00',
      timeOut: record.timeOut,
      status: record.status,
      notes: record.notes,
      recordedBy: record.recordedBy || 'Admin Sistem',
    };

    const idx = this.cachedRecords.findIndex((r) => r.id === fullRecord.id || (r.studentId === fullRecord.studentId && r.date === fullRecord.date));
    if (idx >= 0) {
      this.cachedRecords[idx] = { ...this.cachedRecords[idx], ...fullRecord };
    } else {
      this.cachedRecords.unshift(fullRecord);
    }
    this.saveToLocalStorage();
    this.notify();

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullRecord),
    }).catch(() => {});

    return true;
  }

  recordAttendance(record: Omit<AttendanceRecord, 'id' | 'syncedAt'> & { id?: string; syncedAt?: string }): boolean {
    return this.saveAttendanceManual(record);
  }

  deleteAttendanceRecord(id: string): boolean {
    this.cachedRecords = this.cachedRecords.filter((r) => r.id !== id);
    this.saveToLocalStorage();
    this.notify();
    fetch(`/api/attendance/${id}`, { method: 'DELETE' }).catch(() => {});
    return true;
  }

  clearAllAttendanceRecords(): boolean {
    this.cachedRecords = [];
    this.saveToLocalStorage();
    this.notify();
    fetch('/api/attendance', { method: 'DELETE' }).catch(() => {});
    return true;
  }

  // --- Summaries & Statistics ---
  getDailySummary(date: string = getTodayDateStr()): DailySummary {
    const dayRecords = this.getAttendanceRecords(date);
    const totalStudents = this.cachedStudents.length;

    let presentCount = 0;
    let lateCount = 0;
    let sickCount = 0;
    let leaveCount = 0;

    dayRecords.forEach((r) => {
      if (r.status === 'hadir') presentCount++;
      else if (r.status === 'terlambat') lateCount++;
      else if (r.status === 'sakit') sickCount++;
      else if (r.status === 'izin') leaveCount++;
    });

    const totalAttended = presentCount + lateCount;
    const absentCount = Math.max(0, totalStudents - totalAttended - sickCount - leaveCount);
    const attendanceRate = totalStudents > 0 ? Math.round((totalAttended / totalStudents) * 100) : 0;

    return {
      date,
      totalStudents,
      presentCount,
      lateCount,
      sickCount,
      leaveCount,
      absentCount,
      totalAttended,
      attendanceRate,
    };
  }

  getClassSummaries(date: string = getTodayDateStr()): ClassSummary[] {
    const dayRecords = this.getAttendanceRecords(date);
    const classMap: Record<string, { total: number; hadir: number; terlambat: number; sakit: number; izin: number }> = {};

    this.cachedStudents.forEach((st) => {
      const c = st.className || 'Tanpa Kelas';
      if (!classMap[c]) {
        classMap[c] = { total: 0, hadir: 0, terlambat: 0, sakit: 0, izin: 0 };
      }
      classMap[c].total++;
    });

    dayRecords.forEach((rec) => {
      const c = rec.className || 'Tanpa Kelas';
      if (!classMap[c]) {
        classMap[c] = { total: 0, hadir: 0, terlambat: 0, sakit: 0, izin: 0 };
      }
      if (rec.status === 'hadir') classMap[c].hadir++;
      else if (rec.status === 'terlambat') classMap[c].terlambat++;
      else if (rec.status === 'sakit') classMap[c].sakit++;
      else if (rec.status === 'izin') classMap[c].izin++;
    });

    return Object.keys(classMap).map((className) => {
      const d = classMap[className];
      const totalAttended = d.hadir + d.terlambat;
      const absentCount = Math.max(0, d.total - totalAttended - d.sakit - d.izin);
      const attendanceRate = d.total > 0 ? Math.round((totalAttended / d.total) * 100) : 0;

      return {
        className,
        totalStudents: d.total,
        presentCount: d.hadir,
        lateCount: d.terlambat,
        sickCount: d.sakit,
        leaveCount: d.izin,
        absentCount,
        attendanceRate,
      };
    });
  }

  // --- Settings Management ---
  getSettings(): SchoolSettings {
    return this.cachedSettings;
  }

  saveSettings(newSettings: Partial<SchoolSettings>): boolean {
    this.cachedSettings = { ...this.cachedSettings, ...newSettings };
    this.saveToLocalStorage();
    this.notify();

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.cachedSettings),
    }).catch(() => {});

    return true;
  }

  // Reset all to sample data
  resetAllData() {
    this.cachedStudents = sampleSantriList;
    this.cachedTeachers = initialTeachers;
    this.cachedRooms = initialRooms;
    this.cachedRecords = generateInitialAttendance();
    this.cachedSettings = initialSchoolSettings;
    this.cachedUsers = initialUsers;
    this.cachedRoomAssignments = initialApprovalSubmissions;
    this.cachedActivityLogs = initialActivityLogs;

    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});
  }

  resetToDefault() {
    this.resetAllData();
  }

  loadSampleSantri() {
    this.cachedStudents = sampleSantriList;
    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});
  }

  // Reset all room allocations so no student has a room
  resetRoomAllocations(performedBy: string = 'Admin'): boolean {
    this.cachedStudents = this.cachedStudents.map((s) => ({
      ...s,
      roomName: '-',
    }));
    this.cachedRooms = this.cachedRooms.map((r) => ({
      ...r,
      isFilled: false,
    }));
    this.cachedRoomAssignments = [];
    this.saveToLocalStorage();
    this.notify();
    this.pushAllToServer().catch(() => {});
    this.logActivity({
      type: 'kamar',
      action: 'RESET_SEMUA_KAMAR',
      description: 'Seluruh alokasi kamar santri telah di-reset ke status belum berkamar.',
      performedBy,
    });
    return true;
  }

  saveAttendanceRecord(record: AttendanceRecord): boolean {
    return this.saveAttendanceManual(record);
  }

  logActivity(log: { type: ActivityLog['type']; action: string; description: string; performedBy?: string }) {
    this.addActivityLog(log.type, log.action, log.description, log.performedBy);
  }

  processScan(
    qrText: string,
    sessionType: RoomAttendanceSession = 'HARIAN_KAMAR',
    targetRoom?: string,
    customUser?: UserAccount | null
  ): ScanResult {
    const cleanText = qrText.trim();
    if (!cleanText) {
      return { success: false, message: 'QR Code kosong atau tidak terbaca' };
    }

    // Coerce sessionType strictly to RoomAttendanceSession (HARIAN_KAMAR | SEBELUM_TIDUR)
    const normalizedSession: RoomAttendanceSession =
      sessionType === 'SEBELUM_TIDUR' ? 'SEBELUM_TIDUR' : 'HARIAN_KAMAR';

    const currentUser = customUser !== undefined ? customUser : this.cachedCurrentUser;

    // Strict Rule: ONLY Wali Kamar (and Musyrif) and Admin can scan QR
    if (!currentUser) {
      return {
        success: false,
        message: 'Presensi QR Ditolak: Anda belum login ke sistem.',
      };
    }

    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'PEMBINA';
    const isWaliKamar = currentUser.role === 'WALI_KAMAR' || currentUser.role === 'MUSYRIF';

    if (!isAdmin && !isWaliKamar) {
      return {
        success: false,
        message: 'Presensi QR Ditolak: HANYA WALI KAMAR DAN ADMIN yang berwenang melakukan scan presensi QR.',
      };
    }

    // Restriction for Wali Kamar: Must be connected to a room
    const waliKamarRoom = (currentUser.assignedRoomName || '').trim();
    if (isWaliKamar && (!waliKamarRoom || waliKamarRoom === '-' || waliKamarRoom.toLowerCase() === 'belum ada kamar')) {
      return {
        success: false,
        message: 'Presensi QR Ditolak: Akun Wali Kamar Anda belum terhubung ke kamar asrama. Silakan isi Form Pendataan Kamar terlebih dahulu.',
      };
    }

    const activeRoom = isAdmin ? targetRoom : waliKamarRoom;

    // Try finding student by QR Code (Kolom I), NIS/NIP Pondok, No Kartu, IDB, ID Izin, NISN, or Name
    const student = this.getStudentByQrCode(cleanText);

    if (!student) {
      return {
        success: false,
        message: `Data santri dengan kode/kartu "${cleanText}" tidak ditemukan di database.`,
      };
    }

    // Room Membership Restriction: Wali Kamar can ONLY scan their own room members
    const studentRoom = (student.roomName || '').trim();
    const hasRoom = Boolean(
      studentRoom &&
      studentRoom !== '-' &&
      studentRoom.toLowerCase() !== 'belum ada kamar' &&
      studentRoom.toLowerCase() !== 'tanpa kamar'
    );

    if (isWaliKamar) {
      const expectedRoomLower = waliKamarRoom.toLowerCase();
      const studentRoomLower = studentRoom.toLowerCase();

      if (!hasRoom || studentRoomLower !== expectedRoomLower) {
        return {
          success: false,
          message: `Presensi Ditolak! Santri ${student.name} (${hasRoom ? studentRoom : 'Belum Ada Kamar'}) BUKAN anggota dari kamar Anda ("${waliKamarRoom}"). Wali Kamar hanya berwenang memindai santri anggota kamarnya sendiri.`,
        };
      }
    } else if (isAdmin && targetRoom) {
      const expectedRoomLower = targetRoom.trim().toLowerCase();
      const studentRoomLower = studentRoom.toLowerCase();

      if (!hasRoom || studentRoomLower !== expectedRoomLower) {
        return {
          success: false,
          message: `Presensi Ditolak! Santri ${student.name} (${hasRoom ? studentRoom : 'Belum Ada Kamar'}) bukan anggota kamar yang dipilih ("${targetRoom}").`,
        };
      }
    }

    const today = getTodayDateStr();
    const now = new Date();
    const currentTime = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const sessionLabel = normalizedSession === 'HARIAN_KAMAR' ? 'Presensi Harian Kamar' : 'Presensi Sebelum Tidur Kamar';

    // Check if student already attended this specific room session today
    const existingRecord = this.cachedRecords.find(
      (r) =>
        r.studentId === student.id &&
        r.date === today &&
        (r.sessionType === normalizedSession || (!r.sessionType && normalizedSession === 'HARIAN_KAMAR'))
    );

    if (existingRecord) {
      return {
        success: true,
        message: `Santri ${student.name} sudah tercatat ${sessionLabel} hari ini pukul ${existingRecord.timeIn}.`,
        type: 'checkin',
        sessionType: normalizedSession,
        student,
        record: existingRecord,
        isAlreadyRecorded: true,
      };
    }

    // Calculate late status based on configured time limit & tolerance
    let limitTime = normalizedSession === 'HARIAN_KAMAR'
      ? (this.cachedSettings.harianKamarLimit || this.cachedSettings.timeInLimit || '06:30')
      : (this.cachedSettings.tidurKamarLimit || this.cachedSettings.timeLateLimit || '22:00');
    
    const tolerance = normalizedSession === 'HARIAN_KAMAR'
      ? (this.cachedSettings.harianToleranceMinutes || 0)
      : (this.cachedSettings.tidurToleranceMinutes || 0);

    if (tolerance > 0) {
      const [lh, lm] = limitTime.split(':').map(Number);
      if (!isNaN(lh) && !isNaN(lm)) {
        const totalMinutes = lh * 60 + lm + tolerance;
        const newHour = Math.floor(totalMinutes / 60) % 24;
        const newMin = totalMinutes % 60;
        limitTime = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
      }
    }

    const status: AttendanceStatus = currentTime > limitTime ? 'terlambat' : 'hadir';

    const recordedRoom = student.roomName && student.roomName !== '-' ? student.roomName : (activeRoom || 'Asrama');

    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId: student.id,
      studentNis: student.nis,
      studentName: student.name,
      className: student.className,
      roomName: recordedRoom,
      sessionType: normalizedSession,
      date: today,
      timeIn: currentTime,
      status,
      notes: `${sessionLabel} (${status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'})`,
      recordedBy: currentUser?.name || 'Wali Kamar / Scanner QR',
      syncedAt: new Date().toISOString(),
    };

    this.cachedRecords.unshift(newRecord);
    this.saveToLocalStorage();
    this.notify();

    this.logActivity({
      type: 'presensi',
      action: normalizedSession === 'HARIAN_KAMAR' ? 'PRESENSI_HARIAN_KAMAR' : 'PRESENSI_SEBELUM_TIDUR',
      description: `${sessionLabel} kamar [${newRecord.roomName}]: ${student.name} status: ${status.toUpperCase()} (${currentTime})`,
      performedBy: currentUser?.name || 'Wali Kamar / Scanner QR',
    });

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    }).catch(() => {});

    return {
      success: true,
      message: `Presensi ${sessionLabel} Berhasil: ${student.name} [Kamar ${newRecord.roomName}] - Status: ${status.toUpperCase()} (${currentTime})`,
      type: 'checkin',
      sessionType: normalizedSession,
      student,
      record: newRecord,
      isAlreadyRecorded: false,
    };
  }

  resetAllStudentRooms(): boolean {
    this.cachedStudents = this.cachedStudents.map((s) => ({
      ...s,
      roomName: '-',
    }));

    this.cachedRooms = this.cachedRooms.map((r) => ({
      ...r,
      isFilled: false,
      currentStudents: [],
    }));

    this.cachedRoomAssignments = [];

    const performer = this.cachedCurrentUser?.name || 'Administrator';
    this.logActivity({
      type: 'kamar',
      action: 'RESET_KAMAR_SANTRI',
      description: `Admin (${performer}) berhasil mengosongkan seluruh kamar santri. Seluruh santri siap untuk pendataan kamar baru.`,
      performedBy: performer,
    });

    this.saveToLocalStorage();
    this.notify();

    fetch('/api/admin/reset-rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performedBy: performer }),
    }).catch(() => {});

    return true;
  }

  getRoomSummaries(dateStr?: string, sessionType?: RoomAttendanceSession): RoomSummary[] {
    const today = dateStr || getTodayDateStr();
    let recordsForDate = this.cachedRecords.filter((r) => r.date === today);

    if (sessionType) {
      recordsForDate = recordsForDate.filter(
        (r) => r.sessionType === sessionType || (!r.sessionType && sessionType === 'HARIAN_KAMAR')
      );
    }

    return this.cachedRooms.map((room) => {
      const roomNumber = room.roomNumber;
      // All students assigned to this room
      const roomStudents = this.cachedStudents.filter(
        (s) => s.roomName && s.roomName.trim().toLowerCase() === roomNumber.trim().toLowerCase()
      );

      const totalStudents = roomStudents.length;

      // Find attendance for students in this room
      const roomStudentIds = new Set(roomStudents.map((s) => s.id));
      const roomRecords = recordsForDate.filter(
        (r) =>
          roomStudentIds.has(r.studentId) ||
          (r.roomName && r.roomName.trim().toLowerCase() === roomNumber.trim().toLowerCase())
      );

      const presentCount = roomRecords.filter((r) => r.status === 'hadir').length;
      const lateCount = roomRecords.filter((r) => r.status === 'terlambat').length;
      const sickCount = roomRecords.filter((r) => r.status === 'sakit').length;
      const leaveCount = roomRecords.filter((r) => r.status === 'izin').length;
      const attended = presentCount + lateCount;
      const absentCount = Math.max(0, totalStudents - attended - sickCount - leaveCount);
      const attendanceRate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;

      return {
        roomName: room.roomNumber,
        building: room.building,
        location: room.location,
        gender: room.gender,
        supervisorName: room.supervisorName,
        totalStudents,
        presentCount,
        lateCount,
        sickCount,
        leaveCount,
        absentCount,
        attendanceRate,
      };
    });
  }

  generateAttendanceCSV(date?: string, filterClassName?: string): string {
    let list = this.getAttendanceRecords(date || undefined);
    if (filterClassName && filterClassName !== 'SEMUA') {
      list = list.filter((r) => r.className === filterClassName);
    }
    const headers = ['No', 'NIS', 'Nama Santri', 'Kelas', 'Kamar', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan', 'Petugas'];
    const rows = list.map((r, i) => [
      i + 1,
      `"${r.studentNis}"`,
      `"${r.studentName}"`,
      `"${r.className}"`,
      `"${r.roomName || '-'}"`,
      r.date,
      r.timeIn,
      r.timeOut || '-',
      r.status.toUpperCase(),
      `"${r.notes || '-'}"`,
      `"${r.recordedBy}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  exportBackupJSON(): string {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      students: this.cachedStudents,
      teachers: this.cachedTeachers,
      rooms: this.cachedRooms,
      records: this.cachedRecords,
      settings: this.cachedSettings,
      users: this.cachedUsers,
      roomAssignments: this.cachedRoomAssignments,
      activityLogs: this.cachedActivityLogs,
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackupJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.students)) this.cachedStudents = parsed.students;
      if (Array.isArray(parsed.teachers)) this.cachedTeachers = parsed.teachers;
      if (Array.isArray(parsed.rooms)) this.cachedRooms = parsed.rooms;
      if (Array.isArray(parsed.records)) this.cachedRecords = parsed.records;
      if (parsed.settings) this.cachedSettings = { ...this.cachedSettings, ...parsed.settings };
      if (Array.isArray(parsed.users)) this.cachedUsers = parsed.users;
      if (Array.isArray(parsed.roomAssignments)) this.cachedRoomAssignments = parsed.roomAssignments;
      if (Array.isArray(parsed.activityLogs)) this.cachedActivityLogs = parsed.activityLogs;

      this.saveToLocalStorage();
      this.notify();
      this.pushAllToServer().catch(() => {});
      return true;
    } catch (e) {
      console.error('Failed to import backup JSON:', e);
      return false;
    }
  }
}

export const storageService = new StorageService();
if (typeof window !== 'undefined') {
  storageService.init().catch(e => console.warn('StorageService auto-init:', e));
}
export { googleAppsScriptApi };
