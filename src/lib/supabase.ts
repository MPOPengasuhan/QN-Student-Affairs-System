import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserAccount, Student, Room, AttendanceRecord, UserRole } from '../types';

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
// DATA MAPPERS (Supports both standard snake_case and camelCase columns)
// ============================================================================

export function mapFromSupabaseUser(row: any): UserAccount {
  return {
    id: String(row.id || `usr-${Date.now()}`),
    username: String(row.username || ''),
    name: String(row.name || row.nama || ''),
    password: String(row.password || ''),
    role: (String(row.role || 'GURU').toUpperCase()) as UserRole,
    gender: (row.gender || row.jenis_kelamin || 'L') === 'P' ? 'P' : 'L',
    teacherCode: row.teacher_code || row.teacherCode || row.kode_guru || undefined,
    nip: row.nip || undefined,
    phone: row.phone || row.no_hp || undefined,
    position: row.position || row.jabatan || undefined,
    positionDetail: row.position_detail || row.positionDetail || undefined,
    assignedRoomName: row.assigned_room_name || row.assignedRoomName || row.kamar || undefined,
    avatarUrl: row.avatar_url || row.avatarUrl || row.foto || undefined,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : (row.isActive !== undefined ? Boolean(row.isActive) : true),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    lastLogin: row.last_login || row.lastLogin || undefined,
  };
}

export function mapToSupabaseUser(u: UserAccount): Record<string, any> {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    password: u.password,
    role: u.role,
    gender: u.gender,
    teacher_code: u.teacherCode || null,
    nip: u.nip || null,
    phone: u.phone || null,
    position: u.position || null,
    position_detail: u.positionDetail || null,
    assigned_room_name: u.assignedRoomName || null,
    avatar_url: u.avatarUrl || null,
    is_active: u.isActive,
    created_at: u.createdAt,
    last_login: u.lastLogin || null,
  };
}

export function mapFromSupabaseSantri(row: any): Student {
  const nis = String(row.nis || row.nip_pondok || row.nipPondok || '');
  return {
    id: String(row.id || nis || `st-${Date.now()}`),
    nis,
    nisn: row.nisn ? String(row.nisn) : undefined,
    name: String(row.name || row.nama || ''),
    className: String(row.class_name || row.className || row.kelas || 'Umum'),
    roomName: row.room_name || row.roomName || row.kamar || row.nama_kamar || '-',
    gender: (row.gender || row.jenis_kelamin || 'L') === 'P' ? 'P' : 'L',
    parentPhone: row.parent_phone || row.parentPhone || row.no_hp_ortu || undefined,
    avatarUrl: row.avatar_url || row.avatarUrl || row.foto || undefined,
    qrCodeData: String(row.qr_code_data || row.qrCodeData || row.qrcode || nis),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    nipPondok: row.nip_pondok || row.nipPondok || nis,
    tempat: row.tempat || undefined,
    idb: row.idb || undefined,
    noKartu: row.no_kartu || row.noKartu || row.cazh_id || undefined,
    idIzin: row.id_izin || row.idIzin || undefined,
  };
}

export function mapToSupabaseSantri(s: Student): Record<string, any> {
  return {
    id: s.id,
    nis: s.nis,
    nisn: s.nisn || null,
    name: s.name,
    class_name: s.className,
    room_name: s.roomName || '-',
    gender: s.gender,
    parent_phone: s.parentPhone || null,
    avatar_url: s.avatarUrl || null,
    qr_code_data: s.qrCodeData || s.nis,
    created_at: s.createdAt,
    nip_pondok: s.nipPondok || s.nis,
    no_kartu: s.noKartu || null,
  };
}

export function mapFromSupabaseKamar(row: any): Room {
  const roomNumber = String(row.room_number || row.roomNumber || row.nomor_kamar || row.nama_kamar || row.nama || '');
  return {
    id: String(row.id || `rm-${roomNumber}`),
    roomNumber,
    roomCode: row.room_code || row.roomCode || row.kode_kamar || undefined,
    location: row.location || row.lokasi || undefined,
    gender: (row.gender || row.jenis_kelamin || 'L') === 'P' ? 'P' : 'L',
    building: String(row.building || row.gedung || row.komplek || 'Asrama'),
    capacity: Number(row.capacity || row.kapasitas || 20),
    supervisorName: String(row.supervisor_name || row.supervisorName || row.wali_kamar || row.musyrif || 'Wali Kamar'),
    supervisorCode: row.supervisor_code || row.supervisorCode || row.kode_wali || undefined,
    supervisorPhone: row.supervisor_phone || row.supervisorPhone || row.no_hp_wali || undefined,
    description: row.description || row.deskripsi || undefined,
    isFilled: row.is_filled !== undefined ? Boolean(row.is_filled) : (row.isFilled !== undefined ? Boolean(row.isFilled) : false),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

export function mapToSupabaseKamar(r: Room): Record<string, any> {
  return {
    id: r.id,
    room_number: r.roomNumber,
    room_code: r.roomCode || null,
    location: r.location || null,
    gender: r.gender || 'L',
    building: r.building,
    capacity: r.capacity,
    supervisor_name: r.supervisorName,
    supervisor_code: r.supervisorCode || null,
    supervisor_phone: r.supervisorPhone || null,
    description: r.description || null,
    is_filled: Boolean(r.isFilled),
    created_at: r.createdAt,
  };
}

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
