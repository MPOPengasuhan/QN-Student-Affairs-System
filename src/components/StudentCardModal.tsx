import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, SchoolSettings } from '../types';
import { X, Printer, QrCode, ShieldCheck } from 'lucide-react';

interface StudentCardModalProps {
  student: Student;
  settings: SchoolSettings;
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  student,
  settings,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-xs sm:text-sm">Kartu Pelajar & Kode QR Siswa</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Preview Container */}
        <div className="p-6 bg-slate-50 flex flex-col items-center justify-center">
          {/* Printable Student ID Card */}
          <div
            ref={cardRef}
            id="student-id-card-print"
            className="w-[320px] sm:w-[350px] bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-700 relative overflow-hidden space-y-4 print:shadow-none print:border-slate-800"
          >
            {/* School Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-8 h-8 rounded-md object-contain bg-white/10 p-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                    QN
                  </div>
                )}
                <div>
                  <h4 className="text-[11px] font-bold tracking-wide uppercase leading-tight text-white truncate max-w-[190px]">
                    {settings.schoolName}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-medium">KARTU TANDA SANTRI / PELAJAR</p>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {settings.academicYear}
              </span>
            </div>

            {/* Card Body: Photo + Info */}
            <div className="grid grid-cols-12 gap-3 items-center relative z-10">
              {/* Photo */}
              <div className="col-span-4 flex flex-col items-center">
                <img
                  src={
                    student.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=2563eb&color=fff`
                  }
                  alt={student.name}
                  className="w-18 h-22 rounded-lg object-cover ring-1 ring-slate-700 bg-slate-800"
                />
                <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase">
                  {student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                </span>
              </div>

              {/* Details */}
              <div className="col-span-8 space-y-1 text-left">
                <h5 className="font-bold text-white text-xs sm:text-sm leading-snug">
                  {student.name}
                </h5>
                <div className="text-[11px] text-slate-300 space-y-0.5 pt-0.5">
                  <p className="flex items-center justify-between">
                    <span className="text-slate-500">NIS:</span>
                    <span className="font-mono font-semibold text-white">{student.nis}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-500">NISN:</span>
                    <span className="font-mono text-white">{student.nisn || '-'}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-500">Kelas:</span>
                    <span className="font-semibold text-blue-400">{student.className}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Section & Security Seal */}
            <div className="bg-white p-2.5 rounded-lg flex items-center justify-between text-slate-900 relative z-10 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="bg-white p-1 rounded border border-slate-200">
                  <QRCodeSVG
                    value={student.qrCodeData || student.nis}
                    size={56}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-left text-[10px]">
                  <p className="font-bold text-slate-900 uppercase">Kode Presensi QR</p>
                  <p className="font-mono font-semibold text-slate-600">{student.nis}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Scan otomatis di scanner sekolah</p>
                </div>
              </div>

              <div className="text-right text-[8px] text-slate-400 border-l border-slate-200 pl-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 ml-auto" />
                <p className="font-semibold text-slate-700 mt-0.5">TERVERIFIKASI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Cetak pada lembar A4 atau kartu ID Card PVC.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handlePrintCard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
