import React, { useState } from 'react';
import { SchoolSettings, LandingInfoCard } from '../types';
import {
  Sparkles,
  Save,
  CheckCircle2,
  Eye,
  Layers,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { storageService } from '../services/storageService';

interface PublishCenterViewProps {
  settings: SchoolSettings;
  onSaveSettings: (settings: Partial<SchoolSettings>) => void;
}

export const PublishCenterView: React.FC<PublishCenterViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [headline, setHeadline] = useState(settings.landingHeadline || 'QN Student Affairs System');
  const [subheadline, setSubheadline] = useState(settings.landingSubheadline || 'Pondok Pesantren Qotrun Nada');
  const [description, setDescription] = useState(
    settings.landingDescription ||
      'Sistem Pusat Data Pengasuhan Santri terintegrasi untuk pendataan kamar, validasi musyrif, monitoring statistik, dan laporan akademik santri.'
  );

  const defaultCards: LandingInfoCard[] = [
    {
      id: 'card-01',
      tag: '01',
      title: 'INFO',
      content:
        'Pengisian data santri kamar asrama tahun ajaran 2025/2026 wajib diisi oleh masing-masing Musyrif/Wali Kamar melalui form pendataan.',
      isActive: true,
    },
    {
      id: 'card-02',
      tag: '02',
      title: 'INFO',
      content:
        'Presensi santri sekolah & asrama menggunakan kamera scanner QR kartu santri atau rekapitulasi manual oleh asatidz piket.',
      isActive: true,
    },
    {
      id: 'card-03',
      tag: '03',
      title: 'INFO',
      content:
        'Semua rekapitulasi data penempatan asrama dan log presensi harian disinkronkan langsung dengan Google Spreadsheet resmi.',
      isActive: true,
    },
  ];

  const [cards, setCards] = useState<LandingInfoCard[]>(
    settings.landingInfoCards && settings.landingInfoCards.length > 0
      ? settings.landingInfoCards
      : defaultCards
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCardContentChange = (idx: number, content: string) => {
    const updated = [...cards];
    updated[idx] = { ...updated[idx], content };
    setCards(updated);
  };

  const handleCardTagChange = (idx: number, tag: string) => {
    const updated = [...cards];
    updated[idx] = { ...updated[idx], tag };
    setCards(updated);
  };

  const handleCardToggle = (idx: number) => {
    const updated = [...cards];
    updated[idx] = { ...updated[idx], isActive: !updated[idx].isActive };
    setCards(updated);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      landingHeadline: headline,
      landingSubheadline: subheadline,
      landingDescription: description,
      landingInfoCards: cards,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Publish Center (Info & Landing Page)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sesuaikan teks judul, deskripsi, dan 3 kartu informasi interaktif di halaman utama / landing page.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Simpan & Publikasikan</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pengaturan Landing Page berhasil disimpan dan langsung aktif di halaman depan!</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Header Text Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Edit3 className="w-4 h-4 text-emerald-600" />
            Informasi Judul & Teks Landing Page
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Judul Utama Aplikasi
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sub-Judul Instansi
              </label>
              <input
                type="text"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Deskripsi Singkat Sistem
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              required
            />
          </div>
        </div>

        {/* 3 Interactive Cards Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-emerald-600" />
            3 Kartu Informasi Interaktif Landing Page
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.slice(0, 3).map((card, idx) => (
              <div
                key={card.id || idx}
                className={`p-4 rounded-xl border transition-all ${
                  card.isActive !== false
                    ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={card.tag || `0${idx + 1}`}
                      onChange={(e) => handleCardTagChange(idx, e.target.value)}
                      className="w-12 px-2 py-0.5 text-center font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 rounded"
                    />
                    <span className="text-xs font-bold text-slate-500">INFO #{idx + 1}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCardToggle(idx)}
                    className="text-xs font-bold cursor-pointer"
                  >
                    {card.isActive !== false ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                        Aktif
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        Nonaktif
                      </span>
                    )}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={card.content}
                  onChange={(e) => handleCardContentChange(idx, e.target.value)}
                  placeholder="Ketik konten informasi di sini..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
