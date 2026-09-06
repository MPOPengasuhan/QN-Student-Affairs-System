import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Teacher } from '../types';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  Trash2,
  UserCheck,
} from 'lucide-react';

interface TeacherExcelImportModalProps {
  onClose: () => void;
  onImportSuccess: (importedTeachers: Teacher[], replaceAll: boolean) => void;
  existingCount: number;
}

interface ParsedTeacherRow {
  teacherCode: string;
  nip: string;
  name: string;
  gender: 'L' | 'P';
  status: string;
  position: string;
  positionDetail: string;
  subject: string;
  role: 'Guru' | 'Ustadz' | 'Ustadzah' | 'Wali Kamar' | 'Pengasuhan' | 'Staf' | 'Pimpinan';
  phone: string;
  isValid: boolean;
  validationError?: string;
}

export const TeacherExcelImportModal: React.FC<TeacherExcelImportModalProps> = ({
  onClose,
  onImportSuccess,
  existingCount,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedTeacherRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        throw new Error('Lembar kerja kosong atau format data tidak terbaca.');
      }

      const rows: ParsedTeacherRow[] = jsonData.map((row, index) => {
        let teacherCode = '';
        let nip = '';
        let name = '';
        let gender: 'L' | 'P' = 'L';
        let status = 'AKTIF';
        let position = 'GURU MAPEL';
        let positionDetail = '';
        let subject = '';
        let role: 'Guru' | 'Ustadz' | 'Ustadzah' | 'Wali Kamar' | 'Pengasuhan' | 'Staf' | 'Pimpinan' = 'Guru';
        let phone = '';

        const keys = Object.keys(row);

        for (const rawKey of keys) {
          const val = String(row[rawKey] || '').trim();
          const cleanKey = normalizeKey(rawKey);

          if (cleanKey === 'kode' || cleanKey === 'kodeguru' || cleanKey.includes('kodeguru') || cleanKey.includes('kodeustadz')) {
            teacherCode = val;
            if (!nip) nip = val;
          } else if (cleanKey === 'nip' || cleanKey.includes('niy') || cleanKey.includes('nomorinduk')) {
            nip = val;
            if (!teacherCode) teacherCode = val;
          } else if (cleanKey.includes('nama') || cleanKey.includes('guru') || cleanKey.includes('asatidz') || cleanKey.includes('ustadz')) {
            name = val;
          } else if (cleanKey === 'jk' || cleanKey.includes('gender') || cleanKey.includes('jeniskelamin')) {
            const lowGen = val.toLowerCase();
            gender = lowGen.includes('p') || lowGen.includes('perempuan') || lowGen.includes('female') || lowGen.includes('akhwat') ? 'P' : 'L';
          } else if (cleanKey === 'status' || cleanKey.includes('statuskepegawaian') || cleanKey.includes('keaktifan')) {
            status = val || 'AKTIF';
          } else if (cleanKey === 'jabatan' || cleanKey.includes('statusjabatan') || cleanKey.includes('tugasutama')) {
            position = val || 'GURU MAPEL';
          } else if (cleanKey === 'ket' || cleanKey.includes('ketjabatan') || cleanKey.includes('keteranganjabatan') || cleanKey.includes('walikelas')) {
            positionDetail = val;
          } else if (cleanKey.includes('mapel') || cleanKey.includes('subject') || cleanKey.includes('pelajaran')) {
            subject = val;
          } else if (cleanKey.includes('hp') || cleanKey.includes('wa') || cleanKey.includes('telp') || cleanKey.includes('phone')) {
            phone = val;
          }
        }

        // Positional fallback for standard table (A: KODE, B: NAMA, C: JK, D: STATUS JABATAN, E: KET JABATAN)
        if (!teacherCode && keys[0] && row[keys[0]]) teacherCode = String(row[keys[0]]).trim();
        if (!name && keys[1] && row[keys[1]]) name = String(row[keys[1]]).trim();
        if (!nip) nip = teacherCode || `GR${String(index + 1).padStart(3, '0')}`;
        if (!teacherCode) teacherCode = nip;

        // Determine system role from position and gender
        const posLow = (position || '').toLowerCase();
        if (posLow.includes('pimpinan') || posLow.includes('direktur') || posLow.includes('pengasuh pondok')) {
          role = 'Pimpinan';
        } else if (posLow.includes('wali kamar') || posLow.includes('musyrif') || posLow.includes('musyri')) {
          role = 'Wali Kamar';
        } else if (posLow.includes('pengasuhan') || posLow.includes('keamanan') || posLow.includes('kesantrian')) {
          role = 'Pengasuhan';
        } else if (gender === 'P') {
          role = 'Ustadzah';
        } else {
          role = 'Ustadz';
        }

        const isValid = name.length > 0;
        const validationError = !isValid ? 'Nama Guru/Asatidz wajib terisi' : undefined;

        return {
          teacherCode,
          nip,
          name,
          gender,
          status,
          position,
          positionDetail,
          subject: subject || (positionDetail ? `Wali ${positionDetail}` : position),
          role,
          phone,
          isValid,
          validationError,
        };
      });

      setParsedRows(rows);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses file Excel.');
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

  const downloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const templateData = [
      {
        'KODE GURU': 'GR006',
        'NAMA GURU': 'USTADZ AHMAD FAUZAN, M.Pd.I',
        JK: 'L',
        'STATUS JABATAN': 'WALI KELAS',
        'KET JABATAN': '7-A (KMI 1)',
        'NO WA / HP': '081234567891',
      },
      {
        'KODE GURU': 'GR027',
        'NAMA GURU': 'USTADZAH SITI NUR HALIMAH, S.Pd',
        JK: 'P',
        'STATUS JABATAN': 'WALI KELAS',
        'KET JABATAN': '8-B (KMI 2 Putri)',
        'NO WA / HP': '081298765433',
      },
      {
        'KODE GURU': 'GR012',
        'NAMA GURU': 'USTADZ MUHAMMAD RIDWAN, Lc',
        JK: 'L',
        'STATUS JABATAN': 'WALI KAMAR',
        'KET JABATAN': 'Kamar Abu Bakar 01',
        'NO WA / HP': '085712345679',
      },
      {
        'KODE GURU': 'GR001',
        'NAMA GURU': 'DR. KH. BURHANUDDIN MARZUKI',
        JK: 'L',
        'STATUS JABATAN': 'PIMPINAN PONDOK',
        'KET JABATAN': 'Pengasuh Utama Pesantren',
        'NO WA / HP': '081122334455',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 6 }, { wch: 20 }, { wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Data Guru & Asatidz');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'Template_Data_Guru_QN.xlsx');
    } else {
      XLSX.writeFile(wb, 'Template_Data_Guru_QN.csv', { bookType: 'csv' });
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);

  const handleExecuteImport = () => {
    if (validRows.length === 0) return;

    const newTeachers: Teacher[] = validRows.map((r, index) => ({
      id: `tch-${Date.now()}-${index}`,
      teacherCode: r.teacherCode,
      nip: r.nip,
      name: r.name,
      gender: r.gender,
      status: r.status,
      position: r.position,
      positionDetail: r.positionDetail,
      subject: r.subject,
      role: r.role,
      phone: r.phone,
      qrCodeData: r.teacherCode || r.nip,
      createdAt: new Date().toISOString(),
    }));

    onImportSuccess(newTeachers, importMode === 'replace');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Import Data Guru & Asatidz
              </h3>
              <p className="text-xs text-slate-500">
                Unggah file Excel (.xlsx / .xls / .csv) untuk menambah atau memperbarui data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Download Template Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-900">
              <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold">
                Belum punya format file? Unduh template resmi kami:
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => downloadTemplate('xlsx')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                Template Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Upload Area */}
          {!file && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/40'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">
                Pilih atau Tarik File Excel ke sini
              </p>
              <p className="text-xs text-slate-500 mb-2">
                Mendukung format .xlsx, .xls, dan .csv
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-2xs">
                Jelajahi File Komputer / HP
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* File Selected & Preview */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{fileName}</p>
                    <p className="text-[11px] text-slate-500">
                      {isProcessing ? 'Memproses data...' : `${parsedRows.length} baris guru terbaca`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Ganti File</span>
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">Data Siap Impor</p>
                    <p className="text-sm font-bold text-emerald-900">{validRows.length} Orang</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-slate-600 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">Data Saat Ini</p>
                    <p className="text-sm font-bold text-slate-900">{existingCount} Orang</p>
                  </div>
                </div>
              </div>

              {/* Import Mode Selection */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-800 block">Metode Impor:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      importMode === 'merge'
                        ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold">Gabungkan & Perbarui</p>
                      <p className="text-[11px] text-slate-500 font-normal">
                        Tambahkan guru baru dan perbarui jika NIP sama
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      importMode === 'replace'
                        ? 'border-rose-600 bg-rose-50/60 font-semibold text-rose-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-rose-700">Ganti Semua Data</p>
                      <p className="text-[11px] text-slate-500 font-normal">
                        Hapus data guru lama dan gantikan dengan file ini
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
                  <span>Pratinjau Data Guru ({validRows.length})</span>
                  <span className="text-[10px] text-slate-500 font-normal">Menampilkan maks. 10 baris</span>
                </div>
                <div className="max-h-48 overflow-y-auto overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2">Kode</th>
                        <th className="p-2">Nama Guru</th>
                        <th className="p-2">JK</th>
                        <th className="p-2">Jabatan</th>
                        <th className="p-2">Ket. Jabatan</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 10).map((r, i) => (
                        <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                          <td className="p-2 font-mono font-bold text-[11px] text-indigo-700">{r.teacherCode || r.nip}</td>
                          <td className="p-2 font-semibold text-slate-900">{r.name}</td>
                          <td className="p-2">{r.gender}</td>
                          <td className="p-2 text-slate-700 font-medium">{r.position}</td>
                          <td className="p-2 text-slate-600 font-mono text-[11px]">{r.positionDetail || '-'}</td>
                          <td className="p-2">
                            {r.isValid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                {r.status || 'Valid'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                                {r.validationError}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={validRows.length === 0 || isProcessing}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition ${
              validRows.length > 0 && !isProcessing
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Impor {validRows.length} Data Guru
          </button>
        </div>
      </div>
    </div>
  );
};
