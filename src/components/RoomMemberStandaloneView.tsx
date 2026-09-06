import React, { useState } from 'react';
import { Student, Room, SchoolSettings, UserAccount } from '../types';
import { storageService } from '../services/storageService';
import { RoomMemberManagementView } from './RoomMemberManagementView';
import { ArrowLeft, Users, Home, Building } from 'lucide-react';
import { QOTRUN_NADA_LOGO_SVG } from '../data/mockData';

interface RoomMemberStandaloneViewProps {
  rooms: Room[];
  students: Student[];
  settings: SchoolSettings;
  currentUser?: UserAccount | null;
  onBack: () => void;
  onRefresh: () => void;
  onOpenStandaloneForm?: (roomNumber: string) => void;
}

export const RoomMemberStandaloneView: React.FC<RoomMemberStandaloneViewProps> = ({
  rooms,
  students,
  settings,
  currentUser,
  onBack,
  onRefresh,
  onOpenStandaloneForm,
}) => {
  return (
    <div className="min-h-screen bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
      {/* Top Standalone Header */}
      <header className="bg-[#0c1a16] text-white border-b border-emerald-950/80 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="back-to-portal-from-room-members"
              onClick={onBack}
              className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-white border border-emerald-500/30 transition-all flex items-center gap-2 text-xs font-extrabold cursor-pointer"
              title="Kembali ke Portal Utama"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali ke Portal</span>
            </button>
            <div className="h-6 w-px bg-emerald-800/60 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 p-1 flex items-center justify-center shrink-0">
                <img
                  src={settings.logoUrl || QOTRUN_NADA_LOGO_SVG}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = QOTRUN_NADA_LOGO_SVG;
                  }}
                />
              </div>
              <div>
                <h1 className="font-extrabold text-sm text-white leading-tight">
                  Manajemen & Atur Anggota Kamar
                </h1>
                <p className="text-[10px] text-emerald-400 font-medium">
                  {settings.schoolName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {currentUser && (
              <div className="hidden md:flex items-center gap-2 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-900/60 text-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">{currentUser.name}</span>
                <span className="text-[10px] opacity-75">({currentUser.role})</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <RoomMemberManagementView
          rooms={rooms}
          students={students}
          settings={settings}
          currentUser={currentUser}
          onRefresh={onRefresh}
          onOpenStandaloneForm={onOpenStandaloneForm}
        />
      </main>
    </div>
  );
};
