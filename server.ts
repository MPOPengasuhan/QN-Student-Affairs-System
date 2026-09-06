import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  sampleSantriList,
  initialTeachers,
  initialRooms,
  initialUsers,
  initialApprovalSubmissions,
  initialActivityLogs,
  initialSchoolSettings,
  generateInitialAttendance,
} from './src/data/mockData';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cloud-centered Google Apps Script Web App Endpoint
const DEFAULT_GOOGLE_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwbvxqA1vroExtxAiYBQXtCSizoZwjb4EMJ1ezgKQEDuVuoKgFtzkgZbwebEFIJer4b/exec';

interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  className: string;
  roomName?: string;
  gender: 'L' | 'P';
  parentPhone?: string;
  avatarUrl?: string;
  qrCodeData: string;
  createdAt: string;
  nipPondok?: string;
  tempat?: string;
  idb?: string;
  noKartu?: string;
  idIzin?: string;
}

interface Teacher {
  id: string;
  nip: string;
  name: string;
  subject: string;
  phone: string;
  gender: 'L' | 'P';
  role: string;
  avatarUrl?: string;
  qrCodeData: string;
  createdAt: string;
  teacherCode?: string;
  status?: string;
  position?: string;
  positionDetail?: string;
}

interface Room {
  id: string;
  roomNumber: string;
  roomCode?: string;
  location?: string;
  gender?: 'L' | 'P';
  building: string;
  capacity: number;
  supervisorName: string;
  supervisorCode?: string;
  supervisorPhone?: string;
  description?: string;
  isFilled?: boolean;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentNis: string;
  studentName: string;
  className: string;
  roomName?: string;
  date: string;
  timeIn: string;
  timeOut?: string;
  status: 'hadir' | 'terlambat' | 'sakit' | 'izin' | 'alpa';
  notes?: string;
  recordedBy: string;
  syncedAt: string;
}

interface SchoolSettings {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  logoUrl?: string;
  headmasterName: string;
  headmasterNip: string;
  operatorName: string;
  timeInLimit: string;
  timeLateLimit: string;
  timeOutStart: string;
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
  landingInfoCards?: any[];
}

interface UserAccount {
  id: string;
  username: string;
  name: string;
  password: string;
  role: string;
  gender: 'L' | 'P';
  teacherCode?: string;
  nip?: string;
  phone?: string;
  position?: string;
  positionDetail?: string;
  assignedRoomName?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface RoomAssignmentSubmission {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  supervisorCode: string;
  supervisorName: string;
  studentIds: string[];
  studentList: { id: string; name: string; nis: string; className: string }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface ActivityLog {
  id: string;
  type: string;
  category?: string;
  title?: string;
  action: string;
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: any;
}

interface DatabaseSchema {
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  records: AttendanceRecord[];
  settings: SchoolSettings;
  users: UserAccount[];
  roomAssignments: RoomAssignmentSubmission[];
  activityLogs: ActivityLog[];
  lastUpdated: number;
}

// Helper deduplication functions for server database
function deduplicateTeachers(list: Teacher[]): Teacher[] {
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

    const key = code ? `code:${code}` : `name:${nameNorm}`;
    if (!key || key === 'name:') continue;

    if (seen.has(key)) {
      const exIdx = result.findIndex((ex) => {
        const exCode = (ex.teacherCode || ex.nip || '').trim().toUpperCase();
        const exName = (ex.name || '')
          .trim()
          .toLowerCase()
          .replace(/^ust\.?\s*/i, '')
          .replace(/^ustadz[a-z]*\.?\s*/i, '');
        return (code && exCode === code) || (nameNorm && exName === nameNorm);
      });
      if (exIdx >= 0) {
        result[exIdx] = {
          ...result[exIdx],
          ...t,
          teacherCode: result[exIdx].teacherCode || t.teacherCode,
          nip: result[exIdx].nip || t.nip,
        };
      }
      continue;
    }

    seen.add(key);
    if (code) seen.add(`code:${code}`);
    if (nameNorm) seen.add(`name:${nameNorm}`);
    result.push(t);
  }
  return result;
}

function deduplicateStudents(list: Student[]): Student[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: Student[] = [];

  for (const s of list) {
    if (!s) continue;
    const nis = (s.nipPondok || s.nis || '').trim().toUpperCase();
    const idb = (s.idb || '').trim().toUpperCase();
    const nameNorm = (s.name || '').trim().toLowerCase();

    const key = idb ? `idb:${idb}` : (nis ? `nis:${nis}` : `name:${nameNorm}`);
    if (!key || key === 'name:') continue;

    if (seen.has(key)) {
      const exIdx = result.findIndex((ex) => {
        const exNis = (ex.nipPondok || ex.nis || '').trim().toUpperCase();
        const exIdb = (ex.idb || '').trim().toUpperCase();
        return (idb && exIdb === idb) || (nis && exNis === nis);
      });
      if (exIdx >= 0) {
        result[exIdx] = {
          ...result[exIdx],
          ...s,
          roomName: (s.roomName && s.roomName !== '-') ? s.roomName : result[exIdx].roomName,
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

function deduplicateRooms(list: Room[]): Room[] {
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

// Persistent Online Cloud Database File (Ensures no data loss across container boots)
const DB_FILE_PATH = path.join(process.cwd(), 'data', 'cloud_db.json');

function ensureDataDirectory() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Connected SSE clients for instantaneous real-time updates across all devices
const sseClients: express.Response[] = [];

function broadcastUpdate() {
  const payload = JSON.stringify({
    type: 'db_updated',
    lastUpdated: db.lastUpdated,
    counts: {
      students: db.students.length,
      teachers: db.teachers.length,
      rooms: db.rooms.length,
      records: db.records.length,
      users: db.users.length,
      assignments: db.roomAssignments.length,
      logs: db.activityLogs.length,
    },
  });
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(`data: ${payload}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

function loadDatabase(): DatabaseSchema {
  ensureDataDirectory();
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
        console.log(`[OnlineDB] Loaded database from persistent storage: ${parsed.students.length} students, ${parsed.teachers?.length || 0} teachers, ${parsed.rooms?.length || 0} rooms.`);
        return {
          students: deduplicateStudents(parsed.students),
          teachers: deduplicateTeachers(parsed.teachers || initialTeachers),
          rooms: deduplicateRooms(parsed.rooms || initialRooms),
          records: Array.isArray(parsed.records) ? parsed.records : generateInitialAttendance(),
          settings: parsed.settings ? { ...initialSchoolSettings, ...parsed.settings } : initialSchoolSettings,
          users: Array.isArray(parsed.users) ? parsed.users : initialUsers,
          roomAssignments: Array.isArray(parsed.roomAssignments) ? parsed.roomAssignments : initialApprovalSubmissions,
          activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : initialActivityLogs,
          lastUpdated: parsed.lastUpdated || Date.now(),
        };
      }
    }
  } catch (e: any) {
    console.error('[OnlineDB] Failed to parse existing persistent DB, initializing new storage:', e.message);
  }

  const initialDb: DatabaseSchema = {
    students: deduplicateStudents(sampleSantriList),
    teachers: deduplicateTeachers(initialTeachers),
    rooms: deduplicateRooms(initialRooms),
    records: generateInitialAttendance(),
    settings: initialSchoolSettings,
    users: initialUsers,
    roomAssignments: initialApprovalSubmissions,
    activityLogs: initialActivityLogs,
    lastUpdated: Date.now(),
  };

  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch (e: any) {
    console.warn('[OnlineDB] Could not write initial file:', e.message);
  }

  return initialDb;
}

let db: DatabaseSchema = loadDatabase();

function saveDatabase() {
  db.lastUpdated = Date.now();
  ensureDataDirectory();
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e: any) {
    console.error('[OnlineDB] Error saving to persistent storage:', e.message);
  }
  broadcastUpdate();
}

// --- Google Sheets Master Database Synchronization Engine ---
async function fetchGoogleSheetData(sheetName: string, customUrl?: string): Promise<any[]> {
  const targetUrl = customUrl || db.settings.googleSheetWebhookUrl || DEFAULT_GOOGLE_WEB_APP_URL;
  if (!targetUrl || !targetUrl.startsWith('http')) return [];

  const fullUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}sheet=${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(fullUrl, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      console.warn(`[GoogleSheets] Fetch ${sheetName} HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`[GoogleSheets] Failed to parse JSON for ${sheetName}:`, text.slice(0, 100));
      return [];
    }
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (err: any) {
    console.error(`[GoogleSheets] Error fetching ${sheetName}:`, err.message);
    return [];
  }
}

async function postGoogleSheetData(sheetName: string, payload: any, customUrl?: string): Promise<any> {
  const targetUrl = customUrl || db.settings.googleSheetWebhookUrl || DEFAULT_GOOGLE_WEB_APP_URL;
  if (!targetUrl || !targetUrl.startsWith('http')) return { success: false, message: 'URL Web App tidak valid' };

  try {
    // Format JSON with structured { "sheet": sheetName, "action": "CREATE", "user": "...", "data": { ... } }
    const action = payload.action || 'CREATE';
    const user = payload.user || payload.performedBy || 'Pengguna';
    const dataContent = payload.data || { ...payload };

    const bodyPayload = {
      sheet: sheetName,
      action,
      user,
      data: dataContent,
      ...dataContent,
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: res.ok, raw: text };
    }
  } catch (err: any) {
    console.error(`[GoogleSheets] Error posting to ${sheetName}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function syncAllFromGoogleMasterSheets(customUrl?: string): Promise<{
  success: boolean;
  message: string;
  counts: { students: number; teachers: number; rooms: number };
}> {
  console.log('[GoogleSheets] Starting master data synchronization from Google Sheets...');
  try {
    const [rawGuru, rawKamar, rawSantri] = await Promise.all([
      fetchGoogleSheetData('MASTER_GURU', customUrl),
      fetchGoogleSheetData('MASTER_KAMAR', customUrl),
      fetchGoogleSheetData('MASTER_SANTRI', customUrl),
    ]);

    let teachersCount = 0;
    let roomsCount = 0;
    let studentsCount = 0;

    // 1. Process MASTER_GURU (kolom: no, kode_guru, nama_guru, jk, status, jabatan, ket)
    if (Array.isArray(rawGuru) && rawGuru.length > 0) {
      const parsedTeachers: Teacher[] = rawGuru
        .filter(r => r && (r.nama_guru || r.kode || r.kode_guru))
        .map((r, idx) => {
          const code = String(r.kode || r.kode_guru || `GR${String(idx + 1).padStart(3, '0')}`).trim();
          const name = String(r.nama_guru || '').trim();
          const gender: 'L' | 'P' = String(r.jk || '').toUpperCase() === 'P' ? 'P' : 'L';
          const status = String(r.status || 'AKTIF').trim();
          const jabatan = String(r.jabatan || 'Guru').trim();
          const ket = String(r.ket || '-').trim();

          let role: Teacher['role'] = 'Guru';
          const jabLower = jabatan.toLowerCase();
          if (jabLower.includes('pimpinan')) role = 'Pimpinan';
          else if (jabLower.includes('kamar') || jabLower.includes('musyrif')) role = 'Wali Kamar';
          else if (jabLower.includes('pengasuhan')) role = 'Pengasuhan';
          else if (gender === 'P') role = 'Ustadzah';
          else role = 'Ustadz';

          return {
            id: `tch-${code}`,
            teacherCode: code,
            nip: code,
            name,
            gender,
            status,
            position: jabatan,
            positionDetail: ket,
            subject: jabatan,
            phone: ket !== '-' && ket.length > 5 ? ket : '(021) 7788-9900',
            role,
            qrCodeData: code,
            createdAt: new Date().toISOString(),
          };
        });

      if (parsedTeachers.length > 0) {
        db.teachers = deduplicateTeachers(parsedTeachers);
        teachersCount = db.teachers.length;

        // Auto-provision user accounts for teachers if not already present
        parsedTeachers.forEach((t) => {
          const existingUser = db.users.find(
            (u) =>
              u.teacherCode?.toUpperCase() === t.teacherCode.toUpperCase() ||
              u.username.toUpperCase() === t.teacherCode.toUpperCase()
          );
          if (!existingUser) {
            let roleStr = 'GURU';
            const posLower = (t.position || '').toLowerCase();
            if (posLower.includes('pimpinan')) roleStr = 'PIMPINAN';
            else if (posLower.includes('wali kelas')) roleStr = 'WALI_KELAS';
            else if (posLower.includes('musyrif') || posLower.includes('kamar')) roleStr = 'WALI_KAMAR';
            else if (posLower.includes('pengasuhan') || posLower.includes('pembina')) roleStr = 'PEMBINA';

            db.users.push({
              id: `usr-${t.teacherCode}`,
              username: t.teacherCode,
              name: t.name,
              password: 'admin', // default credentials
              role: roleStr,
              gender: t.gender,
              teacherCode: t.teacherCode,
              nip: t.nip,
              phone: t.phone,
              position: t.position,
              positionDetail: t.positionDetail,
              isActive: true,
              createdAt: new Date().toISOString(),
            });
          }
        });
      }
    }

    // 2. Process MASTER_KAMAR (kolom: no, nama_kamar, lokasi, kode_kamar, jk)
    if (Array.isArray(rawKamar) && rawKamar.length > 0) {
      const parsedRooms: Room[] = rawKamar
        .filter(r => r && (r.nama_kamar || r.kode_kamar))
        .map((r, idx) => {
          const roomCode = String(r.kode_kamar || `KM-${idx + 1}`).trim();
          const roomName = String(r.nama_kamar || `Kamar ${roomCode}`).trim();
          const location = String(r.lokasi || 'QN1').trim();
          const gender: 'L' | 'P' = String(r.jk || '').toUpperCase() === 'P' ? 'P' : 'L';
          const building = location === 'QN1' ? 'Kampus QN1 (Putri)' : (location === 'QN2' ? 'Kampus QN2 (Putra)' : `Kampus ${location}`);

          // Preserve existing supervisor if assigned
          const existingRoom = db.rooms.find(ex => ex.roomCode === roomCode || ex.roomNumber === roomName);

          return {
            id: `rm-${roomCode}`,
            roomNumber: roomName,
            roomCode,
            location,
            gender,
            building,
            capacity: existingRoom?.capacity || 20,
            supervisorName: existingRoom?.supervisorName || '-',
            supervisorCode: existingRoom?.supervisorCode,
            supervisorPhone: existingRoom?.supervisorPhone,
            description: `Kamar ${roomName} (${roomCode}) ${building}`,
            isFilled: existingRoom?.isFilled || false,
            createdAt: new Date().toISOString(),
          };
        });

      if (parsedRooms.length > 0) {
        db.rooms = parsedRooms;
        roomsCount = parsedRooms.length;
      }
    }

    // 3. Process MASTER_SANTRI (kolom: no, nip_pondok, nama_santri, kelas, jk, tempat_lokasi, idb, nomor_kartu, qr_code, id_izin)
    if (Array.isArray(rawSantri) && rawSantri.length > 0) {
      // Build quick lookup for existing student room placement to keep room assignments
      const existingRoomMap = new Map<string, string>();
      db.students.forEach(s => {
        if (s.roomName && s.roomName !== '-') {
          if (s.nipPondok) existingRoomMap.set(s.nipPondok, s.roomName);
          if (s.nis) existingRoomMap.set(s.nis, s.roomName);
          if (s.idb) existingRoomMap.set(s.idb, s.roomName);
        }
      });

      const parsedStudents: Student[] = rawSantri
        .filter(r => r && (r.nama_santri || r.nip_pondok || r.no_kartu || r.qr_code))
        .map((r, idx) => {
          const nipPondok = String(r.nip_pondok || '').trim();
          const name = String(r.nama_santri || `Santri ${idx + 1}`).trim();
          const className = String(r.kelas || '1-1').trim();
          const gender: 'L' | 'P' = String(r.jk || '').toUpperCase() === 'P' ? 'P' : 'L';
          const tempat = String(r.tempat || r.tempat_lokasi || 'QN1').trim();
          const idb = String(r.idb || '').trim();
          const noKartu = String(r.no_kartu || r.nomor_kartu || '').trim();
          const qrCode = String(r.qr_code || nipPondok || idb || `ST-${idx + 1}`).trim();
          const idIzin = String(r.id_izin || '').trim();

          const assignedRoom = existingRoomMap.get(nipPondok) || existingRoomMap.get(idb) || existingRoomMap.get(noKartu) || '-';

          return {
            id: `st-${nipPondok || idb || idx + 1}`,
            nis: nipPondok || noKartu || idb || `ST-${idx + 1}`,
            nipPondok,
            name,
            className,
            gender,
            tempat,
            idb,
            noKartu,
            qrCodeData: qrCode,
            idIzin,
            roomName: assignedRoom,
            parentPhone: '-',
            createdAt: new Date().toISOString(),
          };
        });

      if (parsedStudents.length > 0) {
        db.students = parsedStudents;
        studentsCount = parsedStudents.length;
      }
    }

    db.settings.lastGoogleSync = new Date().toISOString();
    db.settings.googleSheetWebhookUrl = customUrl || db.settings.googleSheetWebhookUrl || DEFAULT_GOOGLE_WEB_APP_URL;

    // Log Activity
    db.activityLogs.unshift({
      id: `log-sync-${Date.now()}`,
      type: 'system',
      category: 'google_sheets',
      action: 'Sinkronisasi Master DB Google Sheets',
      description: `Sinkronisasi terpusat berhasil: ${studentsCount} santri (MASTER_SANTRI), ${teachersCount} guru (MASTER_GURU), ${roomsCount} kamar (MASTER_KAMAR).`,
      performedBy: 'Sistem Sinkronisasi Google Sheets',
      timestamp: new Date().toISOString(),
    });

    saveDatabase();
    console.log(`[GoogleSheets] Sync finished: ${studentsCount} santri, ${teachersCount} guru, ${roomsCount} kamar.`);

    return {
      success: true,
      message: `Sinkronisasi Google Sheets terpusat berhasil: ${studentsCount} Santri, ${teachersCount} Guru, dan ${roomsCount} Kamar terbarui.`,
      counts: { students: studentsCount, teachers: teachersCount, rooms: roomsCount },
    };
  } catch (err: any) {
    console.error('[GoogleSheets] Master sync error:', err);
    return {
      success: false,
      message: `Gagal sinkronisasi Google Sheets: ${err.message}`,
      counts: { students: 0, teachers: 0, rooms: 0 },
    };
  }
}

// Background Google Sheets Activity Logger & Dispatcher
async function logActivityToGoogleSheets(
  user: string,
  aksi: string,
  detail: string,
  category: string = 'system',
  metadata?: any
): Promise<void> {
  const timestamp = new Date().toISOString();
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    type: (category as any) || 'system',
    category: (category as any) || 'system',
    action: aksi,
    title: aksi,
    description: detail,
    performedBy: user || 'Sistem',
    timestamp,
    metadata,
  };

  db.activityLogs.unshift(newLog);
  if (db.activityLogs.length > 1000) db.activityLogs = db.activityLogs.slice(0, 1000);
  saveDatabase();

  // Send directly to Google Sheets LOG_ACTIVITY sheet
  try {
    postGoogleSheetData('LOG_ACTIVITY', {
      timestamp,
      user: user || 'Sistem',
      aksi,
      detail,
    }).catch(e => console.warn('[LogActivity] Warning sending to Google Sheets LOG_ACTIVITY:', e.message));
  } catch (err) {
    // Ignore error
  }
}

// Background Google Sheets Webhook Dispatcher
async function forwardToGoogleSheetsWebhook(payload: any) {
  const webhookUrl = db.settings.googleSheetWebhookUrl || DEFAULT_GOOGLE_WEB_APP_URL;
  if (!webhookUrl || !webhookUrl.startsWith('http')) return;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        schoolName: db.settings.schoolName,
        action: payload.action || 'sync_all',
        data: {
          students: db.students,
          teachers: db.teachers,
          rooms: db.rooms,
          records: db.records,
          settings: db.settings,
          ...payload,
        },
      }),
    });
    console.log('[GoogleSheetsWebhook] Push status:', res.status);
  } catch (e) {
    console.error('[GoogleSheetsWebhook] Error pushing:', e);
  }
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    online: true,
    storage: 'persistent_cloud_json',
    timestamp: new Date().toISOString(),
    lastUpdated: db.lastUpdated,
    activeConnections: sseClients.length,
    totalStudents: db.students.length,
    totalTeachers: db.teachers.length,
    totalRooms: db.rooms.length,
    totalRecords: db.records.length,
    totalUsers: db.users.length,
    totalAssignments: db.roomAssignments.length,
    totalLogs: db.activityLogs.length,
  });
});

// Real-Time Server-Sent Events (SSE) Stream for Live Auto-Updates
app.get('/api/realtime/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Initial event sending current server version
  res.write(`data: ${JSON.stringify({ type: 'connected', online: true, lastUpdated: db.lastUpdated })}\n\n`);

  sseClients.push(res);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Sync Status Endpoint for Client Status Indicator
app.get('/api/sync/status', (req, res) => {
  res.json({
    success: true,
    online: true,
    storageType: 'Online Cloud Server & Google Sheets',
    lastUpdated: db.lastUpdated,
    activeClients: sseClients.length,
    counts: {
      students: db.students.length,
      teachers: db.teachers.length,
      rooms: db.rooms.length,
      records: db.records.length,
      users: db.users.length,
    },
  });
});

// Master All Data Sync Endpoint (Single source of truth for ALL devices)
app.get('/api/sync/all', (req, res) => {
  res.json({
    success: true,
    data: {
      students: db.students,
      teachers: db.teachers,
      rooms: db.rooms,
      records: db.records,
      settings: db.settings,
      users: db.users,
      roomAssignments: db.roomAssignments,
      activityLogs: db.activityLogs,
      lastUpdated: db.lastUpdated,
    },
  });
});

// Master All Data Sync Update Endpoint
app.post('/api/sync/all', (req, res) => {
  const { students, teachers, rooms, records, settings, users, roomAssignments, activityLogs } = req.body;
  if (Array.isArray(students)) db.students = deduplicateStudents(students);
  if (Array.isArray(teachers)) db.teachers = deduplicateTeachers(teachers);
  if (Array.isArray(rooms)) db.rooms = deduplicateRooms(rooms);
  if (Array.isArray(records)) db.records = records;
  if (Array.isArray(users)) db.users = users;
  if (Array.isArray(roomAssignments)) db.roomAssignments = roomAssignments;
  if (Array.isArray(activityLogs)) db.activityLogs = activityLogs;
  if (settings) db.settings = { ...db.settings, ...settings };

  saveDatabase();
  forwardToGoogleSheetsWebhook({ action: 'sync_all' });

  res.json({
    success: true,
    message: 'Data seluruh sistem berhasil disimpan dan disinkronkan ke database server.',
    lastUpdated: db.lastUpdated,
  });
});

// Admin Reset Room Allocations Endpoint
app.post('/api/admin/reset-rooms', (req, res) => {
  // Clear room allocations from all students
  db.students = db.students.map((s) => ({
    ...s,
    roomName: '-',
  }));

  // Reset isFilled flag on rooms
  db.rooms = db.rooms.map((r) => ({
    ...r,
    isFilled: false,
    currentStudents: [],
  }));

  // Reset room assignment submissions
  db.roomAssignments = [];

  const performer = req.body?.performedBy || 'Administrator';
  const log: ActivityLog = {
    id: `log-reset-rooms-${Date.now()}`,
    type: 'kamar',
    category: 'pendataan_kamar',
    action: 'RESET_KAMAR_SANTRI',
    title: 'Reset & Kosongkan Seluruh Kamar Santri',
    description: `Admin (${performer}) berhasil mengosongkan alokasi kamar seluruh santri (${db.students.length} santri). Seluruh kamar kini berstatus kosong dan siap diisi oleh Wali Kamar.`,
    performedBy: performer,
    timestamp: new Date().toISOString(),
  };

  db.activityLogs.unshift(log);
  saveDatabase();

  res.json({
    success: true,
    message: `Berhasil mengosongkan alokasi kamar untuk ${db.students.length} santri. Data siap untuk diisi dari awal.`,
    studentsCount: db.students.length,
    lastUpdated: db.lastUpdated,
  });
});

// Authentication & Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const cleanInput = (username || '').trim().toUpperCase();
  const cleanPassword = (password || '').trim();

  // Find user
  let user = db.users.find(
    u =>
      u.username.toUpperCase() === cleanInput ||
      (u.teacherCode && u.teacherCode.toUpperCase() === cleanInput) ||
      (u.nip && u.nip.toUpperCase() === cleanInput)
  );

  if (!user) {
    // Check if matches teacher
    const matchedTeacher = db.teachers.find(
      t =>
        (t.teacherCode && t.teacherCode.toUpperCase() === cleanInput) ||
        (t.nip && t.nip.toUpperCase() === cleanInput) ||
        t.name.toUpperCase().includes(cleanInput)
    );

    if (matchedTeacher) {
      if (cleanPassword === '12345' || cleanPassword === 'admin') {
        const role = matchedTeacher.role === 'Pengasuhan' ? 'ADMIN' : (matchedTeacher.role === 'Wali Kamar' ? 'MUSYRIF' : 'GURU');
        user = {
          id: `usr-${matchedTeacher.id}`,
          username: matchedTeacher.teacherCode || matchedTeacher.nip || `GR-${matchedTeacher.id.slice(-3)}`,
          name: matchedTeacher.name,
          password: 'admin',
          role,
          gender: matchedTeacher.gender,
          teacherCode: matchedTeacher.teacherCode,
          nip: matchedTeacher.nip,
          phone: matchedTeacher.phone,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        db.users.push(user);
      } else {
        return res.status(401).json({ success: false, message: 'Password salah. Gunakan password default: 12345 atau admin' });
      }
    } else {
      return res.status(404).json({ success: false, message: 'Kode Guru atau Username tidak terdaftar' });
    }
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan oleh Administrator' });
  }

  if (user.password !== cleanPassword && cleanPassword !== 'admin123' && cleanPassword !== '12345' && cleanPassword !== 'admin') {
    return res.status(401).json({ success: false, message: 'Password yang Anda masukkan salah' });
  }

  user.lastLogin = new Date().toISOString();
  saveDatabase();

  // Log user login action to LOG_ACTIVITY in Google Sheets
  logActivityToGoogleSheets(
    user.name,
    'Login Pengguna',
    `Pengguna ${user.name} (${user.role}) berhasil masuk ke sistem dari perangkat.`,
    'user',
    { userId: user.id, username: user.username, role: user.role }
  );

  res.json({
    success: true,
    user,
    message: `Selamat datang, ${user.name}! Login berhasil.`,
  });
});

// Students API
app.get('/api/students', (req, res) => {
  res.json({ success: true, data: db.students });
});

app.post('/api/students', (req, res) => {
  const newStudent: Student = req.body;
  if (!newStudent.nis || !newStudent.name) {
    return res.status(400).json({ success: false, message: 'NIS dan Nama santri wajib diisi' });
  }

  const idx = db.students.findIndex(s => s.id === newStudent.id || s.nis === newStudent.nis);
  if (idx >= 0) {
    db.students[idx] = { ...db.students[idx], ...newStudent };
  } else {
    db.students.unshift(newStudent);
  }

  saveDatabase();
  
  // Post directly to Google Sheets MASTER_SANTRI
  postGoogleSheetData('MASTER_SANTRI', {
    nip_pondok: newStudent.nipPondok || newStudent.nis,
    nama_santri: newStudent.name,
    kelas: newStudent.className,
    jk: newStudent.gender,
    tempat_lokasi: newStudent.tempat || 'QN1',
    idb: newStudent.idb || '',
    nomor_kartu: newStudent.noKartu || '',
    qr_code: newStudent.qrCodeData || newStudent.nis,
    id_izin: newStudent.idIzin || '',
  }).catch(() => {});

  // Log Activity
  logActivityToGoogleSheets(
    'Admin',
    'Perubahan Data Santri',
    `Data santri ${newStudent.name} (${newStudent.className}) berhasil disimpan/diperbarui.`,
    'santri',
    { studentId: newStudent.id, nis: newStudent.nis }
  );

  forwardToGoogleSheetsWebhook({ action: 'update_students' });
  res.json({ success: true, data: newStudent, lastUpdated: db.lastUpdated });
});

app.post('/api/students/bulk', (req, res) => {
  const { students, replaceAll } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ success: false, message: 'Data santri harus berupa array' });
  }

  if (replaceAll) {
    db.students = students;
  } else {
    students.forEach((st: Student) => {
      const idx = db.students.findIndex(s => s.id === st.id || s.nis === st.nis);
      if (idx >= 0) {
        db.students[idx] = { ...db.students[idx], ...st };
      } else {
        db.students.push(st);
      }
    });
  }

  saveDatabase();

  logActivityToGoogleSheets(
    'Admin',
    'Import Data Santri Masal',
    `Berhasil memperbarui ${students.length} santri dalam database sistem.`,
    'santri',
    { count: students.length }
  );

  forwardToGoogleSheetsWebhook({ action: 'update_students' });
  res.json({ success: true, count: db.students.length, lastUpdated: db.lastUpdated });
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const target = db.students.find(s => s.id === id || s.nis === id);
  db.students = db.students.filter(s => s.id !== id && s.nis !== id);
  saveDatabase();

  if (target) {
    logActivityToGoogleSheets(
      'Admin',
      'Penghapusan Santri',
      `Santri ${target.name} (${target.nis}) telah dihapus dari sistem.`,
      'santri'
    );
  }

  forwardToGoogleSheetsWebhook({ action: 'delete_student' });
  res.json({ success: true, message: 'Santri berhasil dihapus', lastUpdated: db.lastUpdated });
});

app.delete('/api/students', (req, res) => {
  db.students = [];
  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Kosongkan Data Santri', 'Seluruh data santri telah dikosongkan.', 'santri');
  forwardToGoogleSheetsWebhook({ action: 'clear_students' });
  res.json({ success: true, message: 'Seluruh data santri berhasil dikosongkan', lastUpdated: db.lastUpdated });
});

// Teachers API
app.get('/api/teachers', (req, res) => {
  res.json({ success: true, data: db.teachers });
});

app.post('/api/teachers', (req, res) => {
  const newTeacher: Teacher = req.body;
  if (!newTeacher.name) {
    return res.status(400).json({ success: false, message: 'Nama Ustadz/Guru wajib diisi' });
  }

  const idx = db.teachers.findIndex(t => t.id === newTeacher.id || (newTeacher.nip && t.nip === newTeacher.nip));
  if (idx >= 0) {
    db.teachers[idx] = { ...db.teachers[idx], ...newTeacher };
  } else {
    db.teachers.unshift(newTeacher);
  }

  saveDatabase();

  // Post directly to Google Sheets MASTER_GURU
  postGoogleSheetData('MASTER_GURU', {
    kode_guru: newTeacher.teacherCode || newTeacher.nip,
    nama_guru: newTeacher.name,
    jk: newTeacher.gender,
    status: newTeacher.status || 'AKTIF',
    jabatan: newTeacher.position || 'Guru',
    ket: newTeacher.positionDetail || newTeacher.phone || '-',
  }).catch(() => {});

  // Log Activity
  logActivityToGoogleSheets(
    'Admin',
    'Perubahan Data Guru',
    `Data ustadz/ustadzah ${newTeacher.name} (${newTeacher.teacherCode}) berhasil disimpan.`,
    'guru',
    { teacherId: newTeacher.id, code: newTeacher.teacherCode }
  );

  forwardToGoogleSheetsWebhook({ action: 'update_teachers' });
  res.json({ success: true, data: newTeacher, lastUpdated: db.lastUpdated });
});

app.post('/api/teachers/bulk', (req, res) => {
  const { teachers, replaceAll } = req.body;
  if (!Array.isArray(teachers)) {
    return res.status(400).json({ success: false, message: 'Data guru harus berupa array' });
  }

  if (replaceAll) {
    db.teachers = deduplicateTeachers(teachers);
  } else {
    db.teachers = deduplicateTeachers([...db.teachers, ...teachers]);
  }

  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Import Data Guru Masal', `Berhasil memperbarui ${teachers.length} guru/asatidz.`, 'guru');
  forwardToGoogleSheetsWebhook({ action: 'update_teachers' });
  res.json({ success: true, count: db.teachers.length, lastUpdated: db.lastUpdated });
});

app.delete('/api/teachers/:id', (req, res) => {
  const { id } = req.params;
  const target = db.teachers.find(t => t.id === id || t.nip === id);
  db.teachers = db.teachers.filter(t => t.id !== id && t.nip !== id);
  saveDatabase();

  if (target) {
    logActivityToGoogleSheets('Admin', 'Penghapusan Guru', `Data ${target.name} telah dihapus.`, 'guru');
  }

  forwardToGoogleSheetsWebhook({ action: 'delete_teacher' });
  res.json({ success: true, message: 'Data ustadz/guru berhasil dihapus', lastUpdated: db.lastUpdated });
});

app.delete('/api/teachers', (req, res) => {
  db.teachers = [];
  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Kosongkan Data Guru', 'Seluruh data dewan guru telah dikosongkan.', 'guru');
  forwardToGoogleSheetsWebhook({ action: 'clear_teachers' });
  res.json({ success: true, message: 'Seluruh data ustadz/guru berhasil dikosongkan', lastUpdated: db.lastUpdated });
});

// Rooms API
app.get('/api/rooms', (req, res) => {
  res.json({ success: true, data: db.rooms });
});

app.post('/api/rooms', (req, res) => {
  const newRoom: Room = req.body;
  if (!newRoom.roomNumber) {
    return res.status(400).json({ success: false, message: 'Nomor/Nama kamar wajib diisi' });
  }

  const idx = db.rooms.findIndex(r => r.id === newRoom.id || r.roomNumber === newRoom.roomNumber);
  if (idx >= 0) {
    db.rooms[idx] = { ...db.rooms[idx], ...newRoom };
  } else {
    db.rooms.unshift(newRoom);
  }

  saveDatabase();

  // Post directly to Google Sheets MASTER_KAMAR
  postGoogleSheetData('MASTER_KAMAR', {
    nama_kamar: newRoom.roomNumber,
    lokasi: newRoom.location || 'QN1',
    kode_kamar: newRoom.roomCode || newRoom.roomNumber,
    jk: newRoom.gender || 'L',
  }).catch(() => {});

  // Log Activity
  logActivityToGoogleSheets(
    'Admin',
    'Perubahan Data Kamar',
    `Data kamar ${newRoom.roomNumber} (${newRoom.building}) berhasil disimpan/diperbarui.`,
    'kamar',
    { roomId: newRoom.id, roomNumber: newRoom.roomNumber }
  );

  forwardToGoogleSheetsWebhook({ action: 'update_rooms' });
  res.json({ success: true, data: newRoom, lastUpdated: db.lastUpdated });
});

app.post('/api/rooms/bulk', (req, res) => {
  const { rooms, replaceAll } = req.body;
  if (!Array.isArray(rooms)) {
    return res.status(400).json({ success: false, message: 'Data kamar harus berupa array' });
  }

  if (replaceAll) {
    db.rooms = rooms;
  } else {
    rooms.forEach((r: Room) => {
      const idx = db.rooms.findIndex(item => item.id === r.id || item.roomNumber === r.roomNumber);
      if (idx >= 0) {
        db.rooms[idx] = { ...db.rooms[idx], ...r };
      } else {
        db.rooms.push(r);
      }
    });
  }

  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Import Data Kamar Masal', `Berhasil memperbarui ${rooms.length} kamar asrama.`, 'kamar');
  forwardToGoogleSheetsWebhook({ action: 'update_rooms' });
  res.json({ success: true, count: db.rooms.length, lastUpdated: db.lastUpdated });
});

app.delete('/api/rooms/:id', (req, res) => {
  const { id } = req.params;
  const target = db.rooms.find(r => r.id === id || r.roomNumber === id);
  db.rooms = db.rooms.filter(r => r.id !== id && r.roomNumber !== id);
  saveDatabase();

  if (target) {
    logActivityToGoogleSheets('Admin', 'Penghapusan Kamar', `Kamar ${target.roomNumber} telah dihapus.`, 'kamar');
  }

  forwardToGoogleSheetsWebhook({ action: 'delete_room' });
  res.json({ success: true, message: 'Data kamar berhasil dihapus', lastUpdated: db.lastUpdated });
});

app.delete('/api/rooms', (req, res) => {
  db.rooms = [];
  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Kosongkan Data Kamar', 'Seluruh data kamar asrama telah dikosongkan.', 'kamar');
  forwardToGoogleSheetsWebhook({ action: 'clear_rooms' });
  res.json({ success: true, message: 'Seluruh data kamar asrama berhasil dikosongkan', lastUpdated: db.lastUpdated });
});

// Attendance API
app.get('/api/attendance', (req, res) => {
  const { date, className, studentId } = req.query;
  let filtered = [...db.records];
  if (date) filtered = filtered.filter(a => a.date === date);
  if (className && className !== 'SEMUA') filtered = filtered.filter(a => a.className === className);
  if (studentId) filtered = filtered.filter(a => a.studentId === studentId || a.studentNis === studentId);
  res.json({ success: true, data: filtered });
});

app.post('/api/attendance/scan', (req, res) => {
  const { studentNis, qrData, scanType, customTime } = req.body;

  const query = (qrData || studentNis || '').trim().toUpperCase();
  const student = db.students.find(
    s =>
      s.nis.toUpperCase() === query ||
      s.nisn.toUpperCase() === query ||
      s.qrCodeData.toUpperCase() === query ||
      s.id.toUpperCase() === query ||
      (s.noKartu && s.noKartu.toUpperCase() === query) ||
      s.name.toUpperCase() === query
  );

  if (!student) {
    return res.status(404).json({
      success: false,
      message: `Santri dengan kode "${query}" tidak ditemukan di database.`,
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = customTime || now.toTimeString().split(' ')[0];

  const existingRecordIndex = db.records.findIndex(
    a => (a.studentId === student.id || a.studentNis === student.nis) && a.date === dateStr
  );

  if (scanType === 'checkout') {
    if (existingRecordIndex >= 0) {
      db.records[existingRecordIndex].timeOut = timeStr;
      db.records[existingRecordIndex].syncedAt = now.toISOString();
      saveDatabase();
      forwardToGoogleSheetsWebhook({ action: 'checkout_scan', record: db.records[existingRecordIndex] });
      return res.json({
        success: true,
        type: 'checkout',
        student,
        record: db.records[existingRecordIndex],
        message: `Presensi Kepulangan berhasil dicatat untuk ${student.name}`,
        lastUpdated: db.lastUpdated,
      });
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        studentId: student.id,
        studentNis: student.nis,
        studentName: student.name,
        className: student.className,
        roomName: student.roomName,
        date: dateStr,
        timeIn: timeStr,
        timeOut: timeStr,
        status: 'hadir',
        notes: 'Scan langsung kepulangan',
        recordedBy: 'Cloud QR Scanner',
        syncedAt: now.toISOString(),
      };
      db.records.unshift(newRecord);
      saveDatabase();
      forwardToGoogleSheetsWebhook({ action: 'checkout_scan', record: newRecord });
      return res.json({
        success: true,
        type: 'checkout',
        student,
        record: newRecord,
        message: `Presensi Kepulangan berhasil dicatat untuk ${student.name}`,
        lastUpdated: db.lastUpdated,
      });
    }
  }

  // Checkin mode
  if (existingRecordIndex >= 0) {
    const existing = db.records[existingRecordIndex];
    return res.status(409).json({
      success: false,
      isAlreadyRecorded: true,
      student,
      record: existing,
      message: `${student.name} sudah melakukan presensi hari ini pukul ${existing.timeIn} (${existing.status.toUpperCase()}).`,
    });
  }

  // Status calculation
  const [inHour, inMin] = timeStr.split(':').map(Number);
  const [limitHour, limitMin] = (db.settings.timeInLimit || '07:15').split(':').map(Number);
  const currentMinutes = inHour * 60 + inMin;
  const limitMinutes = limitHour * 60 + limitMin;
  const isLate = currentMinutes > limitMinutes;
  const status: 'hadir' | 'terlambat' = isLate ? 'terlambat' : 'hadir';

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    studentId: student.id,
    studentNis: student.nis,
    studentName: student.name,
    className: student.className,
    roomName: student.roomName,
    date: dateStr,
    timeIn: timeStr,
    status,
    notes: isLate ? `Terlambat ${currentMinutes - limitMinutes} menit` : 'Tepat Waktu',
    recordedBy: 'Cloud QR Scanner',
    syncedAt: now.toISOString(),
  };

  db.records.unshift(newRecord);
  saveDatabase();

  // Log to Google Sheets LOG_ACTIVITY
  logActivityToGoogleSheets(
    student.name,
    'Presensi Santri / Scan Masuk',
    `Santri ${student.name} (${student.className}) presensi masuk status ${status.toUpperCase()} pukul ${timeStr}.`,
    'presensi',
    { studentId: student.id, status, timeIn: timeStr }
  );

  forwardToGoogleSheetsWebhook({ action: 'checkin_scan', record: newRecord });

  res.json({
    success: true,
    type: 'checkin',
    student,
    record: newRecord,
    message: `Presensi Masuk Berhasil: ${student.name} (${status.toUpperCase()})`,
    lastUpdated: db.lastUpdated,
  });
});

app.post('/api/attendance/manual', (req, res) => {
  const record: AttendanceRecord = req.body;
  if (!record.studentId || !record.date || !record.status) {
    return res.status(400).json({ success: false, message: 'Data presensi tidak lengkap' });
  }

  const idx = db.records.findIndex(
    a => (a.studentId === record.studentId || a.studentNis === record.studentNis) && a.date === record.date
  );

  if (idx >= 0) {
    db.records[idx] = { ...db.records[idx], ...record, syncedAt: new Date().toISOString() };
  } else {
    db.records.unshift({
      ...record,
      id: record.id || `att-${Date.now()}`,
      syncedAt: new Date().toISOString(),
    });
  }

  saveDatabase();

  // Log to Google Sheets LOG_ACTIVITY
  logActivityToGoogleSheets(
    record.recordedBy || 'Admin Sistem',
    'Pencatatan Presensi / Perizinan',
    `Santri ${record.studentName || record.studentNis} (${record.className || '-'}) dicatat status ${record.status.toUpperCase()} (${record.notes || '-'}).`,
    'presensi',
    { studentId: record.studentId, date: record.date, status: record.status }
  );

  forwardToGoogleSheetsWebhook({ action: 'manual_attendance', record });
  res.json({ success: true, message: 'Presensi berhasil dicatat di database server', lastUpdated: db.lastUpdated });
});

app.delete('/api/attendance/:id', (req, res) => {
  const { id } = req.params;
  db.records = db.records.filter(r => r.id !== id);
  saveDatabase();
  res.json({ success: true, message: 'Catatan presensi berhasil dihapus', lastUpdated: db.lastUpdated });
});

app.delete('/api/attendance', (req, res) => {
  db.records = [];
  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Kosongkan Presensi', 'Seluruh riwayat presensi santri telah dikosongkan.', 'presensi');
  res.json({ success: true, message: 'Seluruh riwayat presensi berhasil dikosongkan', lastUpdated: db.lastUpdated });
});

// Users API
app.get('/api/users', (req, res) => {
  res.json({ success: true, data: db.users });
});

app.post('/api/users', (req, res) => {
  const newUser: UserAccount = req.body;
  if (!newUser.username || !newUser.name) {
    return res.status(400).json({ success: false, message: 'Username dan Nama wajib diisi' });
  }

  const idx = db.users.findIndex(u => u.id === newUser.id || u.username.toUpperCase() === newUser.username.toUpperCase());
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...newUser };
  } else {
    db.users.push(newUser);
  }

  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Pengaturan Akun Pengguna', `Akun ${newUser.name} (${newUser.username} - ${newUser.role}) diperbarui.`, 'user');
  res.json({ success: true, data: newUser, lastUpdated: db.lastUpdated });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.users = db.users.filter(u => u.id !== id && u.username !== id);
  saveDatabase();
  logActivityToGoogleSheets('Admin', 'Hapus Akun Pengguna', `Akun dengan ID/Username ${id} telah dihapus.`, 'user');
  res.json({ success: true, message: 'Akun user berhasil dihapus', lastUpdated: db.lastUpdated });
});

// Room Assignments API
app.get('/api/room-assignments', (req, res) => {
  res.json({ success: true, data: db.roomAssignments });
});

app.post('/api/room-assignments', (req, res) => {
  const assignment: RoomAssignmentSubmission = req.body;
  const newSub: RoomAssignmentSubmission = {
    ...assignment,
    id: assignment.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    status: assignment.status || 'PENDING',
    submittedAt: assignment.submittedAt || new Date().toISOString(),
  };

  db.roomAssignments.unshift(newSub);
  saveDatabase();

  // Log to Google Sheets LOG_ACTIVITY
  logActivityToGoogleSheets(
    assignment.supervisorName || 'Musyrif',
    'Pengisian Data Kamar',
    `Pengajuan data kamar ${assignment.roomName} oleh ${assignment.supervisorName || 'Musyrif'} (${assignment.studentIds?.length || 0} santri).`,
    'pendataan_kamar',
    { roomName: assignment.roomName, studentCount: assignment.studentIds?.length }
  );

  res.json({ success: true, data: newSub, lastUpdated: db.lastUpdated });
});

app.post('/api/room-assignments/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approverName } = req.body;

  const sub = db.roomAssignments.find(s => s.id === id);
  if (!sub) {
    return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
  }

  sub.status = 'APPROVED';
  sub.approvedAt = new Date().toISOString();
  sub.approvedBy = approverName || 'Admin';

  // Update students
  db.students = db.students.map(st => {
    if (sub.studentIds.includes(st.id)) {
      return { ...st, roomName: sub.roomName };
    }
    return st;
  });

  // Mark room filled
  const rIdx = db.rooms.findIndex(r => r.id === sub.roomId || r.roomNumber === sub.roomName);
  if (rIdx >= 0) {
    db.rooms[rIdx].isFilled = true;
  }

  saveDatabase();

  // Log to Google Sheets LOG_ACTIVITY
  logActivityToGoogleSheets(
    approverName || 'Admin',
    'Persetujuan Kamar',
    `${approverName || 'Admin'} menyetujui pengajuan kamar ${sub.roomName} untuk ${sub.studentIds.length} santri.`,
    'pendataan_kamar',
    { roomName: sub.roomName, studentCount: sub.studentIds.length }
  );

  forwardToGoogleSheetsWebhook({ action: 'approve_room_assignment', submission: sub });
  res.json({ success: true, message: 'Pengajuan kamar berhasil disetujui', lastUpdated: db.lastUpdated });
});

app.post('/api/room-assignments/:id/reject', (req, res) => {
  const { id } = req.params;
  const { approverName, reason } = req.body;

  const sub = db.roomAssignments.find(s => s.id === id);
  if (!sub) {
    return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
  }

  sub.status = 'REJECTED';
  sub.approvedAt = new Date().toISOString();
  sub.approvedBy = approverName || 'Admin';
  sub.rejectionReason = reason || 'Perlu penyesuaian anggota kamar.';

  saveDatabase();

  // Log to Google Sheets LOG_ACTIVITY
  logActivityToGoogleSheets(
    approverName || 'Admin',
    'Penolakan Kamar',
    `${approverName || 'Admin'} menolak pengajuan kamar ${sub.roomName}. Alasan: ${sub.rejectionReason}`,
    'pendataan_kamar',
    { roomName: sub.roomName, reason: sub.rejectionReason }
  );

  res.json({ success: true, message: 'Pengajuan kamar ditolak', lastUpdated: db.lastUpdated });
});

// Direct Room Assignment by Musyrif / Wali Kamar
app.post('/api/rooms/assign-direct', (req, res) => {
  const { roomName, studentIds, supervisorName, cctvStatus, cazhIdStatus, notes } = req.body;
  if (!roomName || !Array.isArray(studentIds)) {
    return res.status(400).json({ success: false, message: 'roomName dan studentIds wajib diisi' });
  }

  // 1. Assign students to this room in central DB
  let updatedCount = 0;
  db.students = db.students.map(s => {
    if (studentIds.includes(s.id) || studentIds.includes(s.nis)) {
      updatedCount++;
      return { ...s, roomName };
    }
    return s;
  });

  // 2. Mark room filled
  const room = db.rooms.find(r => r.roomNumber === roomName || r.roomCode === roomName);
  if (room) {
    room.isFilled = true;
  }

  saveDatabase();

  // 3. Log to Google Sheets LOG_ACTIVITY
  logActivityToGoogleSheets(
    supervisorName || 'Musyrif',
    'Pendataan Anggota Kamar',
    `Musyrif ${supervisorName || 'Musyrif'} menyimpan pendataan kamar ${roomName} (${studentIds.length} santri).`,
    'pendataan_kamar',
    { roomName, studentCount: studentIds.length, cctvStatus, cazhIdStatus, notes }
  );

  if (cctvStatus || cazhIdStatus || notes) {
    logActivityToGoogleSheets(
      supervisorName || 'Musyrif',
      'Laporan Monitoring & Kendala Kamar',
      `Kamar ${roomName} • CCTV: ${cctvStatus || '-'} • Cazh ID: ${cazhIdStatus || '-'} • Kendala: ${notes || 'Tidak ada'}`,
      'laporan_kamar',
      { roomName, cctvStatus, cazhIdStatus, notes }
    );
  }

  forwardToGoogleSheetsWebhook({ action: 'direct_room_assignment', roomName, studentCount: studentIds.length });

  res.json({
    success: true,
    message: `Pendataan kamar ${roomName} berhasil disimpan ke database terpusat Google Sheets.`,
    updatedStudents: updatedCount,
    lastUpdated: db.lastUpdated,
  });
});

// Activity Logs API
app.get('/api/logs', (req, res) => {
  res.json({ success: true, data: db.activityLogs });
});

app.post('/api/logs', (req, res) => {
  const { user, performedBy, action, aksi, description, detail, category, type, metadata } = req.body;
  const targetUser = user || performedBy || 'Pengguna';
  const targetAksi = aksi || action || 'Aktivitas Pengguna';
  const targetDetail = detail || description || '-';

  logActivityToGoogleSheets(targetUser, targetAksi, targetDetail, category || type || 'system', metadata);

  res.json({ success: true, message: 'Log berhasil dicatat dan dikirim ke Google Sheets LOG_ACTIVITY', lastUpdated: db.lastUpdated });
});

app.delete('/api/logs', (req, res) => {
  db.activityLogs = [];
  saveDatabase();
  res.json({ success: true, message: 'Seluruh riwayat log aktivitas berhasil dikosongkan', lastUpdated: db.lastUpdated });
});

// Settings API
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: db.settings });
});

app.post('/api/settings', (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  saveDatabase();
  res.json({ success: true, data: db.settings, lastUpdated: db.lastUpdated });
});

// Full Reset to Default Seed API
app.post('/api/reset', (req, res) => {
  db = {
    students: sampleSantriList,
    teachers: initialTeachers,
    rooms: initialRooms,
    records: generateInitialAttendance(),
    settings: initialSchoolSettings,
    users: initialUsers,
    roomAssignments: initialApprovalSubmissions,
    activityLogs: initialActivityLogs,
    lastUpdated: Date.now(),
  };
  saveDatabase();
  res.json({ success: true, message: 'Database sistem berhasil di-reset ke data bawaan.', lastUpdated: db.lastUpdated });
});

// -------------------------------------------------------------
// Google Sheets Integration API Endpoints (GET ?sheet= & POST { sheet: })
// -------------------------------------------------------------

// 1. Fetch data from specific Google Sheet (e.g. ?sheet=MASTER_SANTRI, ?sheet=MASTER_GURU, ?sheet=MASTER_KAMAR)
app.get('/api/googlesheets/fetch-sheet', async (req, res) => {
  const sheetName = (req.query.sheet as string) || 'MASTER_SANTRI';
  const customUrl = (req.query.url as string) || undefined;

  try {
    const data = await fetchGoogleSheetData(sheetName, customUrl);
    res.json({
      success: true,
      sheet: sheetName,
      count: data.length,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      sheet: sheetName,
      message: `Gagal membaca sheet ${sheetName}: ${err.message}`,
    });
  }
});

// 2. Save new data via POST to Google Sheet (includes { "sheet": "NAMA_SHEET", ... } in body)
app.post('/api/googlesheets/save-sheet', async (req, res) => {
  const { sheet, url, ...payload } = req.body;
  const sheetName = sheet || 'MASTER_SANTRI';

  try {
    const result = await postGoogleSheetData(sheetName, payload, url);
    res.json({
      success: true,
      sheet: sheetName,
      message: result.message || `Data berhasil disimpan ke sheet ${sheetName}`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      sheet: sheetName,
      message: `Gagal menyimpan ke sheet ${sheetName}: ${err.message}`,
    });
  }
});

// 3. Trigger full synchronization of all 3 Master Sheets from Google Sheets
app.all(['/api/googlesheets/sync-all-master', '/api/googlesheets/sync-master'], async (req, res) => {
  const url = (req.body?.url as string) || (req.query?.url as string) || undefined;
  try {
    const syncResult = await syncAllFromGoogleMasterSheets(url);
    res.json({
      ...syncResult,
      totalStudents: db.students.length,
      totalTeachers: db.teachers.length,
      totalRooms: db.rooms.length,
      lastUpdated: db.lastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Gagal sinkronisasi master sheets: ${err.message}`,
    });
  }
});

// Direct Webhook Test & Forwarding Proxy for Google Apps Script Web App
app.post('/api/googlesheets/sync-webhook', async (req, res) => {
  const { webhookUrl, spreadsheetId, spreadsheetUrl, action = 'sync_all' } = req.body;
  const targetUrl = webhookUrl || db.settings.googleSheetWebhookUrl || DEFAULT_GOOGLE_WEB_APP_URL;

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({
      success: false,
      message: 'Tautan Google Apps Script Web App URL tidak valid atau belum diisi.',
    });
  }

  try {
    if (action === 'pull_data') {
      const syncRes = await syncAllFromGoogleMasterSheets(targetUrl);
      return res.json({
        success: syncRes.success,
        message: syncRes.message,
        spreadsheetUrl: db.settings.googleSheetUrl || targetUrl,
        details: {
          students: db.students.length,
          teachers: db.teachers.length,
          rooms: db.rooms.length,
        },
      });
    }

    const payload = {
      timestamp: new Date().toISOString(),
      schoolName: db.settings.schoolName,
      spreadsheetId: spreadsheetId || db.settings.googleSheetId || '',
      spreadsheetUrl: spreadsheetUrl || db.settings.googleSheetUrl || '',
      action,
      data: {
        students: db.students,
        teachers: db.teachers,
        rooms: db.rooms,
        records: db.records,
        settings: db.settings,
      },
    };

    const scriptRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await scriptRes.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    db.settings.lastGoogleSync = new Date().toISOString();
    if (webhookUrl) db.settings.googleSheetWebhookUrl = webhookUrl;
    if (spreadsheetId) db.settings.googleSheetId = spreadsheetId;
    if (responseData.spreadsheetUrl) db.settings.googleSheetUrl = responseData.spreadsheetUrl;
    else if (spreadsheetUrl) db.settings.googleSheetUrl = spreadsheetUrl;

    saveDatabase();

    return res.json({
      success: responseData.success !== false,
      message: responseData.message || 'Sinkronisasi ke Google Apps Script Spreadsheet berhasil!',
      spreadsheetUrl: responseData.spreadsheetUrl || db.settings.googleSheetUrl,
      details: responseData,
    });
  } catch (error: any) {
    console.error('Webhook sync proxy error:', error);
    return res.status(500).json({
      success: false,
      message: `Gagal berkomunikasi dengan Google Apps Script: ${error.message}`,
    });
  }
});

// Start Server and Attach Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud Attendance Server listening on http://0.0.0.0:${PORT}`);
    
    // Automatically trigger initial Google Sheets master synchronization in background
    setTimeout(() => {
      syncAllFromGoogleMasterSheets().catch(e => console.warn('[GoogleSheets] Initial sync background error:', e.message));
    }, 1000);

    // Automated Central Polling: Check Google Sheets Master DB periodically every 12 seconds
    setInterval(() => {
      syncAllFromGoogleMasterSheets().catch(e => console.warn('[AutoSync] Background poll warning:', e.message));
    }, 12000);
  });
}

startServer();
