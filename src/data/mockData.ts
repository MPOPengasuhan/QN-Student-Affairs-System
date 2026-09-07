import {
  Student,
  AttendanceRecord,
  SchoolSettings,
  Teacher,
  Room,
  UserAccount,
  LandingInfoCard,
  RoomAssignmentSubmission,
  ActivityLog,
} from '../types';

export const QOTRUN_NADA_LOGO_SVG = '/logo-pondok.png';

export const initialLandingInfoCards: LandingInfoCard[] = [
  {
    id: 'card-01',
    tag: '01',
    title: 'INFO',
    content: 'Pengisian data santri kamar asrama tahun ajaran 2025/2026 wajib diisi oleh masing-masing Musyrif/Wali Kamar melalui form pendataan.',
    isActive: true,
  },
  {
    id: 'card-02',
    tag: '02',
    title: 'INFO',
    content: 'Presensi santri sekolah & asrama menggunakan kamera scanner QR kartu santri atau rekapitulasi manual oleh asatidz piket.',
    isActive: true,
  },
  {
    id: 'card-03',
    tag: '03',
    title: 'INFO',
    content: 'Semua rekapitulasi data penempatan asrama dan log presensi harian tercatat rapi, aman, dan terintegrasi di sistem.',
    isActive: true,
  },
];

export const initialSchoolSettings: SchoolSettings = {
  schoolName: 'Pondok Pesantren Qotrun Nada',
  schoolAddress: 'Jl. Raya Cipayung Jaya No. 1, Cipayung, Kota Depok, Jawa Barat 16437',
  schoolPhone: '(021) 7788-9900',
  schoolEmail: 'sekretariat@qotrunnada.sch.id',
  logoUrl: QOTRUN_NADA_LOGO_SVG,
  headmasterName: 'KH. Burhanuddin Marzuki',
  headmasterNip: 'Pengasuh Pondok Pesantren',
  operatorName: 'Biro Pengasuhan Santri & Kesiswaan',
  timeInLimit: '07:15',
  timeLateLimit: '08:00',
  timeOutStart: '15:00',
  academicYear: '2025/2026',
  semester: 'Genap',
  autoSync: true,
  soundEnabled: true,
  scannerMode: 'checkin',
  landingHeadline: 'QN Student Affairs System',
  landingSubheadline: 'Pondok Pesantren Qotrun Nada',
  landingDescription:
    'Sistem Pusat Data Pengasuhan Santri terintegrasi untuk pendataan kamar, validasi musyrif, monitoring statistik, dan laporan akademik santri.',
  landingInfoCards: initialLandingInfoCards,
};

export const initialUsers: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    name: 'Administrator',
    password: '12345',
    role: 'ADMIN',
    gender: 'L',
    phone: '',
    position: 'Admin Pengasuhan',
    positionDetail: '-',
    assignedRoomName: '',
    isActive: true,
    createdAt: '2025-07-01T08:00:00Z',
  },
];

export const initialTeachers: Teacher[] = [];

export const initialRooms: Room[] = [];

export const sampleSantriList: Student[] = [];

export const initialStudents: Student[] = [];

export const initialApprovalSubmissions: RoomAssignmentSubmission[] = [];

export const initialActivityLogs: ActivityLog[] = [];

// Helper to get formatted today date
export const getTodayDateStr = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const getPastDateStr = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const generateInitialAttendance = (): AttendanceRecord[] => {
  return [];
};
