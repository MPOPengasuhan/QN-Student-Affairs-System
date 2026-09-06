import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, SchoolSettings } from '../types';
import { X, Printer } from 'lucide-react';

interface BatchCardsModalProps {
  students: Student[];
  settings: SchoolSettings;
  onClose: () => void;
}

export const BatchCardsModal: React.FC<BatchCardsModalProps> = ({
  students,
  settings,
  onClose,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('SEMUA');

  const classList = ['SEMUA', ...Array.from(new Set(students.map((s) => s.className))).sort()];
  const filteredStudents = selectedClass === 'SEMUA' ? students : students.filter((s) => s.className === selectedClass);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="print:hidden p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="font-semibold text-xs sm:text-sm">
              Cetak Massal Kartu Pelajar QR Code (A4 Print Ready)
            </h3>
            <p className="text-[11px] text-slate-400">
              Total {filteredStudents.length} kartu siap dicetak untuk lembar A4 / PVC Card.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Filter Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-semibold focus:outline-none"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Cards Grid */}
        <div className="p-4 sm:p-6 bg-slate-50 overflow-y-auto flex-1 print:bg-white print:p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
            {filteredStudents.map((st) => (
              <div
                key={st.id}
                className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-700 relative overflow-hidden space-y-3 print:break-inside-avoid print:shadow-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="w-6 h-6 rounded object-contain bg-white/10 p-0.5"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-[9px]">
                        QN
                      </div>
                    )}
                    <div>
                      <h5 className="text-[10px] font-bold uppercase leading-tight truncate max-w-[150px]">
                        {settings.schoolName}
                      </h5>
                      <p className="text-[8px] text-slate-400">KARTU SANTRI / SISWA</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-semibold text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    {st.className}
                  </span>
                </div>

                {/* Details */}
                <div className="flex items-center gap-3">
                  <img
                    src={
                      st.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name)}&background=2563eb&color=fff`
                    }
                    alt={st.name}
                    className="w-12 h-14 rounded-lg object-cover ring-1 ring-slate-700 bg-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-[10px] space-y-0.5">
                    <h6 className="font-bold text-white text-xs truncate">{st.name}</h6>
                    <p className="text-slate-300">
                      NIS: <span className="font-mono font-semibold text-white">{st.nis}</span>
                    </p>
                    <p className="text-slate-300">
                      NISN: <span className="font-mono text-white">{st.nisn || '-'}</span>
                    </p>
                    <p className="text-slate-300">
                      Gender: <span className="font-medium text-white">{st.gender === 'L' ? 'L' : 'P'}</span>
                    </p>
                  </div>
                </div>

                {/* QR Section */}
                <div className="bg-white p-2 rounded-lg flex items-center justify-between text-slate-900">
                  <div className="flex items-center gap-2">
                    <QRCodeSVG value={st.qrCodeData || st.nis} size={42} level="M" />
                    <div>
                      <span className="text-[9px] font-bold text-slate-900 block">SCAN QR</span>
                      <span className="text-[9px] font-mono font-semibold text-slate-600">{st.nis}</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-medium text-slate-400 uppercase">
                    {settings.academicYear}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="print:hidden p-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
