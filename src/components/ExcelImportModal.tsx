import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Student } from '../types';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileCheck,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface ExcelImportModalProps {
  onClose: () => void;
  onImportSuccess: (importedStudents: Student[], replaceAll: boolean) => void;
  existingCount: number;
}

interface ParsedStudentRow {
  nis: string; // NIP Pondok
  nipPondok?: string;
  nisn: string;
  name: string;
  className: string;
  gender: 'L' | 'P';
  tempat?: string;
  idb?: string;
  noKartu?: string;
  qrCodeData: string; // Kolom I QR Code
  idIzin?: string;
  parentPhone: string;
  avatarUrl: string;
  isValid: boolean;
  validationError?: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  onClose,
  onImportSuccess,
  existingCount,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize column header names
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const handleFile = async (selectedFile: File) => {
    setErrorMsg(null);
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setIsProcessing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        throw new Error('Lembar kerja kosong atau format data tidak terbaca.');
      }

      const rows: ParsedStudentRow[] = jsonData.map((row, index) => {
        let nis = '';
        let nipPondok = '';
        let nisn = '';
        let name = '';
        let className = '4-5';
        let gender: 'L' | 'P' = 'P';
        let tempat = '';
        let idb = '';
        let noKartu = '';
        let qrCodeData = '';
        let idIzin = '';
        let parentPhone = '';
        let avatarUrl = '';

        const keys = Object.keys(row);

        // Check if row has standard indexed/named fields
        for (let kIdx = 0; kIdx < keys.length; kIdx++) {
          const rawKey = keys[kIdx];
          const val = String(row[rawKey] || '').trim();
          const cleanKey = normalizeKey(rawKey);

          if (cleanKey.includes('nippondok') || (cleanKey.includes('nip') && !cleanKey.includes('guru'))) {
            nipPondok = val;
            if (!nis) nis = val;
          } else if (cleanKey === 'nis' || cleanKey.includes('nomorinduk') || cleanKey.includes('stambuk')) {
            nis = val;
          } else if (cleanKey.includes('nisn')) {
            nisn = val;
          } else if (cleanKey.includes('namasantri') || cleanKey.includes('nama') || cleanKey.includes('siswa')) {
            name = val;
          } else if (cleanKey === 'kelas' || cleanKey.includes('kelas') || cleanKey.includes('rombel')) {
            className = val;
          } else if (cleanKey === 'jk' || cleanKey.includes('gender') || cleanKey.includes('jeniskelamin')) {
            const up = val.toUpperCase();
            gender = up.startsWith('P') || up.includes('WANITA') || up.includes('PEREMPUAN') ? 'P' : 'L';
          } else if (cleanKey === 'tempat' || cleanKey.includes('lokasi') || cleanKey.includes('kampus')) {
            tempat = val;
          } else if (cleanKey === 'idb' || cleanKey.includes('idb')) {
            idb = val;
          } else if (cleanKey.includes('nokartu') || cleanKey.includes('kartu') || cleanKey.includes('card')) {
            noKartu = val;
          } else if (cleanKey.includes('qrcode') || cleanKey === 'qr' || cleanKey.includes('kodeqr') || cleanKey.includes('barcode')) {
            qrCodeData = val;
          } else if (cleanKey.includes('idizin') || cleanKey.includes('izin')) {
            idIzin = val;
          } else if (cleanKey.includes('hp') || cleanKey.includes('wa') || cleanKey.includes('telepon') || cleanKey.includes('telp')) {
            parentPhone = val;
          }
        }

        // Positional fallback if headers were slightly different (A: NO, B: NIP PONDOK, C: NAMA, D: KELAS, E: JK, F: TEMPAT, G: IDB, H: NO KARTU, I: QR CODE, J: ID IZIN)
        if (!qrCodeData && keys[8] && row[keys[8]]) {
          qrCodeData = String(row[keys[8]]).trim();
        }
        if (!nipPondok && keys[1] && row[keys[1]]) {
          nipPondok = String(row[keys[1]]).trim();
        }
        if (!nis) {
          nis = nipPondok || qrCodeData || `2025${String(index + 1).padStart(4, '0')}`;
        }
        if (!qrCodeData) {
          qrCodeData = nis;
        }

        // Validation
        let isValid = true;
        let validationError = '';

        if (!name) {
          isValid = false;
          validationError = 'Nama santri tidak boleh kosong';
        } else if (!nis && !qrCodeData) {
          isValid = false;
          validationError = 'NIP/NIS/QR Code santri tidak boleh kosong';
        }

        return {
          nis,
          nipPondok: nipPondok || nis,
          nisn: nisn || nis,
          name,
          className: className || 'Umum',
          gender,
          tempat: tempat || (className.startsWith('4') || className.startsWith('6') ? 'QN2' : 'QN1'),
          idb,
          noKartu,
          qrCodeData,
          idIzin,
          parentPhone,
          avatarUrl,
          isValid,
          validationError,
        };
      });

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setErrorMsg(err.message || 'Gagal membaca file Excel. Pastikan format tabel sesuai.');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        NO: 1,
        'NIP PONDOK': '131232760014268544',
        'NAMA SANTRI': 'KIRANA QURRATU\' AINI',
        KELAS: '4-5',
        JK: 'P',
        TEMPAT: 'QN2',
        IDB: '23192',
        'NO KARTU': '1002435734233363',
        'QR CODE': 'CAZHIDPKYLN9RBQJC',
        'ID IZIN': 'QN2/P/4.5/0413',
      },
      {
        NO: 2,
        'NIP PONDOK': '131232760014268567',
        'NAMA SANTRI': 'MUTIARA ASTIKAWATI',
        KELAS: '4-5',
        JK: 'P',
        TEMPAT: 'QN2',
        IDB: '23250',
        'NO KARTU': '1002435759597367',
        'QR CODE': 'CAZHIDFKTJ29RBWCJ',
        'ID IZIN': 'QN2/P/TFQ.1.1/0359',
      },
      {
        NO: 3,
        'NIP PONDOK': '131232760014268583',
        'NAMA SANTRI': 'PUTRI AISYAH ANNUR',
        KELAS: '4-5',
        JK: 'P',
        TEMPAT: 'QN2',
        IDB: '23279',
        'NO KARTU': '1002435794020190',
        'QR CODE': 'CAZHIDFKP9NLRMQJC',
        'ID IZIN': 'QN2/P/4.5/0417',
      },
      {
        NO: 4,
        'NIP PONDOK': '131232760014258090',
        'NAMA SANTRI': 'AISYAH KHAIRANI AZKA',
        KELAS: '5-1',
        JK: 'P',
        TEMPAT: 'QN1',
        IDB: '12084',
        'NO KARTU': '1002435796457515',
        'QR CODE': 'CAZHIDF3C3KKE6BQCJ',
        'ID IZIN': 'QN1/P/5.1/0472',
      },
      {
        NO: 5,
        'NIP PONDOK': '131232760014271001',
        'NAMA SANTRI': 'MUHAMMAD FAIZ PRATAMA',
        KELAS: '6-1',
        JK: 'L',
        TEMPAT: 'QN2',
        IDB: '24101',
        'NO KARTU': '1002435711223344',
        'QR CODE': 'CAZHIDPMFZ296PUTRA',
        'ID IZIN': 'QN2/L/6.1/0101',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 28 },
      { wch: 10 },
      { wch: 6 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 22 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Santri');

    const filename = `Data_Santri_QN_Template.${format}`;
    XLSX.writeFile(workbook, filename, { bookType: format });
  };

  const handleExecuteImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('Tidak ada baris data valid yang siap diimpor.');
      return;
    }

    const studentsToImport: Student[] = validRows.map((r, i) => ({
      id: `snt-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      nis: r.nis,
      nipPondok: r.nipPondok || r.nis,
      nisn: r.nisn || r.nis,
      name: r.name,
      className: r.className,
      gender: r.gender,
      tempat: r.tempat,
      idb: r.idb,
      noKartu: r.noKartu,
      qrCodeData: r.qrCodeData || r.nis,
      idIzin: r.idIzin,
      parentPhone: r.parentPhone,
      avatarUrl:
        r.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=2563eb&color=fff`,
      createdAt: new Date().toISOString(),
    }));

    onImportSuccess(studentsToImport, importMode === 'replace');
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Import Database Santri (Format Excel Pesantren)
              </h3>
              <p className="text-xs text-slate-400">
                Pondok Pesantren Qotrun Nada • Mendukung NIP Pondok, Tempat (QN1/QN2), IDB, No Kartu, QR Code Presensi (Kolom I), ID Izin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          {/* Step 1: Download Template Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3 max-w-lg">
              <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-950">
                  Format Database Santri Persis Spreadsheet Anda
                </h4>
                <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                  Sistem otomatis mendeteksi kolom: <strong>NO, NIP PONDOK, NAMA SANTRI, KELAS, JK, TEMPAT, IDB, NO KARTU, QR CODE (Kolom I), ID IZIN</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadTemplate('xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template (.xlsx)</span>
              </button>
              <button
                onClick={() => handleDownloadTemplate('csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-blue-800 border border-blue-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Step 2: Drag and Drop Upload Area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                  : fileName
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/80'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                {fileName ? (
                  <FileCheck className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Upload className="w-6 h-6 text-blue-600" />
                )}
              </div>

              {fileName ? (
                <div>
                  <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                    <span className="text-emerald-600">✓ File Terpilih:</span> {fileName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Klik untuk mengganti dengan file Excel / CSV data santri lainnya.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Klik di sini atau seret (drag & drop) file Excel Data Santri Anda
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Langsung upload file spreadsheet asli tanpa perlu ubah nama kolom (.xlsx, .xls, .csv)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 3: Parsed Data Preview & Mode Selector */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Pratinjau Data Santri ({parsedRows.length} Baris)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {validCount} Siap Impor
                    </span>
                    {invalidCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        {invalidCount} Baris Tidak Valid
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kolom I (QR Code) otomatis ditetapkan sebagai QR presensi santri.
                  </p>
                </div>

                {/* Import Mode Radio Options */}
                <div className="flex items-center gap-2 text-xs bg-slate-100 p-1 rounded-xl font-medium">
                  <label
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                      importMode === 'merge'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="hidden"
                    />
                    <span>Perbarui / Tambah (Merge)</span>
                  </label>
                  <label
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="hidden"
                    />
                    <span>Ganti Seluruh Database</span>
                  </label>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto max-h-60 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">No</th>
                      <th className="py-2 px-2.5">NIP Pondok</th>
                      <th className="py-2 px-2.5">Nama Santri</th>
                      <th className="py-2 px-2.5">Kelas</th>
                      <th className="py-2 px-2.5">JK</th>
                      <th className="py-2 px-2.5">Tempat</th>
                      <th className="py-2 px-2.5">IDB</th>
                      <th className="py-2 px-2.5">No Kartu</th>
                      <th className="py-2 px-2.5">QR Code (Presensi)</th>
                      <th className="py-2 px-2.5">ID Izin</th>
                      <th className="py-2 px-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-slate-50 ${
                          !r.isValid ? 'bg-rose-50/60' : ''
                        }`}
                      >
                        <td className="py-1.5 px-2.5 font-mono text-slate-500">{i + 1}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800">{r.nipPondok || r.nis}</td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900">{r.name}</td>
                        <td className="py-1.5 px-2.5 text-slate-700">{r.className}</td>
                        <td className="py-1.5 px-2.5 font-semibold">{r.gender}</td>
                        <td className="py-1.5 px-2.5">{r.tempat || '-'}</td>
                        <td className="py-1.5 px-2.5 font-mono">{r.idb || '-'}</td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-600">{r.noKartu || '-'}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-blue-600 bg-blue-50/50">{r.qrCodeData}</td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-600">{r.idIzin || '-'}</td>
                        <td className="py-1.5 px-2.5 text-right">
                          {r.isValid ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">
                              Valid
                            </span>
                          ) : (
                            <span
                              className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold text-[10px]"
                              title={r.validationError}
                            >
                              {r.validationError || 'Invalid'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importMode === 'replace' && existingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Peringatan:</strong> Mode "Ganti Seluruh Database" akan menghapus {existingCount} data santri lama dan menggantikannya dengan {validCount} santri baru dari file Excel ini.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            {parsedRows.length > 0
              ? `${validCount} santri siap dimasukkan.`
              : 'Pilih file Excel untuk mulai impor.'}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              disabled={validCount === 0 || isProcessing}
              onClick={handleExecuteImport}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all ${
                validCount === 0 || isProcessing
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-200'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {importMode === 'replace'
                      ? `Ganti & Impor ${validCount} Santri`
                      : `Tambahkan ${validCount} Santri`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
