// Google Sheets Synchronization Service (Dual-Mode: Apps Script Webhook + OAuth 2.0 + Excel/Sheets Export)
import { Student, Teacher, Room, AttendanceRecord, SchoolSettings } from '../types';
import * as XLSX from 'xlsx';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export interface GoogleSyncResult {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  method?: 'webhook' | 'oauth' | 'export';
  details?: any;
  importedData?: {
    students?: Student[];
    teachers?: Teacher[];
    rooms?: Room[];
  };
}

export const APPS_SCRIPT_TEMPLATE_CODE = `/**
 * GOOGLE APPS SCRIPT WEBHOOK UNTUK QN STUDENT AFFAIRS SYSTEM
 * Petunjuk Pemasangan:
 * 1. Buka Google Sheets Anda yang sudah dibuat (atau buat baru di drive.google.com).
 * 2. Klik menu 'Ekstensi' (Extensions) > 'Apps Script'.
 * 3. Hapus semua kode default di editor, lalu TEMPELKAN (PASTE) seluruh kode ini.
 * 4. Klik tombol 'Terapkan' (Deploy) > 'Penerapan baru' (New deployment).
 * 5. Pilih jenis 'Aplikasi Web' (Web App).
 * 6. Pada 'Jalankan sebagai' (Execute as), pilih 'Saya' (Me).
 * 7. Pada 'Akses' (Who has access), pilih 'Siapa saja' (Anyone / Anyone with link).
 * 8. Klik 'Terapkan' (Deploy) dan salin URL Aplikasi Web (Web App URL).
 * 9. Tempelkan URL tersebut ke web QN Student Affairs System di menu 'Google Sheets'.
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action || 'sync_all';
    var data = payload.data || {};
    
    // Buka spreadsheet: Coba via Spreadsheet ID / URL jika disediakan, atau aktifkan spreadsheet saat ini
    var ss = null;
    if (payload.spreadsheetId && payload.spreadsheetId.toString().trim() !== '') {
      try {
        ss = SpreadsheetApp.openById(payload.spreadsheetId.toString().trim());
      } catch (errOpenId) {}
    }
    if (!ss && payload.spreadsheetUrl && payload.spreadsheetUrl.toString().trim() !== '') {
      try {
        ss = SpreadsheetApp.openByUrl(payload.spreadsheetUrl.toString().trim());
      } catch (errOpenUrl) {}
    }
    if (!ss) {
      try {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      } catch (errActive) {}
    }
    if (!ss) {
      ss = SpreadsheetApp.create("QN Student Affairs System Database");
    }

    // Aksi: Tarik data dari Google Sheets ke Aplikasi (Pull / Import)
    if (action === 'pull_data') {
      var pulledStudents = [];
      var pulledTeachers = [];
      var pulledRooms = [];
      
      var stSheet = ss.getSheetByName("Data Santri");
      if (stSheet && stSheet.getLastRow() > 1) {
        var stValues = stSheet.getRange(2, 1, stSheet.getLastRow() - 1, 9).getValues();
        for (var si = 0; si < stValues.length; si++) {
          var sRow = stValues[si];
          if (sRow[1] || sRow[3]) { // Ada NIS atau Nama
            pulledStudents.push({
              id: 'st-' + (sRow[1] || ('gen-' + si)),
              nis: String(sRow[1] || ''),
              nisn: String(sRow[2] || ''),
              name: String(sRow[3] || ''),
              className: String(sRow[4] || 'Umum'),
              roomName: String(sRow[5] || '-'),
              gender: String(sRow[6]).toLowerCase().indexOf('p') === 0 ? 'P' : 'L',
              parentPhone: String(sRow[7] || ''),
              qrCodeData: String(sRow[8] || sRow[1] || ''),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      var tcSheet = ss.getSheetByName("Data Guru & Asatidz");
      if (tcSheet && tcSheet.getLastRow() > 1) {
        var tcValues = tcSheet.getRange(2, 1, tcSheet.getLastRow() - 1, 7).getValues();
        for (var ti = 0; ti < tcValues.length; ti++) {
          var tRow = tcValues[ti];
          if (tRow[2]) { // Ada Nama
            pulledTeachers.push({
              id: 'tch-' + (tRow[1] || ('gen-' + ti)),
              nip: String(tRow[1] || ''),
              name: String(tRow[2] || ''),
              subject: String(tRow[3] || ''),
              role: String(tRow[4] || 'Ustadz'),
              gender: String(tRow[5]).toLowerCase().indexOf('p') === 0 ? 'P' : 'L',
              phone: String(tRow[6] || ''),
              qrCodeData: 'TCH-' + String(tRow[1] || ti),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      var rmSheet = ss.getSheetByName("Data Kamar & Asrama");
      if (rmSheet && rmSheet.getLastRow() > 1) {
        var rmValues = rmSheet.getRange(2, 1, rmSheet.getLastRow() - 1, 7).getValues();
        for (var ri = 0; ri < rmValues.length; ri++) {
          var rRow = rmValues[ri];
          if (rRow[1]) { // Ada Nama Kamar
            pulledRooms.push({
              id: 'rm-' + ri,
              roomNumber: String(rRow[1] || ''),
              building: String(rRow[2] || ''),
              capacity: Number(rRow[3]) || 10,
              supervisorName: String(rRow[4] || ''),
              supervisorPhone: String(rRow[5] || ''),
              description: String(rRow[6] || ''),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Data berhasil ditarik dari Google Sheets!",
        spreadsheetUrl: ss.getUrl(),
        data: {
          students: pulledStudents,
          teachers: pulledTeachers,
          rooms: pulledRooms
        },
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Aksi: Kirim & Perbarui Seluruh Sheet (Sync / Push All)
    // 1. Update Sheet: Rekap Presensi
    if (data.records && Array.isArray(data.records)) {
      var sheet1 = getOrCreateSheet(ss, "Rekap Presensi");
      sheet1.clear();
      var attHeaders = ["No", "Tanggal", "NIS", "Nama Santri", "Kelas", "Kamar", "Jam Masuk", "Jam Pulang", "Status", "Keterangan", "Petugas", "Waktu Sinkron"];
      var attRows = [attHeaders];
      for (var i = 0; i < data.records.length; i++) {
        var r = data.records[i];
        attRows.push([
          i + 1,
          r.date || '',
          r.studentNis || '',
          r.studentName || '',
          r.className || '',
          r.roomName || '-',
          r.timeIn || '-',
          r.timeOut || '-',
          (r.status || 'HADIR').toUpperCase(),
          r.notes || '-',
          r.recordedBy || 'QR Scanner Cloud',
          r.syncedAt || new Date().toISOString()
        ]);
      }
      sheet1.getRange(1, 1, attRows.length, attHeaders.length).setValues(attRows);
      formatHeaderRow(sheet1, attHeaders.length, "#059669");
    }
    
    // 2. Update Sheet: Data Santri
    if (data.students && Array.isArray(data.students)) {
      var sheet2 = getOrCreateSheet(ss, "Data Santri");
      sheet2.clear();
      var stHeaders = ["No", "NIS", "NISN", "Nama Santri", "Kelas", "Kamar Asrama", "Gender", "No. WA Wali", "Kode QR"];
      var stRows = [stHeaders];
      for (var j = 0; j < data.students.length; j++) {
        var s = data.students[j];
        stRows.push([
          j + 1,
          s.nis || '',
          s.nisn || '',
          s.name || '',
          s.className || '',
          s.roomName || '-',
          s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          s.parentPhone || '',
          s.qrCodeData || ''
        ]);
      }
      sheet2.getRange(1, 1, stRows.length, stHeaders.length).setValues(stRows);
      formatHeaderRow(sheet2, stHeaders.length, "#2563eb");
    }
    
    // 3. Update Sheet: Data Guru & Asatidz
    if (data.teachers && Array.isArray(data.teachers)) {
      var sheet3 = getOrCreateSheet(ss, "Data Guru & Asatidz");
      sheet3.clear();
      var tcHeaders = ["No", "NIP/NIY", "Nama Asatidz/Guru", "Tugas/Mapel", "Peran", "Gender", "No. WhatsApp"];
      var tcRows = [tcHeaders];
      for (var k = 0; k < data.teachers.length; k++) {
        var t = data.teachers[k];
        tcRows.push([
          k + 1,
          t.nip || '',
          t.name || '',
          t.subject || '',
          t.role || 'Ustadz',
          t.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          t.phone || ''
        ]);
      }
      sheet3.getRange(1, 1, tcRows.length, tcHeaders.length).setValues(tcRows);
      formatHeaderRow(sheet3, tcHeaders.length, "#4f46e5");
    }
    
    // 4. Update Sheet: Data Kamar & Asrama
    if (data.rooms && Array.isArray(data.rooms)) {
      var sheet4 = getOrCreateSheet(ss, "Data Kamar & Asrama");
      sheet4.clear();
      var rmHeaders = ["No", "Nama Kamar", "Gedung/Komplek", "Kapasitas", "Wali Kamar / Musyrif", "No. HP Musyrif", "Keterangan"];
      var rmRows = [rmHeaders];
      for (var l = 0; l < data.rooms.length; l++) {
        var rm = data.rooms[l];
        rmRows.push([
          l + 1,
          rm.roomNumber || '',
          rm.building || '',
          rm.capacity || 0,
          rm.supervisorName || '',
          rm.supervisorPhone || '-',
          rm.description || '-'
        ]);
      }
      sheet4.getRange(1, 1, rmRows.length, rmHeaders.length).setValues(rmRows);
      formatHeaderRow(sheet4, rmHeaders.length, "#d97706");
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data berhasil disinkronkan ke Google Sheets",
      spreadsheetUrl: ss.getUrl(),
      spreadsheetId: ss.getId(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "QN Student Affairs System Webhook",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function formatHeaderRow(sheet, numCols, color) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground(color);
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
  try {
    sheet.autoResizeColumns(1, numCols);
  } catch (e) {}
}
`;

class GoogleSheetsService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // 1. Sheet-Specific Reading via GET ?sheet=NAMA_SHEET
  async fetchSheet(sheetName: string, customUrl?: string): Promise<{ success: boolean; data: any[]; count: number; message?: string }> {
    try {
      const url = `/api/googlesheets/fetch-sheet?sheet=${encodeURIComponent(sheetName)}${customUrl ? `&url=${encodeURIComponent(customUrl)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        return {
          success: true,
          data: Array.isArray(json.data) ? json.data : [],
          count: json.count || (Array.isArray(json.data) ? json.data.length : 0),
          message: `Berhasil membaca sheet ${sheetName}`,
        };
      }
      return {
        success: false,
        data: [],
        count: 0,
        message: json.message || `Gagal membaca sheet ${sheetName}`,
      };
    } catch (e: any) {
      return {
        success: false,
        data: [],
        count: 0,
        message: `Kendala jaringan: ${e.message}`,
      };
    }
  }

  // 2. Sheet-Specific Saving via POST with { "sheet": "NAMA_SHEET", ... }
  async saveToSheet(sheetName: string, rowData: any, customUrl?: string): Promise<{ success: boolean; message: string; result?: any }> {
    try {
      const res = await fetch('/api/googlesheets/save-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: sheetName,
          url: customUrl,
          ...rowData,
        }),
      });
      const json = await res.json();
      return {
        success: res.ok && json.success !== false,
        message: json.message || `Data berhasil dikirim ke sheet ${sheetName}`,
        result: json.result,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Kendala jaringan saat menyimpan ke sheet: ${e.message}`,
      };
    }
  }

  // 3. Central Synchronization of all 3 Master Sheets (MASTER_SANTRI, MASTER_GURU, MASTER_KAMAR)
  async syncAllMasterData(customUrl?: string): Promise<{ success: boolean; message: string; counts?: { students: number; teachers: number; rooms: number } }> {
    try {
      const res = await fetch('/api/googlesheets/sync-all-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customUrl }),
      });
      const json = await res.json();
      return {
        success: res.ok && json.success,
        message: json.message || 'Sinkronisasi master data berhasil!',
        counts: json.counts,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Kendala jaringan saat sinkronisasi master: ${e.message}`,
      };
    }
  }

  // 4. Webhook Direct Sync via Server Proxy (Solves CORS and handles automated sync flawlessly)
  async syncViaWebhook(
    webhookUrl: string,
    data: {
      students: Student[];
      teachers: Teacher[];
      rooms: Room[];
      records: AttendanceRecord[];
      settings: SchoolSettings;
    },
    spreadsheetId?: string,
    spreadsheetUrl?: string
  ): Promise<GoogleSyncResult> {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return {
        success: false,
        message: 'Masukkan URL Web App Google Apps Script yang valid terlebih dahulu.',
      };
    }

    try {
      const res = await fetch('/api/googlesheets/sync-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          spreadsheetId: spreadsheetId || data.settings.googleSheetId,
          spreadsheetUrl: spreadsheetUrl || data.settings.googleSheetUrl,
          action: 'sync_all',
          students: data.students,
          teachers: data.teachers,
          rooms: data.rooms,
          records: data.records,
          settings: data.settings,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return {
          success: true,
          method: 'webhook',
          message: 'Sinkronisasi berhasil! Seluruh data Santri, Asatidz, Kamar, & Presensi telah tersimpan di Google Sheets.',
          spreadsheetUrl: json.spreadsheetUrl,
          spreadsheetId: json.details?.spreadsheetId,
        };
      } else {
        return {
          success: false,
          method: 'webhook',
          message: json.message || 'Gagal mengirim data ke Google Sheets.',
        };
      }
    } catch (e: any) {
      return {
        success: false,
        method: 'webhook',
        message: `Terjadi kendala jaringan: ${e.message}`,
      };
    }
  }

  // Pull data from Google Sheets into the system
  async pullViaWebhook(
    webhookUrl: string,
    settings: SchoolSettings
  ): Promise<GoogleSyncResult> {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return {
        success: false,
        message: 'Masukkan URL Web App Google Apps Script yang valid terlebih dahulu.',
      };
    }

    try {
      const res = await fetch('/api/googlesheets/sync-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          spreadsheetId: settings.googleSheetId,
          spreadsheetUrl: settings.googleSheetUrl,
          action: 'pull_data',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return {
          success: true,
          method: 'webhook',
          message: json.message || 'Data berhasil diimpor dari Google Sheets!',
          spreadsheetUrl: json.spreadsheetUrl,
          importedData: json.details?.data,
        };
      } else {
        return {
          success: false,
          method: 'webhook',
          message: json.message || 'Gagal menarik data dari Google Sheets.',
        };
      }
    } catch (e: any) {
      return {
        success: false,
        method: 'webhook',
        message: `Terjadi kendala jaringan: ${e.message}`,
      };
    }
  }

  // 2. Client-Side OAuth Google Sheets API Sync
  async requestOAuthAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    return new Promise((resolve) => {
      try {
        if (!window.google?.accounts?.oauth2) {
          resolve(null);
          return;
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: '482974658850-n058vh2ui5qs002i04eelvqvefi210hs.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.error) {
              console.error('Token callback error:', response.error);
              resolve(null);
              return;
            }
            this.accessToken = response.access_token;
            this.tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;
            resolve(this.accessToken);
          },
        });

        client.requestAccessToken({ prompt: '' });
      } catch (err) {
        console.error('Error requesting access token:', err);
        resolve(null);
      }
    });
  }

  async syncViaOAuth(
    spreadsheetId: string | undefined,
    data: {
      students: Student[];
      teachers: Teacher[];
      rooms: Room[];
      records: AttendanceRecord[];
      settings: SchoolSettings;
    }
  ): Promise<GoogleSyncResult> {
    try {
      const token = await this.requestOAuthAccessToken();
      if (!token) {
        return {
          success: false,
          method: 'oauth',
          message: 'Autentikasi Google Login belum disetujui. Anda juga dapat menggunakan metode Webhook Google Apps Script di atas.',
        };
      }

      let activeId = spreadsheetId;
      let activeUrl = data.settings.googleSheetUrl;

      // Create new sheet ONLY if no spreadsheet ID provided
      if (!activeId) {
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: { title: `QN Student Affairs Database - ${data.settings.schoolName}` },
            sheets: [
              { properties: { title: 'Rekap Presensi' } },
              { properties: { title: 'Data Santri' } },
              { properties: { title: 'Data Guru & Asatidz' } },
              { properties: { title: 'Data Kamar & Asrama' } },
            ],
          }),
        });

        if (!createRes.ok) {
          const errJson = await createRes.json();
          throw new Error(errJson.error?.message || 'Gagal membuat Google Spreadsheet baru.');
        }

        const sheetData = await createRes.json();
        activeId = sheetData.spreadsheetId;
        activeUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${activeId}/edit`;
      }

      // Format sheets payload
      const attRows = [
        ['No', 'Tanggal', 'NIS', 'Nama Santri', 'Kelas', 'Kamar', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan', 'Petugas', 'Waktu Sinkron'],
        ...data.records.map((r, i) => [
          i + 1,
          r.date,
          r.studentNis,
          r.studentName,
          r.className,
          r.roomName || '-',
          r.timeIn || '-',
          r.timeOut || '-',
          r.status.toUpperCase(),
          r.notes || '-',
          r.recordedBy || 'Cloud QR Scanner',
          r.syncedAt || new Date().toISOString(),
        ]),
      ];

      const stRows = [
        ['No', 'NIS', 'NISN', 'Nama Santri', 'Kelas', 'Kamar', 'Gender', 'No. WA Wali', 'Kode QR'],
        ...data.students.map((s, i) => [
          i + 1,
          s.nis,
          s.nisn,
          s.name,
          s.className,
          s.roomName || '-',
          s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          s.parentPhone,
          s.qrCodeData,
        ]),
      ];

      const tcRows = [
        ['No', 'NIP/NIY', 'Nama Guru/Asatidz', 'Tugas/Mapel', 'Peran', 'Gender', 'No. WA'],
        ...data.teachers.map((t, i) => [
          i + 1,
          t.nip,
          t.name,
          t.subject,
          t.role,
          t.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          t.phone,
        ]),
      ];

      const rmRows = [
        ['No', 'Nomor Kamar', 'Gedung Asrama', 'Kapasitas', 'Musyrif / Wali Kamar', 'No. HP Musyrif', 'Keterangan'],
        ...data.rooms.map((rm, i) => [
          i + 1,
          rm.roomNumber,
          rm.building,
          rm.capacity,
          rm.supervisorName,
          rm.supervisorPhone || '-',
          rm.description || '-',
        ]),
      ];

      const batchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${activeId}/values:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: [
              { range: 'Rekap Presensi!A1:L', values: attRows },
              { range: 'Data Santri!A1:I', values: stRows },
              { range: 'Data Guru & Asatidz!A1:G', values: tcRows },
              { range: 'Data Kamar & Asrama!A1:G', values: rmRows },
            ],
          }),
        }
      );

      if (!batchRes.ok) {
        const err = await batchRes.json();
        throw new Error(err.error?.message || 'Gagal mengupdate lembar kerja Google Sheets.');
      }

      return {
        success: true,
        method: 'oauth',
        message: 'Data berhasil disinkronkan ke Google Sheets!',
        spreadsheetId: activeId,
        spreadsheetUrl: activeUrl,
      };
    } catch (e: any) {
      return {
        success: false,
        method: 'oauth',
        message: e.message || 'Gagal sinkronisasi melalui Google Sheets API.',
      };
    }
  }

  // 3. Export Comprehensive Excel File (.xlsx) with all 4 formatted sheets
  exportMultiSheetExcel(data: {
    students: Student[];
    teachers: Teacher[];
    rooms: Room[];
    records: AttendanceRecord[];
    settings: SchoolSettings;
  }) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Rekap Presensi
    const attData = [
      ['No', 'Tanggal', 'NIS', 'Nama Santri', 'Kelas', 'Kamar', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan', 'Petugas'],
      ...data.records.map((r, i) => [
        i + 1,
        r.date,
        r.studentNis,
        r.studentName,
        r.className,
        r.roomName || '-',
        r.timeIn || '-',
        r.timeOut || '-',
        r.status.toUpperCase(),
        r.notes || '-',
        r.recordedBy || 'Cloud QR Scanner',
      ]),
    ];
    const wsAtt = XLSX.utils.aoa_to_sheet(attData);
    XLSX.utils.book_append_sheet(wb, wsAtt, 'Rekap Presensi');

    // Sheet 2: Data Santri
    const stData = [
      ['No', 'NIS', 'NISN', 'Nama Santri', 'Kelas', 'Kamar Asrama', 'Gender', 'No. WA Wali', 'Kode QR'],
      ...data.students.map((s, i) => [
        i + 1,
        s.nis,
        s.nisn,
        s.name,
        s.className,
        s.roomName || '-',
        s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        s.parentPhone,
        s.qrCodeData,
      ]),
    ];
    const wsSt = XLSX.utils.aoa_to_sheet(stData);
    XLSX.utils.book_append_sheet(wb, wsSt, 'Data Santri');

    // Sheet 3: Dewan Asatidz
    const tcData = [
      ['No', 'NIP/NIY', 'Nama Guru/Asatidz', 'Tugas/Mapel', 'Peran', 'Gender', 'No. WA'],
      ...data.teachers.map((t, i) => [
        i + 1,
        t.nip,
        t.name,
        t.subject,
        t.role,
        t.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        t.phone,
      ]),
    ];
    const wsTc = XLSX.utils.aoa_to_sheet(tcData);
    XLSX.utils.book_append_sheet(wb, wsTc, 'Dewan Asatidz');

    // Sheet 4: Kamar Asrama
    const rmData = [
      ['No', 'Nama Kamar', 'Gedung Asrama', 'Kapasitas', 'Musyrif / Wali Kamar', 'No. HP Musyrif', 'Keterangan'],
      ...data.rooms.map((rm, i) => [
        i + 1,
        rm.roomNumber,
        rm.building,
        rm.capacity,
        rm.supervisorName,
        rm.supervisorPhone || '-',
        rm.description || '-',
      ]),
    ];
    const wsRm = XLSX.utils.aoa_to_sheet(rmData);
    XLSX.utils.book_append_sheet(wb, wsRm, 'Kamar Asrama');

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `QN_Student_Affairs_Database_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}

export const googleSheetsService = new GoogleSheetsService();

