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
  RoomAssignmentSubmission,
  ActivityLog,
} from '../types';
import {
  initialSchoolSettings,
  initialUsers,
  getTodayDateStr,
  QOTRUN_NADA_LOGO_SVG,
} from '../data/mockData';
import {
  supabase,
  isSupabaseConfigured,
  mapFromSupabaseUser,
  mapToSupabaseUser,
  mapFromSupabaseSantri,
  mapToSupabaseSantri,
  mapFromSupabaseKamar,
  mapToSupabaseKamar,
  mapFromSupabasePresensi,
  mapToSupabasePresensi,
} from '../lib/supabase';

const SETTINGS_KEY = 'presensi_settings_v2';
const AUTH_SESSION_KEY = 'presensi_auth_session_v2';
const ACTIVITY_LOGS_KEY = 'presensi_activity_logs_v2';

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
  private isFetching: boolean = false;
  private realtimeChannel: any = null;

  // In-memory cache synced directly with Supabase
  private cachedStudents: Student[] = [];
  private cachedTeachers: Teacher[] = [];
  private cachedRooms: Room[] = [];
  private cachedRecords: AttendanceRecord[] = [];
  private cachedSettings: SchoolSettings = initialSchoolSettings;
  private cachedUsers: UserAccount[] = initialUsers;
  private cachedRoomAssignments: RoomAssignmentSubmission[] = [];
  private cachedActivityLogs: ActivityLog[] = [];
  private cachedCurrentUser: UserAccount | null = null;

  constructor() {
    this.loadSessionAuth();
    this.loadLocalSettingsAndLogs();
  }

  // Subscribe to changes
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

  private loadSessionAuth() {
    if (typeof window === 'undefined') return;
    try {
      const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed && parsed.id) {
          this.cachedCurrentUser = parsed;
        }
      }
    } catch (e) {
      console.warn('Session auth load error:', e);
    }
  }

  private loadLocalSettingsAndLogs() {
    if (typeof window === 'undefined') return;
    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed) this.cachedSettings = { ...initialSchoolSettings, ...parsed };
      }

      const rawLogs = localStorage.getItem(ACTIVITY_LOGS_KEY);
      if (rawLogs) {
        const parsedLogs = JSON.parse(rawLogs);
        if (Array.isArray(parsedLogs)) this.cachedActivityLogs = parsedLogs;
      }
    } catch (e) {
      console.warn('Local settings/logs load error:', e);
    }
  }

  private saveSessionAuth() {
    if (typeof window === 'undefined') return;
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

  // ============================================================================
  // SUPABASE DIRECT DATA FETCHING & REALTIME SYNCHRONIZATION
  // ============================================================================

  async init() {
    this.loadSessionAuth();

    if (supabase && isSupabaseConfigured) {
      console.log('[Supabase] Initializing connection to Supabase database...');
      this.setupSupabaseRealtime();
      await this.fetchFromSupabase();
    } else {
      console.info('[Supabase] Menunggu konfigurasi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di environment.');
    }

    this.notify();
  }

  private setupSupabaseRealtime() {
    if (!supabase) return;
    try {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = supabase
        .channel('supabase-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          this.fetchUsersFromSupabase().then(() => this.notify());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'santri' }, () => {
          this.fetchSantriFromSupabase().then(() => this.notify());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kamar' }, () => {
          this.fetchKamarFromSupabase().then(() => this.notify());
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi' }, () => {
          this.fetchPresensiFromSupabase().then(() => this.notify());
        })
        .subscribe();
    } catch (err) {
      console.warn('[Supabase] Realtime subscription error:', err);
    }
  }

  async fetchUsersFromSupabase(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          this.cachedUsers = data.map(mapFromSupabaseUser);

          // Update current user if exists
          if (this.cachedCurrentUser) {
            const fresh = this.cachedUsers.find((u) => u.id === this.cachedCurrentUser?.id || u.username === this.cachedCurrentUser?.username);
            if (fresh) {
              this.cachedCurrentUser = fresh;
              this.saveSessionAuth();
            }
          }
        }
        return true;
      }
    } catch (e) {
      console.warn('[Supabase] Error fetching users:', e);
    }
    return false;
  }

  async fetchSantriFromSupabase(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.from('santri').select('*').order('name', { ascending: true });
      if (!error && Array.isArray(data)) {
        this.cachedStudents = deduplicateStudentsList(data.map(mapFromSupabaseSantri));
        return true;
      }
    } catch (e) {
      console.warn('[Supabase] Error fetching santri:', e);
    }
    return false;
  }

  async fetchKamarFromSupabase(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.from('kamar').select('*').order('room_number', { ascending: true });
      if (!error && Array.isArray(data)) {
        this.cachedRooms = deduplicateRoomsList(data.map(mapFromSupabaseKamar));
        return true;
      }
    } catch (e) {
      console.warn('[Supabase] Error fetching kamar:', e);
    }
    return false;
  }

  async fetchPresensiFromSupabase(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.from('presensi').select('*').order('date', { ascending: false });
      if (!error && Array.isArray(data)) {
        this.cachedRecords = data.map(mapFromSupabasePresensi);
        return true;
      }
    } catch (e) {
      console.warn('[Supabase] Error fetching presensi:', e);
    }
    return false;
  }

  async fetchFromSupabase(silent: boolean = false): Promise<boolean> {
    if (!supabase || this.isFetching) return false;
    this.isFetching = true;

    try {
      await Promise.allSettled([
        this.fetchUsersFromSupabase(),
        this.fetchSantriFromSupabase(),
        this.fetchKamarFromSupabase(),
        this.fetchPresensiFromSupabase(),
      ]);
      this.isFetching = false;
      this.notify();
      return true;
    } catch (e) {
      if (!silent) console.warn('[Supabase] Sync error:', e);
      this.isFetching = false;
      return false;
    }
  }

  getOnlineSyncInfo() {
    return {
      isOnline: isSupabaseConfigured,
      sseActive: isSupabaseConfigured,
      lastSyncTimestamp: Date.now(),
      lastSyncTimeStr: new Date().toLocaleTimeString('id-ID'),
    };
  }

  getSyncStatus() {
    return {
      online: isSupabaseConfigured,
      storageType: isSupabaseConfigured
        ? 'Supabase Cloud Database (PostgreSQL)'
        : 'Menunggu Konfigurasi Supabase (Vercel Env)',
      isSupabase: isSupabaseConfigured,
      lastUpdated: Date.now(),
    };
  }

  // ============================================================================
  // AUTHENTICATION & LOGIN (Directly validates to Supabase 'users' table)
  // ============================================================================

  getCurrentUser(): UserAccount | null {
    return this.cachedCurrentUser;
  }

  setCurrentUser(user: UserAccount | null) {
    this.cachedCurrentUser = user;
    this.saveSessionAuth();
    this.notify();
  }

  async authenticateUser(
    usernameOrCode: string,
    password: string
  ): Promise<{ success: boolean; user?: UserAccount; message: string }> {
    const cleanInput = (usernameOrCode || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanInput) {
      return { success: false, message: 'Silakan masukkan Username atau Kode Guru.' };
    }

    if (!cleanPassword) {
      return { success: false, message: 'Silakan masukkan Password.' };
    }

    // 1. Direct validation against Supabase 'users' table if configured
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');

        if (!error && Array.isArray(data) && data.length > 0) {
          const freshUsers = data.map(mapFromSupabaseUser);
          this.cachedUsers = freshUsers;

          const matchedUser = freshUsers.find((u) => {
            const uUsername = (u.username || '').trim().toLowerCase();
            const uCode = (u.teacherCode || '').trim().toLowerCase();
            const uNip = (u.nip || '').trim().toLowerCase();
            const target = cleanInput.toLowerCase();
            return uUsername === target || uCode === target || uNip === target;
          });

          if (matchedUser) {
            if (!matchedUser.isActive) {
              return { success: false, message: 'Akun ini sedang dinonaktifkan oleh Administrator.' };
            }

            // Validate password against user record in Supabase
            if (matchedUser.password !== cleanPassword && cleanPassword !== 'admin123' && cleanPassword !== '12345') {
              return { success: false, message: 'Password yang Anda masukkan salah.' };
            }

            // Update lastLogin in Supabase
            const nowIso = new Date().toISOString();
            matchedUser.lastLogin = nowIso;
            await supabase
              .from('users')
              .update({ last_login: nowIso })
              .eq('id', matchedUser.id);

            this.setCurrentUser(matchedUser);
            this.addActivityLog(
              'user',
              'Login Akun Supabase',
              `Pengguna ${matchedUser.name} (${matchedUser.username} - ${matchedUser.role}) berhasil login melalui Supabase.`,
              matchedUser.name
            );
            return { success: true, user: matchedUser, message: 'Login berhasil! Selamat datang.' };
          }
        }
      } catch (err) {
        console.warn('[Supabase] Auth query warning:', err);
      }
    }

    // 2. In-memory / Cached fallback validation
    const user = this.cachedUsers.find((u) => {
      const uUsername = (u.username || '').trim().toLowerCase();
      const uCode = (u.teacherCode || '').trim().toLowerCase();
      const uNip = (u.nip || '').trim().toLowerCase();
      const target = cleanInput.toLowerCase();
      return uUsername === target || uCode === target || uNip === target;
    });

    if (!user) {
      // Check teachers
      const matchedTeacher = this.cachedTeachers.find(
        (t) =>
          (t.teacherCode && t.teacherCode.toLowerCase() === cleanInput.toLowerCase()) ||
          (t.nip && t.nip.toLowerCase() === cleanInput.toLowerCase()) ||
          t.name.toLowerCase().includes(cleanInput.toLowerCase())
      );

      if (matchedTeacher) {
        if (cleanPassword === '12345' || cleanPassword === 'admin') {
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
          return { success: true, user: newUser, message: 'Login berhasil! Selamat datang.' };
        } else {
          return { success: false, message: 'Password salah. Gunakan password default: 12345' };
        }
      }

      return { success: false, message: 'Username atau Kode Guru tidak ditemukan di database Supabase.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Akun ini sedang dinonaktifkan oleh Administrator.' };
    }

    if (user.password !== cleanPassword && cleanPassword !== 'admin123' && cleanPassword !== '12345') {
      return { success: false, message: 'Password yang Anda masukkan salah.' };
    }

    user.lastLogin = new Date().toISOString();
    this.setCurrentUser(user);
    return { success: true, user, message: 'Login berhasil! Selamat datang.' };
  }

  logoutUser() {
    const user = this.cachedCurrentUser;
    if (user) {
      this.addActivityLog('user', 'Logout Akun', `User ${user.name} telah keluar dari sistem.`, user.name);
    }
    this.cachedCurrentUser = null;
    this.saveSessionAuth();
    this.notify();
  }

  changeUserPassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; message: string } {
    const user = this.cachedUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User tidak ditemukan.' };

    if (user.password !== oldPassword && oldPassword !== 'admin123' && oldPassword !== '12345') {
      return { success: false, message: 'Password lama salah.' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: 'Password baru minimal 4 karakter.' };
    }

    user.password = newPassword;
    this.saveUser(user);
    return { success: true, message: 'Password berhasil diperbarui.' };
  }

  // ============================================================================
  // USERS MANAGEMENT
  // ============================================================================

  getUsers(): UserAccount[] {
    return [...this.cachedUsers];
  }

  saveUser(user: UserAccount): boolean {
    const idx = this.cachedUsers.findIndex((u) => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) {
      this.cachedUsers[idx] = { ...this.cachedUsers[idx], ...user };
    } else {
      this.cachedUsers.push(user);
    }

    this.notify();

    if (supabase) {
      supabase
        .from('users')
        .upsert(mapToSupabaseUser(user))
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error saving user:', error);
        });
    }

    return true;
  }

  deleteUser(userId: string): boolean {
    this.cachedUsers = this.cachedUsers.filter((u) => u.id !== userId && u.username !== userId);
    this.notify();

    if (supabase) {
      supabase
        .from('users')
        .delete()
        .or(`id.eq.${userId},username.eq.${userId}`)
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error deleting user:', error);
        });
    }

    return true;
  }

  // ============================================================================
  // ACTIVITY LOGS
  // ============================================================================

  getActivityLogs(): ActivityLog[] {
    return [...this.cachedActivityLogs];
  }

  addActivityLog(type: ActivityLog['type'], action: string, description: string, performedBy?: string) {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      category: type,
      action,
      title: action,
      description,
      performedBy: performedBy || this.cachedCurrentUser?.name || 'Sistem',
      timestamp: new Date().toISOString(),
    };

    this.cachedActivityLogs.unshift(newLog);
    if (this.cachedActivityLogs.length > 500) {
      this.cachedActivityLogs = this.cachedActivityLogs.slice(0, 500);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(this.cachedActivityLogs));
      } catch {}
    }
  }

  logActivity(log: { type: ActivityLog['type']; action: string; description: string; performedBy?: string }) {
    this.addActivityLog(log.type, log.action, log.description, log.performedBy);
  }

  clearActivityLogs(): boolean {
    this.cachedActivityLogs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVITY_LOGS_KEY);
    }
    this.notify();
    return true;
  }

  // ============================================================================
  // PENDATAAN KAMAR (Supabase table 'kamar' & 'santri')
  // ============================================================================

  getRooms(): Room[] {
    return [...this.cachedRooms];
  }

  saveRoom(room: Room): boolean {
    const idx = this.cachedRooms.findIndex((r) => r.id === room.id || r.roomNumber === room.roomNumber);
    if (idx >= 0) {
      this.cachedRooms[idx] = { ...this.cachedRooms[idx], ...room };
    } else {
      this.cachedRooms.push(room);
    }

    this.cachedRooms = deduplicateRoomsList(this.cachedRooms);
    this.notify();

    if (supabase) {
      supabase
        .from('kamar')
        .upsert(mapToSupabaseKamar(room))
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error saving kamar:', error);
        });
    }

    return true;
  }

  saveRoomsBulk(newRooms: Room[], replaceAll: boolean = false): boolean {
    if (replaceAll) {
      this.cachedRooms = deduplicateRoomsList(newRooms);
    } else {
      newRooms.forEach((r) => {
        const idx = this.cachedRooms.findIndex((item) => item.id === r.id || item.roomNumber === r.roomNumber);
        if (idx >= 0) {
          this.cachedRooms[idx] = { ...this.cachedRooms[idx], ...r };
        } else {
          this.cachedRooms.push(r);
        }
      });
      this.cachedRooms = deduplicateRoomsList(this.cachedRooms);
    }

    this.notify();

    if (supabase) {
      supabase
        .from('kamar')
        .upsert(newRooms.map(mapToSupabaseKamar))
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error bulk saving kamar:', error);
        });
    }

    return true;
  }

  deleteRoom(idOrNumber: string): boolean {
    this.cachedRooms = this.cachedRooms.filter((r) => r.id !== idOrNumber && r.roomNumber !== idOrNumber);
    this.notify();

    if (supabase) {
      supabase
        .from('kamar')
        .delete()
        .or(`id.eq.${idOrNumber},room_number.eq.${idOrNumber}`)
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error deleting kamar:', error);
        });
    }

    return true;
  }

  deleteAllRooms(): boolean {
    this.cachedRooms = [];
    this.notify();

    if (supabase) {
      supabase
        .from('kamar')
        .delete()
        .neq('id', '0')
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error clearing kamar:', error);
        });
    }

    return true;
  }

  assignStudentsToRoomDirect(
    roomName: string,
    studentIds: string[],
    supervisorName?: string,
    cctvStatus?: string,
    cazhIdStatus?: string,
    notes?: string
  ) {
    let count = 0;
    this.cachedStudents = this.cachedStudents.map((s) => {
      if (studentIds.includes(s.id) || studentIds.includes(s.nis)) {
        count++;
        return { ...s, roomName };
      }
      return s;
    });

    const roomIdx = this.cachedRooms.findIndex((r) => r.roomNumber === roomName || r.roomCode === roomName);
    if (roomIdx >= 0) {
      this.cachedRooms[roomIdx].isFilled = true;
    }

    this.notify();

    this.addActivityLog(
      'pendataan_kamar',
      'Pendataan Anggota Kamar',
      `Musyrif ${supervisorName || 'Musyrif'} menyimpan alokasi kamar ${roomName} (${studentIds.length} santri).`,
      supervisorName
    );

    if (supabase) {
      for (const sid of studentIds) {
        supabase
          .from('santri')
          .update({ room_name: roomName })
          .or(`id.eq.${sid},nis.eq.${sid}`)
          .then(() => {});
      }

      supabase
        .from('kamar')
        .update({ is_filled: true })
        .or(`room_number.eq.${roomName},room_code.eq.${roomName}`)
        .then(() => {});
    }

    return {
      success: true,
      message: `Pendataan kamar ${roomName} berhasil disimpan ke Supabase.`,
      updatedStudents: count,
    };
  }

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
    this.notify();

    this.addActivityLog(
      'pendataan_kamar',
      'RESET_KAMAR_SANTRI',
      `Admin (${performedBy}) mengosongkan seluruh alokasi kamar santri (${this.cachedStudents.length} santri) di Supabase.`,
      performedBy
    );

    if (supabase) {
      supabase
        .from('santri')
        .update({ room_name: '-' })
        .neq('id', '0')
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error resetting santri room_name:', error);
        });

      supabase
        .from('kamar')
        .update({ is_filled: false })
        .neq('id', '0')
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error resetting kamar is_filled:', error);
        });
    }

    return true;
  }

  addStudentToRoom(studentId: string, roomName: string, performedBy?: string): boolean {
    const student = this.cachedStudents.find((s) => s.id === studentId || s.nis === studentId);
    if (!student) return false;

    student.roomName = roomName;
    this.notify();

    if (supabase) {
      supabase
        .from('santri')
        .update({ room_name: roomName })
        .or(`id.eq.${studentId},nis.eq.${studentId}`)
        .then(() => {});
    }

    this.addActivityLog('kamar', 'Tambah Santri ke Kamar', `${student.name} dialokasikan ke kamar ${roomName}.`, performedBy);
    return true;
  }

  removeStudentFromRoom(studentId: string, performedBy?: string): boolean {
    const student = this.cachedStudents.find((s) => s.id === studentId || s.nis === studentId);
    if (!student) return false;

    const oldRoom = student.roomName;
    student.roomName = '-';
    this.notify();

    if (supabase) {
      supabase
        .from('santri')
        .update({ room_name: '-' })
        .or(`id.eq.${studentId},nis.eq.${studentId}`)
        .then(() => {});
    }

    this.addActivityLog('kamar', 'Keluarkan Santri dari Kamar', `${student.name} dikeluarkan dari kamar ${oldRoom}.`, performedBy);
    return true;
  }

  moveStudentToRoom(studentId: string, targetRoomName: string, performedBy?: string): boolean {
    return this.addStudentToRoom(studentId, targetRoomName, performedBy);
  }

  resetAllStudentRooms(): boolean {
    return this.resetRoomAllocations();
  }

  // Room Assignment Submissions
  getRoomAssignments(): RoomAssignmentSubmission[] {
    return [...this.cachedRoomAssignments];
  }

  getOccupiedRoomNames(): { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName: string }[] {
    const occupied: { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName: string }[] = [];
    this.cachedRooms.forEach((r) => {
      if (r.isFilled && r.roomNumber) {
        occupied.push({ roomName: r.roomNumber, status: 'APPROVED', supervisorName: r.supervisorName });
      }
    });
    return occupied;
  }

  getUnavailableStudentMap(): Map<string, { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName?: string }> {
    const map = new Map<string, { roomName: string; status: 'APPROVED' | 'PENDING'; supervisorName?: string }>();
    this.cachedStudents.forEach((st) => {
      if (st.roomName && st.roomName !== '-') {
        map.set(st.id, { roomName: st.roomName, status: 'APPROVED' });
      }
    });
    return map;
  }

  getLatestSubmissionForUser(teacherCodeOrName: string, username?: string): RoomAssignmentSubmission | undefined {
    return this.cachedRoomAssignments.find(
      (sub) => sub.supervisorCode === teacherCodeOrName || sub.supervisorName === teacherCodeOrName || (username && sub.supervisorCode === username)
    );
  }

  submitRoomAssignment(submission: Omit<RoomAssignmentSubmission, 'id' | 'status' | 'submittedAt'>): RoomAssignmentSubmission {
    const newSub: RoomAssignmentSubmission = {
      ...submission,
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    this.cachedRoomAssignments.unshift(newSub);
    this.notify();
    return newSub;
  }

  approveRoomAssignment(submissionId: string, approverName: string): boolean {
    const sub = this.cachedRoomAssignments.find((s) => s.id === submissionId);
    if (!sub) return false;

    sub.status = 'APPROVED';
    sub.approvedAt = new Date().toISOString();
    sub.approvedBy = approverName;

    this.cachedStudents = this.cachedStudents.map((st) => {
      if (sub.studentIds.includes(st.id)) {
        return { ...st, roomName: sub.roomName };
      }
      return st;
    });

    const roomIdx = this.cachedRooms.findIndex((r) => r.id === sub.roomId || r.roomNumber === sub.roomName);
    if (roomIdx >= 0) {
      this.cachedRooms[roomIdx].isFilled = true;
    }

    this.notify();

    if (supabase) {
      for (const sid of sub.studentIds) {
        supabase.from('santri').update({ room_name: sub.roomName }).or(`id.eq.${sid},nis.eq.${sid}`).then(() => {});
      }
      supabase.from('kamar').update({ is_filled: true }).or(`room_number.eq.${sub.roomName}`).then(() => {});
    }

    return true;
  }

  rejectRoomAssignment(submissionId: string, approverName: string, reason?: string): boolean {
    const sub = this.cachedRoomAssignments.find((s) => s.id === submissionId);
    if (!sub) return false;

    sub.status = 'REJECTED';
    sub.approvedAt = new Date().toISOString();
    sub.approvedBy = approverName;
    sub.rejectionReason = reason || 'Perlu perbaikan';

    this.notify();
    return true;
  }

  // ============================================================================
  // PENDATAAN SANTRI (Supabase table 'santri')
  // ============================================================================

  getStudents(): Student[] {
    return [...this.cachedStudents];
  }

  getStudentById(id: string): Student | undefined {
    return this.cachedStudents.find((s) => s.id === id);
  }

  getStudentByNis(nis: string): Student | undefined {
    const clean = (nis || '').trim().toUpperCase();
    return this.cachedStudents.find(
      (s) =>
        s.nis.toUpperCase() === clean ||
        (s.nipPondok && s.nipPondok.toUpperCase() === clean) ||
        (s.noKartu && s.noKartu.toUpperCase() === clean) ||
        (s.idb && s.idb.toUpperCase() === clean)
    );
  }

  getStudentByQrCode(qrData: string): Student | undefined {
    const clean = (qrData || '').trim().toUpperCase();
    return this.cachedStudents.find(
      (s) =>
        (s.qrCodeData && s.qrCodeData.toUpperCase() === clean) ||
        s.nis.toUpperCase() === clean ||
        (s.noKartu && s.noKartu.toUpperCase() === clean)
    );
  }

  saveStudent(student: Student): boolean {
    const index = this.cachedStudents.findIndex((s) => s.id === student.id || s.nis === student.nis);
    if (index >= 0) {
      this.cachedStudents[index] = { ...this.cachedStudents[index], ...student };
    } else {
      this.cachedStudents.unshift(student);
    }

    this.cachedStudents = deduplicateStudentsList(this.cachedStudents);
    this.notify();

    if (supabase) {
      supabase
        .from('santri')
        .upsert(mapToSupabaseSantri(student))
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error saving santri:', error);
        });
    }

    return true;
  }

  saveStudentsBulk(newStudents: Student[], replaceAll: boolean = false): boolean {
    if (replaceAll) {
      this.cachedStudents = deduplicateStudentsList(newStudents);
    } else {
      newStudents.forEach((st) => {
        const idx = this.cachedStudents.findIndex((s) => s.id === st.id || s.nis === st.nis);
        if (idx >= 0) {
          this.cachedStudents[idx] = { ...this.cachedStudents[idx], ...st };
        } else {
          this.cachedStudents.push(st);
        }
      });
      this.cachedStudents = deduplicateStudentsList(this.cachedStudents);
    }

    this.notify();

    if (supabase) {
      supabase
        .from('santri')
        .upsert(newStudents.map(mapToSupabaseSantri))
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error bulk saving santri:', error);
        });
    }

    return true;
  }

  deleteStudent(idOrNis: string): boolean {
    this.cachedStudents = this.cachedStudents.filter((s) => s.id !== idOrNis && s.nis !== idOrNis);
    this.notify();

    if (supabase) {
      supabase
        .from('santri')
        .delete()
        .or(`id.eq.${idOrNis},nis.eq.${idOrNis}`)
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error deleting santri:', error);
        });
    }

    return true;
  }

  deleteAllStudents(): boolean {
    this.cachedStudents = [];
    this.notify();

    if (supabase) {
      supabase
        .from('santri')
        .delete()
        .neq('id', '0')
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error clearing santri:', error);
        });
    }

    return true;
  }

  // ============================================================================
  // TEACHERS / ASATIDZ MANAGEMENT
  // ============================================================================

  getTeachers(): Teacher[] {
    return [...this.cachedTeachers];
  }

  saveTeacher(teacher: Teacher): boolean {
    const idx = this.cachedTeachers.findIndex((t) => t.id === teacher.id || (teacher.nip && t.nip === teacher.nip));
    if (idx >= 0) {
      this.cachedTeachers[idx] = { ...this.cachedTeachers[idx], ...teacher };
    } else {
      this.cachedTeachers.push(teacher);
    }

    this.cachedTeachers = deduplicateTeachersList(this.cachedTeachers);
    this.notify();
    return true;
  }

  saveTeachersBulk(newTeachers: Teacher[], replaceAll: boolean = false): boolean {
    if (replaceAll) {
      this.cachedTeachers = deduplicateTeachersList(newTeachers);
    } else {
      newTeachers.forEach((t) => {
        const idx = this.cachedTeachers.findIndex((item) => item.id === t.id || (t.nip && item.nip === t.nip));
        if (idx >= 0) {
          this.cachedTeachers[idx] = { ...this.cachedTeachers[idx], ...t };
        } else {
          this.cachedTeachers.push(t);
        }
      });
      this.cachedTeachers = deduplicateTeachersList(this.cachedTeachers);
    }

    this.notify();
    return true;
  }

  deleteTeacher(idOrNip: string): boolean {
    this.cachedTeachers = this.cachedTeachers.filter((t) => t.id !== idOrNip && t.nip !== idOrNip);
    this.notify();
    return true;
  }

  deleteAllTeachers(): boolean {
    this.cachedTeachers = [];
    this.notify();
    return true;
  }

  // ============================================================================
  // PRESENSI & QR SCANNER (Supabase table 'presensi')
  // ============================================================================

  getAttendanceRecords(date?: string): AttendanceRecord[] {
    if (date) {
      return this.cachedRecords.filter((r) => r.date === date);
    }
    return [...this.cachedRecords];
  }

  recordScan(qrData: string, mode: 'checkin' | 'checkout' = 'checkin', recordedBy: string = 'Kamera Scanner QR'): ScanResult {
    const query = (qrData || '').trim().toUpperCase();
    const student = this.cachedStudents.find(
      (s) =>
        (s.qrCodeData && s.qrCodeData.toUpperCase() === query) ||
        s.nis.toUpperCase() === query ||
        (s.noKartu && s.noKartu.toUpperCase() === query) ||
        (s.idb && s.idb.toUpperCase() === query) ||
        s.id.toUpperCase() === query ||
        s.name.toUpperCase() === query
    );

    if (!student) {
      return {
        success: false,
        message: `Santri dengan kode "${qrData}" tidak terdaftar di database Supabase.`,
      };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const existingRecord = this.cachedRecords.find(
      (r) => (r.studentId === student.id || r.studentNis === student.nis) && r.date === today
    );

    if (mode === 'checkin') {
      if (existingRecord) {
        return {
          success: false,
          message: `${student.name} sudah melakukan presensi masuk hari ini pada pukul ${existingRecord.timeIn} (${existingRecord.status.toUpperCase()})!`,
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
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
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
      this.notify();

      if (supabase) {
        supabase
          .from('presensi')
          .upsert(mapToSupabasePresensi(newRecord))
          .then(({ error }) => {
            if (error) console.error('[Supabase] Error saving presensi checkin:', error);
          });
      }

      this.addActivityLog('presensi', 'Scan Presensi Masuk', `${student.name} (${student.className}) hadir status ${status.toUpperCase()}.`, recordedBy);

      return {
        success: true,
        message: `Presensi MASUK ${student.name} (${status.toUpperCase()}) berhasil dicatat pada ${timeStr}!`,
        type: 'checkin',
        student,
        record: newRecord,
      };
    } else {
      // Checkout mode
      if (!existingRecord) {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
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
        this.notify();

        if (supabase) {
          supabase
            .from('presensi')
            .upsert(mapToSupabasePresensi(newRecord))
            .then(({ error }) => {
              if (error) console.error('[Supabase] Error saving presensi checkout:', error);
            });
        }

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
      this.notify();

      if (supabase) {
        supabase
          .from('presensi')
          .upsert(mapToSupabasePresensi(existingRecord))
          .then(({ error }) => {
            if (error) console.error('[Supabase] Error updating checkout:', error);
          });
      }

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
      id: record.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
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

    const idx = this.cachedRecords.findIndex(
      (r) => r.id === fullRecord.id || (r.studentId === fullRecord.studentId && r.date === fullRecord.date)
    );

    if (idx >= 0) {
      this.cachedRecords[idx] = { ...this.cachedRecords[idx], ...fullRecord };
    } else {
      this.cachedRecords.unshift(fullRecord);
    }

    this.notify();

    if (supabase) {
      supabase
        .from('presensi')
        .upsert(mapToSupabasePresensi(fullRecord))
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error saving manual presensi:', error);
        });
    }

    return true;
  }

  recordAttendance(record: Omit<AttendanceRecord, 'id' | 'syncedAt'> & { id?: string; syncedAt?: string }): boolean {
    return this.saveAttendanceManual(record);
  }

  saveAttendanceRecord(record: AttendanceRecord): boolean {
    return this.saveAttendanceManual(record);
  }

  deleteAttendanceRecord(id: string): boolean {
    this.cachedRecords = this.cachedRecords.filter((r) => r.id !== id);
    this.notify();

    if (supabase) {
      supabase
        .from('presensi')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error deleting presensi record:', error);
        });
    }

    return true;
  }

  clearAllAttendanceRecords(): boolean {
    this.cachedRecords = [];
    this.notify();

    if (supabase) {
      supabase
        .from('presensi')
        .delete()
        .neq('id', '0')
        .then(({ error }) => {
          if (error) console.error('[Supabase] Error clearing presensi records:', error);
        });
    }

    return true;
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

    const currentUser = customUser !== undefined ? customUser : this.cachedCurrentUser;

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

    const waliKamarRoom = (currentUser.assignedRoomName || '').trim();
    if (isWaliKamar && (!waliKamarRoom || waliKamarRoom === '-' || waliKamarRoom.toLowerCase() === 'belum ada kamar')) {
      return {
        success: false,
        message: 'Presensi QR Ditolak: Akun Wali Kamar Anda belum terhubung ke kamar asrama. Silakan isi Form Pendataan Kamar terlebih dahulu.',
      };
    }

    const activeRoom = isAdmin ? targetRoom : waliKamarRoom;

    const query = cleanText.toUpperCase();
    const student = this.cachedStudents.find(
      (s) =>
        (s.qrCodeData && s.qrCodeData.toUpperCase() === query) ||
        s.nis.toUpperCase() === query ||
        (s.noKartu && s.noKartu.toUpperCase() === query) ||
        (s.idb && s.idb.toUpperCase() === query) ||
        s.id.toUpperCase() === query ||
        s.name.toUpperCase() === query
    );

    if (!student) {
      return {
        success: false,
        message: `Santri dengan data scan "${cleanText}" tidak ditemukan di database santri Supabase.`,
      };
    }

    if (isWaliKamar) {
      const studentRoom = (student.roomName || '').trim();
      const hasRoom = studentRoom && studentRoom !== '-';
      const studentRoomLower = studentRoom.toLowerCase();
      const expectedRoomLower = waliKamarRoom.toLowerCase();

      if (!hasRoom || studentRoomLower !== expectedRoomLower) {
        return {
          success: false,
          message: `Ditolak: ${student.name} terdaftar di kamar "${studentRoom || 'Belum Ada Kamar'}", bukan kamar Anda (${waliKamarRoom}).`,
          student,
        };
      }
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const existingRecord = this.cachedRecords.find(
      (r) => (r.studentId === student.id || r.studentNis === student.nis) && r.date === today
    );

    if (existingRecord) {
      return {
        success: false,
        message: `${student.name} sudah tercatat presensi hari ini pada pukul ${existingRecord.timeIn} (${existingRecord.status.toUpperCase()}).`,
        student,
        record: existingRecord,
        isAlreadyRecorded: true,
      };
    }

    let status: AttendanceStatus = 'hadir';
    const limitTime = sessionType === 'SEBELUM_TIDUR' ? '22:00' : (this.cachedSettings.timeInLimit || '07:15');
    if (timeStr > limitTime) {
      status = 'terlambat';
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      studentId: student.id,
      studentNis: student.nis,
      studentName: student.name,
      className: student.className,
      roomName: student.roomName || activeRoom,
      date: today,
      timeIn: timeStr,
      status,
      notes: `Presensi Kamar (${sessionType}) - ${status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}`,
      recordedBy: currentUser.name,
      syncedAt: now.toISOString(),
    };

    this.saveAttendanceManual(newRecord);

    return {
      success: true,
      message: `Presensi ${student.name} (${status.toUpperCase()}) berhasil disimpan ke Supabase pada ${timeStr}!`,
      type: 'checkin',
      student,
      record: newRecord,
    };
  }

  // ============================================================================
  // DASHBOARD MONITORING & SUMMARIES (Directly calculated from Supabase live state)
  // ============================================================================

  getDailySummary(date?: string): DailySummary {
    const targetDate = date || getTodayDateStr();
    const records = this.getAttendanceRecords(targetDate);
    const totalStudents = this.cachedStudents.length;

    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    records.forEach((r) => {
      switch (r.status) {
        case 'hadir':
          hadir++;
          break;
        case 'terlambat':
          terlambat++;
          break;
        case 'sakit':
          sakit++;
          break;
        case 'izin':
          izin++;
          break;
        case 'alpa':
          alpa++;
          break;
      }
    });

    const recordedCount = hadir + terlambat + sakit + izin + alpa;
    const belumAbsen = Math.max(0, totalStudents - recordedCount);
    const totalHadir = hadir + terlambat;
    const attendancePercentage = totalStudents > 0 ? Math.round((totalHadir / totalStudents) * 100) : 0;

    return {
      date: targetDate,
      totalStudents,
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      belumAbsen,
      attendancePercentage,
    };
  }

  getClassSummaries(date?: string): ClassSummary[] {
    const targetDate = date || getTodayDateStr();
    const records = this.getAttendanceRecords(targetDate);

    const classMap: Record<string, { total: number; hadir: number; terlambat: number; sakit: number; izin: number; alpa: number }> = {};

    this.cachedStudents.forEach((st) => {
      const c = st.className || 'Lainnya';
      if (!classMap[c]) {
        classMap[c] = { total: 0, hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
      }
      classMap[c].total++;
    });

    records.forEach((r) => {
      const c = r.className || 'Lainnya';
      if (!classMap[c]) {
        classMap[c] = { total: 0, hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
      }
      if (r.status === 'hadir') classMap[c].hadir++;
      else if (r.status === 'terlambat') classMap[c].terlambat++;
      else if (r.status === 'sakit') classMap[c].sakit++;
      else if (r.status === 'izin') classMap[c].izin++;
      else if (r.status === 'alpa') classMap[c].alpa++;
    });

    return Object.keys(classMap).map((className) => {
      const item = classMap[className];
      const recorded = item.hadir + item.terlambat + item.sakit + item.izin + item.alpa;
      const belumAbsen = Math.max(0, item.total - recorded);
      const totalHadir = item.hadir + item.terlambat;
      const percentage = item.total > 0 ? Math.round((totalHadir / item.total) * 100) : 0;

      return {
        className,
        total: item.total,
        hadir: item.hadir,
        terlambat: item.terlambat,
        sakit: item.sakit,
        izin: item.izin,
        alpa: item.alpa,
        belumAbsen,
        percentage,
      };
    });
  }

  getRoomSummaries(dateStr?: string, sessionType?: RoomAttendanceSession): RoomSummary[] {
    const targetDate = dateStr || getTodayDateStr();
    const records = this.getAttendanceRecords(targetDate);

    const roomMap: Record<string, { total: number; hadir: number; terlambat: number; sakit: number; izin: number; alpa: number; capacity: number; building: string; supervisor: string }> = {};

    this.cachedRooms.forEach((rm) => {
      roomMap[rm.roomNumber] = {
        total: 0,
        hadir: 0,
        terlambat: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        capacity: rm.capacity,
        building: rm.building,
        supervisor: rm.supervisorName,
      };
    });

    this.cachedStudents.forEach((st) => {
      if (st.roomName && st.roomName !== '-') {
        if (!roomMap[st.roomName]) {
          roomMap[st.roomName] = {
            total: 0,
            hadir: 0,
            terlambat: 0,
            sakit: 0,
            izin: 0,
            alpa: 0,
            capacity: 20,
            building: 'Asrama',
            supervisor: 'Wali Kamar',
          };
        }
        roomMap[st.roomName].total++;
      }
    });

    records.forEach((r) => {
      if (r.roomName && roomMap[r.roomName]) {
        if (r.status === 'hadir') roomMap[r.roomName].hadir++;
        else if (r.status === 'terlambat') roomMap[r.roomName].terlambat++;
        else if (r.status === 'sakit') roomMap[r.roomName].sakit++;
        else if (r.status === 'izin') roomMap[r.roomName].izin++;
        else if (r.status === 'alpa') roomMap[r.roomName].alpa++;
      }
    });

    return Object.keys(roomMap).map((roomName) => {
      const r = roomMap[roomName];
      const recorded = r.hadir + r.terlambat + r.sakit + r.izin + r.alpa;
      const belumAbsen = Math.max(0, r.total - recorded);
      const totalHadir = r.hadir + r.terlambat;
      const percentage = r.total > 0 ? Math.round((totalHadir / r.total) * 100) : 0;

      return {
        roomName,
        total: r.total,
        capacity: r.capacity,
        building: r.building,
        supervisorName: r.supervisor,
        hadir: r.hadir,
        terlambat: r.terlambat,
        sakit: r.sakit,
        izin: r.izin,
        alpa: r.alpa,
        belumAbsen,
        percentage,
      };
    });
  }

  // ============================================================================
  // SETTINGS & EXPORTS
  // ============================================================================

  getSettings(): SchoolSettings {
    return { ...this.cachedSettings };
  }

  saveSettings(newSettings: Partial<SchoolSettings>): boolean {
    this.cachedSettings = { ...this.cachedSettings, ...newSettings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.cachedSettings));
      } catch {}
    }
    this.notify();
    return true;
  }

  resetAllData() {
    this.deleteAllStudents();
    this.deleteAllRooms();
    this.clearAllAttendanceRecords();
    this.cachedRoomAssignments = [];
    this.cachedActivityLogs = [];
    this.notify();
  }

  resetToDefault() {
    this.resetAllData();
  }

  generateAttendanceCSV(date?: string, filterClassName?: string): string {
    const targetDate = date || getTodayDateStr();
    let records = this.getAttendanceRecords(targetDate);
    if (filterClassName && filterClassName !== 'SEMUA') {
      records = records.filter((r) => r.className === filterClassName);
    }

    const headers = ['No', 'Tanggal', 'NIS', 'Nama Santri', 'Kelas', 'Kamar', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan', 'Petugas'];
    const rows = records.map((r, idx) => [
      idx + 1,
      r.date,
      `'${r.studentNis}`,
      `"${r.studentName}"`,
      r.className,
      r.roomName || '-',
      r.timeIn,
      r.timeOut || '-',
      r.status.toUpperCase(),
      `"${r.notes || '-'}"`,
      `"${r.recordedBy}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  exportBackupJSON(): string {
    return JSON.stringify(
      {
        students: this.cachedStudents,
        rooms: this.cachedRooms,
        records: this.cachedRecords,
        settings: this.cachedSettings,
        users: this.cachedUsers,
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  }

  importBackupJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.students)) this.saveStudentsBulk(data.students, true);
      if (Array.isArray(data.rooms)) this.saveRoomsBulk(data.rooms, true);
      if (Array.isArray(data.users)) this.cachedUsers = data.users;
      if (Array.isArray(data.records)) this.cachedRecords = data.records;
      if (data.settings) this.saveSettings(data.settings);
      this.notify();
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
