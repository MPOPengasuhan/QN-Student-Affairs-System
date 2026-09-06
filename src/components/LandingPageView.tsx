import React, { useState } from 'react';
import { SchoolSettings } from '../types';
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { QOTRUN_NADA_LOGO_SVG } from '../data/mockData';

interface LandingPageViewProps {
  settings: SchoolSettings;
  onEnterSystem: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  settings,
  onEnterSystem,
}) => {
  const infoCards = settings.landingInfoCards && settings.landingInfoCards.length > 0
    ? settings.landingInfoCards
    : [
        {
          id: '01',
          tag: '01',
          title: 'INFO',
          content:
            'Pengisian data santri kamar asrama tahun ajaran 2025/2026 wajib diisi oleh masing-masing Musyrif/Wali Kamar melalui form pendataan.',
          isActive: true,
        },
        {
          id: '02',
          tag: '02',
          title: 'INFO',
          content:
            'Presensi santri sekolah & asrama menggunakan kamera scanner QR kartu santri atau rekapitulasi manual oleh asatidz piket.',
          isActive: true,
        },
        {
          id: '03',
          tag: '03',
          title: 'INFO',
          content:
            'Semua rekapitulasi data penempatan asrama dan log presensi harian disinkronkan langsung dengan Google Spreadsheet resmi.',
          isActive: true,
        },
      ];

  const activeCards = infoCards.filter((c) => c.isActive !== false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top Decoration Bar */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 w-full" />

      {/* Main Center Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16 max-w-4xl mx-auto w-full">
        {/* Main Landing Card */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 sm:p-12 text-center transition-all duration-300">
          {/* Circular Logo Emblem */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-50 border-4 border-emerald-600/30 flex items-center justify-center p-2 shadow-inner overflow-hidden">
              <img
                src={settings.logoUrl || QOTRUN_NADA_LOGO_SVG}
                alt="Logo Pondok Pesantren Qotrun Nada"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = QOTRUN_NADA_LOGO_SVG;
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            {settings.landingHeadline || 'QN Student Affairs System'}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg font-bold text-emerald-700 mb-4">
            {settings.landingSubheadline || 'Pondok Pesantren Qotrun Nada'}
          </p>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
            {settings.landingDescription ||
              'Sistem Pusat Data Pengasuhan Santri terintegrasi untuk pendataan kamar, validasi musyrif, monitoring statistik, dan laporan akademik santri.'}
          </p>

          {/* Main Action Button */}
          <div className="flex justify-center">
            <button
              id="btn-enter-system"
              onClick={onEnterSystem}
              className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-[#064e3b] hover:bg-[#043d2e] text-white text-base font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer active:scale-98 group"
            >
              <span>Masuk ke Sistem</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* 3 Interactive Info Cards Row */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {activeCards.slice(0, 3).map((card, idx) => (
            <div
              key={card.id || idx}
              id={`landing-info-card-${idx + 1}`}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors text-left"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {card.tag || `0${idx + 1}`}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {card.title || 'INFO'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {card.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white/50">
        <p className="font-medium">
          Berkhidmat Untuk Ummat – QN Student Affairs System &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
