import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserAccount,
  Student,
  Room,
  Teacher,
  AttendanceRecord,
  UserRole,
  SupabaseUserRow,
  SupabaseMasterGuruRow,
  SupabaseMasterKamarRow,
  SupabaseMasterSantriRow,
} from '../types';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// ============================================================================
// HELPER: USER ROLE PARSER
// ============================================================================

export function parseUserRole(rawRole: any): UserRole {
  if (!rawRole) return 'GURU';
  const clean = String(rawRole).trim().toUpperCase();
  if (clean.includes('ADMIN') || clean.includes('PENGASUHAN')) return 'ADMIN';
  if (clean.includes('MUSYRIF') || clean.includes('WALI_KAMAR') || clean.includes('WALI KAMAR')) return 'WALI_KAMAR';
  if (clean.includes('WALI_KELAS') || clean.includes('WALI KELAS')) return 'WALI_KELAS';
  if (clean.includes('PEMBINA')) return 'PEMBINA';
  if (clean.includes('PIMPINAN')) return 'PIMPINAN';
  if (clean.includes('PIKET')) return 'PIKET';
  if (clean.includes('OPERATOR')) return 'OPERATOR';
  return 'GURU';
}

function determineTeacherRole(jabatan?: string): Teacher['role'] {
  if (!jabatan) return 'Guru';
  const j = jabatan.toLowerCase();
  if (j.includes('pimpinan') || j.includes('mudir')) return 'Pimpinan';
  if (j.includes('pengasuhan')) return 'Pengasuhan';
  if (j.includes('wali kamar') || j.includes('musyrif')) return 'Wali Kamar';
  if (j.includes('staf') || j.includes('staff')) return 'Staf';
  if (j.includes('ustadzah')) return 'Ustadzah';
  if (j.includes('ustadz')) return 'Ustadz';
  return 'Guru';
}

// ============================================================================
// 1. TABEL: users (no, username, nama_pengguna, role_akses, kamar_binaan, password)
// ============================================================================

export function mapFromSupabaseUser(row: any): UserAccount {
  const username = String(row.username || '');
  const role = parseUserRole(row.role_akses || row.role);
  const name = String(row.nama_pengguna || row.name || row.nama || username);
  const password = String(row.password || '12345');
  const kamarBinaan = row.kamar_binaan || row.assigned_room_name || row.kamar || undefined;

  return {
    id: String(row.no ? `usr-${row.no}` : row.id || `usr-${username}`),
    no: row.no !== undefined && row.no !== null ? row.no : undefined,
    username,
    name,
    password,
    role,
    gender: (row.gender || row.jenis_kelamin || 'L') === 'P' ? 'P' : 'L',
    teacherCode: row.teacher_code || row.teacherCode || row.kode_guru || (username.startsWith('GR') ? username : undefined),
    nip: row.nip || (username.startsWith('GR') ? username : undefined),
    phone: row.phone || row.no_hp || undefined,
    position: row.position || row.jabatan || (role === 'WALI_KAMAR' ? 'Wali Kamar' : role),
    positionDetail: row.position_detail || row.positionDetail || kamarBinaan || undefined,
    assignedRoomName: kamarBinaan,
    avatarUrl: row.avatar_url || row.avatarUrl || row.foto || undefined,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    lastLogin: row.last_login || row.lastLogin || undefined,
  };
}

export function mapToSupabaseUser(u: UserAccount): SupabaseUserRow {
  const row: SupabaseUserRow = {
    username: u.username,
    nama_pengguna: u.name,
    role_akses: u.role,
    kamar_binaan: u.assignedRoomName || '',
    password: u.password,
  };
  if (u.no !== undefined && u.no !== null && u.no !== '') {
    row.no = u.no;
  }
  return row;
}

// ============================================================================
// 2. TABEL: master_guru (no, kode, nama_guru, jk, status, jabatan, ket)
// ============================================================================

export function mapFromSupabaseGuru(row: any): Teacher {
  const kode = String(row.kode || row.teacher_code || row.nip || '');
  const namaGuru = String(row.nama_guru || row.name || row.nama || '');
  const jk = (row.jk || row.gender || 'L') === 'P' ? 'P' : 'L';
  const status = String(row.status || 'Aktif');
  const jabatan = String(row.jabatan || row.position || 'Guru');
  const ket = String(row.ket || row.position_detail || '');

  return {
    id: String(row.no ? `guru-${row.no}` : row.id || `guru-${kode}`),
    no: row.no !== undefined && row.no !== null ? row.no : undefined,
    teacherCode: kode,
    nip: kode,
    name: namaGuru,
    gender: jk,
    status,
    position: jabatan,
    positionDetail: ket,
    subject: jabatan || 'Guru',
    phone: row.phone || row.no_hp || '',
    role: determineTeacherRole(jabatan),
    avatarUrl: row.avatar_url || undefined,
    qrCodeData: kode,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapToSupabaseGuru(t: Teacher): SupabaseMasterGuruRow {
  const row: SupabaseMasterGuruRow = {
    kode: t.teacherCode || t.nip,
    nama_guru: t.name,
    jk: t.gender || 'L',
    status: t.status || 'Aktif',
    jabatan: t.position || 'Guru',
    ket: t.positionDetail || '',
  };
  if (t.no !== undefined && t.no !== null && t.no !== '') {
    row.no = t.no;
  }
  return row;
}

// ============================================================================
// 3. TABEL: master_kamar (no, nama_kamar, lokasi, kode_kamar, jk)
// ============================================================================

export function mapFromSupabaseKamar(row: any): Room {
  const namaKamar = String(row.nama_kamar || row.room_number || row.nama || '');
  const kodeKamar = row.kode_kamar || row.room_code || undefined;
  const lokasi = row.lokasi || row.location || undefined;
  const jk = (row.jk || row.gender || 'L') === 'P' ? 'P' : 'L';
  const building = lokasi ? `Komplek ${lokasi}` : String(row.building || 'Asrama');

  return {
    id: String(row.no ? `rm-${row.no}` : (kodeKamar ? `rm-${kodeKamar}` : `rm-${namaKamar}`)),
    no: row.no !== undefined && row.no !== null ? row.no : undefined,
    roomNumber: namaKamar,
    roomCode: kodeKamar,
    location: lokasi,
    gender: jk,
    building,
    capacity: Number(row.capacity || row.kapasitas || 20),
    supervisorName: String(row.supervisor_name || row.wali_kamar || 'Wali Kamar'),
    supervisorCode: row.supervisor_code || undefined,
    supervisorPhone: row.supervisor_phone || undefined,
    description: row.description || undefined,
    isFilled: row.is_filled !== undefined ? Boolean(row.is_filled) : false,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapToSupabaseKamar(r: Room): SupabaseMasterKamarRow {
  const row: SupabaseMasterKamarRow = {
    nama_kamar: r.roomNumber,
    lokasi: r.location || (r.building ? r.building.replace('Komplek ', '').trim() : ''),
    kode_kamar: r.roomCode || r.roomNumber,
    jk: r.gender || 'L',
  };
  if (r.no !== undefined && r.no !== null && r.no !== '') {
    row.no = r.no;
  }
  return row;
}

// ============================================================================
// 4. TABEL: master_santri (no, nip_pondok, nama_santri, kelas, jk, lokasi, idb, no_kartu, qr_code, id_izin, kode_kamar)
// ============================================================================

export function mapFromSupabaseSantri(row: any): Student {
  const nipPondok = String(row.nip_pondok || row.nis || row.nipPondok || '');
  const namaSantri = String(row.nama_santri || row.name || row.nama || '');
  const kelas = String(row.kelas || row.class_name || 'Umum');
  const jk = (row.jk || row.gender || 'L') === 'P' ? 'P' : 'L';
  const lokasi = row.lokasi || row.tempat || undefined;
  const idb = row.idb !== null && row.idb !== undefined ? String(row.idb) : undefined;
  const noKartu = row.no_kartu !== null && row.no_kartu !== undefined ? String(row.no_kartu) : undefined;
  const qrCode = String(row.qr_code || row.qr_code_data || nipPondok);
  const idIzin = row.id_izin !== null && row.id_izin !== undefined ? String(row.id_izin) : undefined;
  const kodeKamar = row.kode_kamar || row.room_name || row.kamar || '-';

  return {
    id: String(row.no ? `st-${row.no}` : (nipPondok ? `st-${nipPondok}` : `st-${Date.now()}`)),
    no: row.no !== undefined && row.no !== null ? row.no : undefined,
    nis: nipPondok,
    nipPondok,
    nisn: row.nisn ? String(row.nisn) : undefined,
    name: namaSantri,
    className: kelas,
    gender: jk,
    tempat: lokasi,
    idb,
    noKartu,
    qrCodeData: qrCode,
    idIzin,
    roomName: kodeKamar,
    parentPhone: row.parent_phone || undefined,
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapToSupabaseSantri(s: Student): SupabaseMasterSantriRow {
  const row: SupabaseMasterSantriRow = {
    nip_pondok: s.nipPondok || s.nis,
    nama_santri: s.name,
    kelas: s.className,
    jk: s.gender || 'L',
    lokasi: s.tempat || '',
    idb: s.idb || null,
    no_kartu: s.noKartu || null,
    qr_code: s.qrCodeData || s.nipPondok || s.nis,
    id_izin: s.idIzin || null,
    kode_kamar: (s.roomName && s.roomName !== '-') ? s.roomName : null,
  };
  if (s.no !== undefined && s.no !== null && s.no !== '') {
    row.no = s.no;
  }
  return row;
}

// ============================================================================
// TABEL PRESENSI (Optional / Terkait Kehadiran)
// ============================================================================

export function mapFromSupabasePresensi(row: any): AttendanceRecord {
  return {
    id: String(row.id || `att-${Date.now()}`),
    studentId: String(row.student_id || row.studentId || row.santri_id || ''),
    studentNis: String(row.student_nis || row.studentNis || row.nis || ''),
    studentName: String(row.student_name || row.studentName || row.nama_santri || row.nama || ''),
    className: String(row.class_name || row.className || row.kelas || '-'),
    roomName: row.room_name || row.roomName || row.kamar || undefined,
    date: String(row.date || row.tanggal || new Date().toISOString().split('T')[0]),
    timeIn: String(row.time_in || row.timeIn || row.jam_masuk || '00:00:00'),
    timeOut: row.time_out || row.timeOut || row.jam_keluar || undefined,
    status: (row.status || 'hadir') as any,
    notes: row.notes || row.catatan || undefined,
    recordedBy: String(row.recorded_by || row.recordedBy || row.dicatat_oleh || 'Sistem'),
    syncedAt: row.synced_at || row.syncedAt || row.created_at || new Date().toISOString(),
  };
}

export function mapToSupabasePresensi(a: AttendanceRecord): Record<string, any> {
  return {
    id: a.id,
    student_id: a.studentId,
    student_nis: a.studentNis,
    student_name: a.studentName,
    class_name: a.className,
    room_name: a.roomName || null,
    date: a.date,
    time_in: a.timeIn,
    time_out: a.timeOut || null,
    status: a.status,
    notes: a.notes || null,
    recorded_by: a.recordedBy,
    synced_at: a.syncedAt || new Date().toISOString(),
  };
}
