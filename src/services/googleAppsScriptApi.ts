import { Student, Teacher, Room, ActivityLog, AttendanceRecord, RoomAssignmentSubmission } from '../types';

export const GOOGLE_APPS_SCRIPT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbwbvxqA1vroExtxAiYBQXtCSizoZwjb4EMJ1ezgKQEDuVuoKgFtzkgZbwebEFIJer4b/exec';

export interface GasApiResponse<T = any> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  status?: string;
}

class GoogleAppsScriptApiService {
  private endpointUrl: string = GOOGLE_APPS_SCRIPT_WEB_APP_URL;

  public setEndpointUrl(url: string) {
    if (url && url.trim()) {
      this.endpointUrl = url.trim();
    }
  }

  public getEndpointUrl(): string {
    return this.endpointUrl;
  }

  /**
   * 1. GET data from Google Apps Script Web App by sheet name
   * Calls ?sheet=NAMA_SHEET via server proxy or direct fetch
   */
  async fetchSheet<T = any>(sheetName: string): Promise<T[]> {
    try {
      // First try via server proxy (avoids CORS and handles redirects cleanly)
      const proxyUrl = `/api/googlesheets/fetch-sheet?sheet=${encodeURIComponent(sheetName)}&url=${encodeURIComponent(this.endpointUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data as T[];
        }
      }
    } catch (e) {
      console.warn(`[GoogleAppsScriptApi] Proxy fetch failed for ${sheetName}, trying direct:`, e);
    }

    // Direct fallback if proxy is unreachable
    try {
      const directUrl = `${this.endpointUrl}?sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(directUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        return data as T[];
      }
    } catch (e) {
      console.error(`[GoogleAppsScriptApi] Direct fetch failed for ${sheetName}:`, e);
    }

    return [];
  }

  /**
   * 2. POST data to Google Apps Script Web App
   * Format: { "sheet": "NAMA_SHEET", "action": "CREATE", "user": "NamaUser", "data": { ... } }
   */
  async postToSheet(
    sheetName: string,
    data: any,
    user: string = 'Sistem',
    action: string = 'CREATE'
  ): Promise<GasApiResponse> {
    const payload = {
      sheet: sheetName,
      action: action || 'CREATE',
      user: user || 'Pengguna',
      data: data || {},
      // Spread root fields for backward compatibility with older GAS scripts
      ...data,
      url: this.endpointUrl,
    };

    // Try via server proxy
    try {
      const res = await fetch('/api/googlesheets/save-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        return { success: true, message: json.message || 'Data berhasil dikirim ke Google Sheets', data: json.result };
      }
    } catch (e) {
      console.warn(`[GoogleAppsScriptApi] Proxy POST failed for ${sheetName}, trying direct:`, e);
    }

    // Direct fallback
    try {
      const res = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch {}
      return {
        success: true,
        message: json.message || 'Data berhasil dikirim',
        data: json,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Gagal mengirim data ke Google Sheets: ${e.message}`,
      };
    }
  }

  /**
   * 3. Send structured Activity Log to LOG_ACTIVITY sheet
   * Columns: timestamp, user, aksi, detail
   */
  async logActivity(
    user: string,
    aksi: string,
    detail: string,
    category: string = 'system'
  ): Promise<GasApiResponse> {
    const now = new Date();
    const timestamp = now.toISOString();

    const logData = {
      timestamp,
      user: user || 'Pengguna',
      aksi,
      detail,
      category,
    };

    return this.postToSheet('LOG_ACTIVITY', logData, user, 'CREATE');
  }

  /**
   * 4. Fetch and map MASTER_SANTRI -> Student[]
   */
  async getStudents(): Promise<Student[]> {
    const rawRows = await this.fetchSheet<any>('MASTER_SANTRI');
    if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

    return rawRows.map((r, idx) => {
      const nip = String(r.nip_pondok || r.nip || r.nis || r.no_kartu || `ST-${idx + 1}`).trim();
      const nama = String(r.nama_santri || r.nama || r.name || 'Santri').trim();
      const kelas = String(r.kelas || r.className || '1-1').trim();
      const jk = (String(r.jk || r.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P';
      const tempat = String(r.tempat || r.tempat_lokasi || (jk === 'P' ? 'QN1' : 'QN2')).trim();
      const qrCode = String(r.qr_code || r.qrCodeData || r.no_kartu || nip).trim();

      return {
        id: `santri-${idx + 1}-${nip}`,
        nis: nip,
        nipPondok: nip,
        name: nama,
        className: kelas,
        gender: jk,
        tempat,
        idb: r.idb ? String(r.idb).trim() : undefined,
        noKartu: r.no_kartu ? String(r.no_kartu).trim() : undefined,
        qrCodeData: qrCode,
        idIzin: r.id_izin ? String(r.id_izin).trim() : undefined,
        createdAt: new Date().toISOString(),
      };
    });
  }

  /**
   * 5. Fetch and map MASTER_GURU -> Teacher[]
   */
  async getTeachers(): Promise<Teacher[]> {
    const rawRows = await this.fetchSheet<any>('MASTER_GURU');
    if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

    const seen = new Set<string>();
    const teachers: Teacher[] = [];

    rawRows.forEach((r, idx) => {
      const code = String(r.kode_guru || r.kode || r.nip || `GR${String(idx + 1).padStart(3, '0')}`).trim();
      const name = String(r.nama_guru || r.nama || 'Ustadz / Guru').trim();
      if (!code && !name) return;

      const codeKey = code ? code.toUpperCase() : '';
      const nameKey = name ? name.toLowerCase() : '';
      const dedupKey = codeKey || nameKey;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      const jk = (String(r.jk || r.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P';
      const status = String(r.status || 'AKTIF').trim();
      const position = String(r.jabatan || r.position || 'Guru').trim();
      const positionDetail = String(r.ket || r.positionDetail || '').trim();

      let role: Teacher['role'] = 'Guru';
      if (position.toLowerCase().includes('pembina') || position.toLowerCase().includes('pengasuhan')) {
        role = 'Pengasuhan';
      } else if (position.toLowerCase().includes('wali kamar') || position.toLowerCase().includes('musyrif')) {
        role = 'Wali Kamar';
      } else if (position.toLowerCase().includes('pimpinan')) {
        role = 'Pimpinan';
      } else if (jk === 'P') {
        role = 'Ustadzah';
      } else {
        role = 'Ustadz';
      }

      teachers.push({
        id: `tch-${code || idx + 1}`,
        teacherCode: code,
        nip: code,
        name,
        gender: jk,
        status,
        position,
        positionDetail,
        subject: position,
        phone: positionDetail.startsWith('08') || positionDetail.startsWith('+62') ? positionDetail : '',
        role,
        qrCodeData: code,
        createdAt: new Date().toISOString(),
      });
    });

    return teachers;
  }

  /**
   * 6. Fetch and map MASTER_KAMAR -> Room[]
   */
  async getRooms(): Promise<Room[]> {
    const rawRows = await this.fetchSheet<any>('MASTER_KAMAR');
    if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

    return rawRows.map((r, idx) => {
      const name = String(r.nama_kamar || r.nama || `Kamar ${idx + 1}`).trim();
      const code = String(r.kode_kamar || r.kode || `KM-${idx + 1}`).trim();
      const lokasi = String(r.lokasi || r.tempat || 'QN1').trim();
      const jk = (String(r.jk || r.gender || (lokasi.includes('2') ? 'L' : 'P')).toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P';
      const building = lokasi.includes('2') || jk === 'L' ? 'Komplek QN2 (Putra)' : 'Komplek QN1 (Putri)';

      return {
        id: `room-${idx + 1}-${code}`,
        roomNumber: name,
        roomCode: code,
        location: lokasi,
        gender: jk,
        building,
        capacity: 35,
        supervisorName: 'Musyrif / Pembina Kamar',
        supervisorCode: '',
        createdAt: new Date().toISOString(),
      };
    });
  }

  /**
   * 7. Fetch and map LOG_ACTIVITY -> ActivityLog[]
   */
  async getLogs(): Promise<ActivityLog[]> {
    const rawRows = await this.fetchSheet<any>('LOG_ACTIVITY');
    if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

    return rawRows.map((r, idx) => ({
      id: `log-gas-${idx + 1}-${Date.now()}`,
      type: (r.category || r.type || 'system') as any,
      category: (r.category || 'system') as any,
      action: String(r.aksi || r.action || 'Aktivitas'),
      title: String(r.aksi || r.action || 'Aktivitas'),
      description: String(r.detail || r.description || '-'),
      performedBy: String(r.user || r.performedBy || 'Pengguna'),
      timestamp: r.timestamp || new Date().toISOString(),
    }));
  }

  /**
   * Save / Append a new student to MASTER_SANTRI
   */
  async saveStudent(student: Student, user: string = 'Admin'): Promise<GasApiResponse> {
    const row = {
      nip_pondok: student.nipPondok || student.nis,
      nama_santri: student.name,
      kelas: student.className,
      jk: student.gender,
      tempat_lokasi: student.tempat || (student.gender === 'P' ? 'QN1' : 'QN2'),
      idb: student.idb || '',
      nomor_kartu: student.noKartu || '',
      qr_code: student.qrCodeData || student.nis,
      id_izin: student.idIzin || '',
    };
    const res = await this.postToSheet('MASTER_SANTRI', row, user, 'CREATE');
    this.logActivity(user, 'Tambah Santri', `Santri ${student.name} (${student.className}) ditambahkan ke MASTER_SANTRI`, 'santri');
    return res;
  }

  /**
   * Save / Append a new teacher to MASTER_GURU
   */
  async saveTeacher(teacher: Teacher, user: string = 'Admin'): Promise<GasApiResponse> {
    const row = {
      kode_guru: teacher.teacherCode || teacher.nip,
      nama_guru: teacher.name,
      jk: teacher.gender,
      status: teacher.status || 'AKTIF',
      jabatan: teacher.position || 'Guru',
      ket: teacher.positionDetail || teacher.phone || '-',
    };
    const res = await this.postToSheet('MASTER_GURU', row, user, 'CREATE');
    this.logActivity(user, 'Tambah Guru', `Data Guru ${teacher.name} (${teacher.teacherCode}) ditambahkan ke MASTER_GURU`, 'guru');
    return res;
  }

  /**
   * Save / Append a new room to MASTER_KAMAR
   */
  async saveRoom(room: Room, user: string = 'Admin'): Promise<GasApiResponse> {
    const row = {
      nama_kamar: room.roomNumber,
      lokasi: room.location || 'QN1',
      kode_kamar: room.roomCode || room.roomNumber,
      jk: room.gender || 'L',
    };
    const res = await this.postToSheet('MASTER_KAMAR', row, user, 'CREATE');
    this.logActivity(user, 'Tambah Kamar', `Data Kamar ${room.roomNumber} ditambahkan ke MASTER_KAMAR`, 'kamar');
    return res;
  }
}

export const googleAppsScriptApi = new GoogleAppsScriptApiService();
