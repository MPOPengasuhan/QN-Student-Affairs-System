import React, { useState } from 'react';
import {
  RoomAssignmentSubmission,
  UserAccount,
  Student,
  Room,
} from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Home,
  Users,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { storageService } from '../services/storageService';

interface ApprovalCenterViewProps {
  currentUser: UserAccount;
  submissions: RoomAssignmentSubmission[];
  students: Student[];
  rooms: Room[];
  onRefresh: () => void;
}

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({
  currentUser,
  submissions,
  students,
  rooms,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [rejectionModalSubId, setRejectionModalSubId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterStatus === 'ALL') return true;
    return sub.status === filterStatus;
  });

  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED').length;

  const handleApprove = (submission: RoomAssignmentSubmission) => {
    setFeedback(null);
    const success = storageService.approveRoomAssignment(submission.id, currentUser.name);
    if (success) {
      setFeedback({
        type: 'success',
        message: `Pengajuan kamar "${submission.roomName}" oleh ${submission.supervisorName} berhasil disetujui & data santri langsung terupdate!`,
      });
      onRefresh();
    } else {
      setFeedback({ type: 'error', message: 'Gagal menyetujui pengajuan.' });
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectionModalSubId) return;
    const sub = submissions.find((s) => s.id === rejectionModalSubId);
    if (!sub) return;

    storageService.rejectRoomAssignment(rejectionModalSubId, currentUser.name, rejectionReason);
    setFeedback({
      type: 'success',
      message: `Pengajuan kamar "${sub.roomName}" telah ditolak dengan catatan.`,
    });
    setRejectionModalSubId(null);
    setRejectionReason('');
    onRefresh();
  };

  // Check duplicate assignments
  const checkDuplicates = (studentIds: string[]): string[] => {
    const duplicates: string[] = [];
    studentIds.forEach((id) => {
      const student = students.find((s) => s.id === id);
      if (student && student.roomName && student.roomName.trim() !== '') {
        duplicates.push(`${student.name} (saat ini di: ${student.roomName})`);
      }
    });
    return duplicates;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              Approval Center & Audit Kamar
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {pendingCount} Menunggu Validasi
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Verifikasi dan persetujuan pengajuan anggota kamar santri dari para Musyrif & Wali Kamar.
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({submissions.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Disetujui ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ditolak ({rejectedCount})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Tidak Ada Pengajuan
            </h3>
            <p className="text-xs text-slate-500">
              {filterStatus === 'PENDING'
                ? 'Saat ini tidak ada pengajuan kamar yang menunggu persetujuan.'
                : 'Belum ada riwayat pengajuan kamar yang sesuai filter.'}
            </p>
          </div>
        ) : (
          filteredSubmissions.map((sub) => {
            const duplicates = checkDuplicates(sub.studentIds);
            const isPending = sub.status === 'PENDING';
            const isApproved = sub.status === 'APPROVED';
            const isRejected = sub.status === 'REJECTED';

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : isApproved
                    ? 'border-emerald-200'
                    : 'border-rose-200'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">
                        {sub.roomName}
                      </span>
                      <span className="text-xs text-slate-500">({sub.building})</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>Diajukan oleh: <strong className="text-slate-800">{sub.supervisorName}</strong></span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">
                        {new Date(sub.submittedAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        Menunggu Persetujuan
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Telah Disetujui ({sub.approvedBy})
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Ditolak
                      </span>
                    )}
                  </div>
                </div>

                {/* Duplicate Warning if any */}
                {duplicates.length > 0 && isPending && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Audit Data Ganda:</strong> Ditemukan santri yang sudah terdaftar di kamar lain:{' '}
                      <span className="font-medium">{duplicates.join(', ')}</span>.
                      Menyetujui pengajuan ini akan memindahkan santri tersebut ke {sub.roomName}.
                    </div>
                  </div>
                )}

                {/* Student list in this submission */}
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Daftar Santri yang Diajukan ({sub.studentList ? sub.studentList.length : sub.studentIds.length} Santri):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(sub.studentList || []).map((st, sIdx) => (
                      <div
                        key={st.id || sIdx}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="font-bold text-slate-800 truncate">{st.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NIS: {st.nis} • {st.className}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes if any */}
                {sub.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/80">
                    <span className="font-bold text-slate-700">Catatan Musyrif: </span>
                    {sub.notes}
                  </div>
                )}

                {sub.rejectionReason && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-xl text-xs text-rose-800 border border-rose-200">
                    <span className="font-bold">Alasan Penolakan: </span>
                    {sub.rejectionReason}
                  </div>
                )}

                {/* Action Buttons for Pending */}
                {isPending && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectionModalSubId(sub.id)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak Pengajuan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(sub)}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui & Terapkan ke Database</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rejection Modal */}
      {rejectionModalSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Tolak Pengajuan Pendataan Kamar
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Berikan alasan penolakan agar Musyrif dapat melakukan perbaikan data.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Jumlah santri melebihi kapasitas kamar, atau ada data ganda dengan kamar lain..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalSubId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
