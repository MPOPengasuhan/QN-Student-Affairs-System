import React, { useState, useEffect, useCallback } from 'react';
import {
  AppScreen,
  ViewTab,
  Student,
  Teacher,
  Room,
  AttendanceRecord,
  SchoolSettings,
  DailySummary,
  ClassSummary,
  UserAccount,
  RoomAssignmentSubmission,
  ActivityLog,
} from './types';
import { storageService } from './services/storageService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPageView } from './components/LandingPageView';
import { LoginView } from './components/LoginView';
import { WelcomePortalView } from './components/WelcomePortalView';
import { DashboardMonitoringView } from './components/DashboardMonitoringView';
import { RoomAssignmentFormView } from './components/RoomAssignmentFormView';
import { ApprovalCenterView } from './components/ApprovalCenterView';
import { QRScannerView } from './components/QRScannerView';
import { DashboardView } from './components/DashboardView';
import { RekapView } from './components/RekapView';
import { StudentManagementView } from './components/StudentManagementView';
import { TeacherManagementView } from './components/TeacherManagementView';
import { RoomManagementView } from './components/RoomManagementView';
import { GoogleSheetsIntegrationView } from './components/GoogleSheetsIntegrationView';
import { PublishCenterView } from './components/PublishCenterView';
import { UserManagementView } from './components/UserManagementView';
import { ActivityLogsView } from './components/ActivityLogsView';
import { RoomLogsView } from './components/RoomLogsView';
import { SettingsView } from './components/SettingsView';

// Standalone & Dedicated Role Dashboards
import { StandaloneRoomFormView } from './components/StandaloneRoomFormView';
import { StandaloneScannerView } from './components/StandaloneScannerView';
import { RoomMemberManagementView } from './components/RoomMemberManagementView';
import { RoomMemberStandaloneView } from './components/RoomMemberStandaloneView';
import { WaliKelasDashboardView } from './components/WaliKelasDashboardView';
import { WaliKamarDashboardView } from './components/WaliKamarDashboardView';
import { PembinaDashboardView } from './components/PembinaDashboardView';
import { PimpinanDashboardView } from './components/PimpinanDashboardView';

import { getTodayDateStr } from './data/mockData';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return storageService.getCurrentUser();
  });

  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    const user = storageService.getCurrentUser();
    return user ? 'welcome' : 'landing';
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('monitoring');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(storageService.getSettings());
  const [dailySummary, setDailySummary] = useState<DailySummary>(storageService.getDailySummary());
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [submissions, setSubmissions] = useState<RoomAssignmentSubmission[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [preselectedRoomForForm, setPreselectedRoomForForm] = useState<string | undefined>(undefined);

  const refreshAllData = useCallback(() => {
    const st = storageService.getStudents();
    const tc = storageService.getTeachers();
    const rm = storageService.getRooms();
    const rec = storageService.getAttendanceRecords();
    const set = storageService.getSettings();
    const sum = storageService.getDailySummary();
    const cls = storageService.getClassSummaries();
    const subs = storageService.getRoomAssignments();
    const usrs = storageService.getUsers();
    const logs = storageService.getActivityLogs();
    const curr = storageService.getCurrentUser();

    setStudents(st);
    setTeachers(tc);
    setRooms(rm);
    setRecords(rec);
    setSettings(set);
    setDailySummary(sum);
    setClassSummaries(cls);
    setSubmissions(subs);
    setUsers(usrs);
    setActivityLogs(logs);
    if (curr) {
      setCurrentUser(curr);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
    const unsubscribe = storageService.subscribe(() => {
      refreshAllData();
    });

    // Initialize centralized cloud and Google Sheets synchronization
    storageService.init();

    return () => {
      unsubscribe();
    };
  }, [refreshAllData]);

  const today = getTodayDateStr();
  const todayRecords = records.filter((r) => r.date === today);

  const handleLogin = (username: string, password: string) => {
    const res = storageService.authenticateUser(username, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      // Determine initial screen based on role
      if (res.user.role === 'WALI_KELAS') {
        setCurrentScreen('wali_kelas_dashboard');
      } else if (res.user.role === 'WALI_KAMAR' || res.user.role === 'MUSYRIF') {
        setCurrentScreen('wali_kamar_dashboard');
      } else if (res.user.role === 'PEMBINA') {
        setCurrentScreen('pembina_dashboard');
      } else if (res.user.role === 'PIMPINAN') {
        setCurrentScreen('pimpinan_dashboard');
      } else {
        setCurrentScreen('welcome');
      }
      refreshAllData();
      return { success: true, user: res.user, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const handleLogout = () => {
    storageService.logoutUser();
    setCurrentUser(null);
    setCurrentScreen('landing');
  };

  const handleUserUpdated = (updatedUser: UserAccount) => {
    setCurrentUser(updatedUser);
    refreshAllData();
  };

  const handleSaveSettings = (updated: Partial<SchoolSettings>) => {
    const newSettings = storageService.saveSettings(updated);
    setSettings(newSettings);
    refreshAllData();
  };

  const handleResetData = () => {
    storageService.resetToDefault();
    refreshAllData();
  };

  const pendingApprovalCount = submissions.filter((s) => s.status === 'PENDING').length;
  const todayAttendedCount = dailySummary.presentCount + dailySummary.lateCount;

  // 1. SCREEN: LANDING PAGE
  if (currentScreen === 'landing') {
    return (
      <LandingPageView
        settings={settings}
        onEnterSystem={() => {
          if (currentUser) {
            setCurrentScreen('welcome');
          } else {
            setCurrentScreen('login');
          }
        }}
      />
    );
  }

  // 2. SCREEN: LOGIN PAGE
  if (currentScreen === 'login') {
    return (
      <LoginView
        settings={settings}
        teachers={teachers}
        onLogin={handleLogin}
        onBackToLanding={() => setCurrentScreen('landing')}
      />
    );
  }

  // 3. SCREEN: WELCOME PORTAL (DASHBOARD HUB)
  if (currentScreen === 'welcome' && currentUser) {
    return (
      <WelcomePortalView
        user={currentUser}
        settings={settings}
        onNavigateToRoomFormStandalone={() => {
          setPreselectedRoomForForm(currentUser.assignedRoomName || undefined);
          setCurrentScreen('room_form_standalone');
        }}
        onNavigateToScannerStandalone={() => setCurrentScreen('scanner_standalone')}
        onNavigateToMonitoringStandalone={() => setCurrentScreen('monitoring_standalone')}
        onNavigateToRoomMembers={() => setCurrentScreen('room_members_standalone')}
        onNavigateToWaliKelas={() => setCurrentScreen('wali_kelas_dashboard')}
        onNavigateToWaliKamar={() => setCurrentScreen('wali_kamar_dashboard')}
        onNavigateToPembina={() => setCurrentScreen('pembina_dashboard')}
        onNavigateToPimpinan={() => setCurrentScreen('pimpinan_dashboard')}
        onNavigateToAdmin={() => {
          setActiveTab('monitoring');
          setCurrentScreen('admin');
        }}
        onNavigateToDashboard={() => {
          setActiveTab('monitoring');
          setCurrentScreen('admin');
        }}
        onLogout={handleLogout}
        onUserUpdated={handleUserUpdated}
      />
    );
  }

  // STANDALONE REAL-TIME MONITORING SCREEN (Terpisah dari sidebar untuk TV / Pusat Pantau)
  if (currentScreen === 'monitoring_standalone') {
    return (
      <div className="min-h-screen bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 selection:bg-emerald-600 selection:text-white p-3 sm:p-5 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <DashboardMonitoringView
            students={students}
            teachers={teachers}
            rooms={rooms}
            records={records}
            settings={settings}
            currentUser={currentUser}
            isStandalone={true}
            onRefresh={refreshAllData}
            onNavigateToRoomForm={(roomNumber) => {
              setPreselectedRoomForForm(roomNumber);
              setCurrentScreen('room_form_standalone');
            }}
            onNavigateToStudents={() => {
              setActiveTab('students');
              setCurrentScreen('admin');
            }}
            onNavigateToScanner={() => setCurrentScreen('scanner_standalone')}
            onBack={() => {
              if (currentUser) {
                if (currentUser.role === 'ADMIN' || currentUser.role === 'PEMBINA') {
                  setActiveTab('monitoring');
                  setCurrentScreen('admin');
                } else {
                  setCurrentScreen('welcome');
                }
              } else {
                setCurrentScreen('landing');
              }
            }}
          />
        </div>
      </div>
    );
  }

  // 4. SCREEN: STANDALONE ROOM ASSIGNMENT FORM (Form Pengisian Kamar Terpisah)
  if (currentScreen === 'room_form_standalone' && currentUser) {
    return (
      <StandaloneRoomFormView
        students={students}
        rooms={rooms}
        teachers={teachers}
        currentUser={currentUser}
        settings={settings}
        preselectedRoomNumber={preselectedRoomForForm}
        onBack={() => setCurrentScreen('welcome')}
        onSuccess={() => {
          refreshAllData();
          setCurrentScreen('welcome');
        }}
      />
    );
  }

  // 5. SCREEN: STANDALONE ROOM MEMBER MANAGEMENT (Terpisah dari Sidebar Admin)
  if (currentScreen === 'room_members_standalone' && currentUser) {
    return (
      <RoomMemberStandaloneView
        rooms={rooms}
        students={students}
        settings={settings}
        currentUser={currentUser}
        onBack={() => setCurrentScreen('welcome')}
        onRefresh={refreshAllData}
        onOpenStandaloneForm={(roomNumber) => {
          setPreselectedRoomForForm(roomNumber);
          setCurrentScreen('room_form_standalone');
        }}
      />
    );
  }

  // 6. SCREEN: STANDALONE CAMERA QR SCANNER (Kamera Scanner Terpisah dari Sidebar)
  if (currentScreen === 'scanner_standalone') {
    return (
      <StandaloneScannerView
        students={students}
        rooms={rooms}
        settings={settings}
        currentUser={currentUser}
        onAttendanceUpdated={refreshAllData}
        onBack={() => {
          if (currentUser) {
            setCurrentScreen('welcome');
          } else {
            setCurrentScreen('landing');
          }
        }}
      />
    );
  }

  // 7. SCREEN: DASHBOARD WALI KELAS
  if (currentScreen === 'wali_kelas_dashboard' && currentUser) {
    return (
      <WaliKelasDashboardView
        currentUser={currentUser}
        students={students}
        records={records}
        settings={settings}
        rooms={rooms}
        onBackToPortal={() => setCurrentScreen('welcome')}
        onBack={() => setCurrentScreen('welcome')}
        onRefresh={refreshAllData}
      />
    );
  }

  // 8. SCREEN: DASHBOARD WALI KAMAR / MUSYRIF
  if (currentScreen === 'wali_kamar_dashboard' && currentUser) {
    return (
      <WaliKamarDashboardView
        currentUser={currentUser}
        rooms={rooms}
        students={students}
        records={records}
        activityLogs={activityLogs}
        settings={settings}
        onBackToPortal={() => setCurrentScreen('welcome')}
        onBack={() => setCurrentScreen('welcome')}
        onOpenStandaloneForm={(roomNumber) => {
          setPreselectedRoomForForm(roomNumber);
          setCurrentScreen('room_form_standalone');
        }}
        onOpenMemberManagement={() => {
          setCurrentScreen('room_members_standalone');
        }}
        onOpenScanner={() => {
          setCurrentScreen('scanner_standalone');
        }}
        onRefresh={refreshAllData}
      />
    );
  }

  // 9. SCREEN: DASHBOARD PEMBINA
  if (currentScreen === 'pembina_dashboard' && currentUser) {
    return (
      <PembinaDashboardView
        currentUser={currentUser}
        students={students}
        rooms={rooms}
        teachers={teachers}
        records={records}
        submissions={submissions}
        activityLogs={activityLogs}
        settings={settings}
        onBack={() => setCurrentScreen('welcome')}
        onRefresh={refreshAllData}
      />
    );
  }

  // 10. SCREEN: DASHBOARD EKSEKUTIF PIMPINAN
  if (currentScreen === 'pimpinan_dashboard' && currentUser) {
    return (
      <PimpinanDashboardView
        currentUser={currentUser}
        students={students}
        rooms={rooms}
        teachers={teachers}
        records={records}
        dailySummary={dailySummary}
        settings={settings}
        onBackToPortal={() => setCurrentScreen('welcome')}
        onBack={() => setCurrentScreen('welcome')}
        onRefresh={refreshAllData}
      />
    );
  }

  // 9. SCREEN: ADMIN SYSTEM (FULL ACCESS WITH SIDEBAR)
  return (
    <div className="min-h-screen bg-slate-100 flex flex-row font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 selection:bg-emerald-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setPreselectedRoomForForm(undefined);
        }}
        settings={settings}
        currentUser={currentUser}
        pendingApprovalCount={pendingApprovalCount}
        todayAttendedCount={todayAttendedCount}
        totalStudentsCount={dailySummary.totalStudents}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onReturnToPortal={() => setCurrentScreen('welcome')}
        onOpenStandaloneForm={() => setCurrentScreen('room_form_standalone')}
        onOpenStandaloneScanner={() => setCurrentScreen('scanner_standalone')}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport with Responsive Margin */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          settings={settings}
          currentUser={currentUser}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          todayAttendedCount={todayAttendedCount}
          totalStudentsCount={dailySummary.totalStudents}
          onReturnToPortal={() => setCurrentScreen('welcome')}
          onLogout={handleLogout}
          onUserUpdated={handleUserUpdated}
        />

        {/* Dynamic Main View Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'monitoring' && (
            <DashboardMonitoringView
              students={students}
              teachers={teachers}
              rooms={rooms}
              records={records}
              settings={settings}
              currentUser={currentUser}
              onRefresh={refreshAllData}
              onNavigateToRoomForm={(roomNumber) => {
                setPreselectedRoomForForm(roomNumber);
                setActiveTab('room_form');
              }}
              onNavigateToStudents={() => setActiveTab('students')}
              onOpenStandalone={() => setCurrentScreen('monitoring_standalone')}
            />
          )}

          {activeTab === 'room_members' && (
            <RoomMemberManagementView
              rooms={rooms}
              students={students}
              settings={settings}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'room_form' && currentUser && (
            <RoomAssignmentFormView
              students={students}
              rooms={rooms}
              teachers={teachers}
              currentUser={currentUser}
              settings={settings}
              preselectedRoomNumber={preselectedRoomForForm}
              onSubmitSuccess={refreshAllData}
            />
          )}

          {activeTab === 'approval' && currentUser && (
            <ApprovalCenterView
              currentUser={currentUser}
              submissions={submissions}
              students={students}
              rooms={rooms}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'wali_kelas' && currentUser && (
            <WaliKelasDashboardView
              currentUser={currentUser}
              students={students}
              records={records}
              settings={settings}
              rooms={rooms}
              onBack={() => setActiveTab('monitoring')}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'wali_kamar' && currentUser && (
            <WaliKamarDashboardView
              currentUser={currentUser}
              rooms={rooms}
              students={students}
              records={records}
              activityLogs={activityLogs}
              settings={settings}
              onBack={() => setActiveTab('monitoring')}
              onOpenStandaloneForm={(roomNumber) => {
                setPreselectedRoomForForm(roomNumber);
                setActiveTab('room_form');
              }}
              onOpenMemberManagement={() => {
                setActiveTab('room_members');
              }}
              onOpenScanner={() => {
                setActiveTab('scanner');
              }}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'pembina' && currentUser && (
            <PembinaDashboardView
              currentUser={currentUser}
              students={students}
              rooms={rooms}
              teachers={teachers}
              records={records}
              submissions={submissions}
              activityLogs={activityLogs}
              settings={settings}
              onBack={() => setActiveTab('monitoring')}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'pimpinan' && currentUser && (
            <PimpinanDashboardView
              currentUser={currentUser}
              students={students}
              rooms={rooms}
              teachers={teachers}
              records={records}
              dailySummary={dailySummary}
              settings={settings}
              onBack={() => setActiveTab('monitoring')}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'scanner' && (
            <QRScannerView
              students={students}
              rooms={rooms}
              settings={settings}
              currentUser={currentUser}
              onAttendanceUpdated={refreshAllData}
              recentRecords={todayRecords}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              students={students}
              records={records}
              dailySummary={dailySummary}
              classSummaries={classSummaries}
              settings={settings}
              onRefresh={refreshAllData}
              onNavigateToScanner={() => setActiveTab('scanner')}
              onNavigateToRekap={() => setActiveTab('rekap')}
            />
          )}

          {activeTab === 'students' && (
            <StudentManagementView
              students={students}
              settings={settings}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'teachers' && (
            <TeacherManagementView
              teachers={teachers}
              settings={settings}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'rooms' && (
            <RoomManagementView
              rooms={rooms}
              students={students}
              settings={settings}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'rekap' && (
            <RekapView
              students={students}
              records={records}
              settings={settings}
            />
          )}

          {activeTab === 'googlesheets' && (
            <GoogleSheetsIntegrationView
              students={students}
              teachers={teachers}
              rooms={rooms}
              records={records}
              settings={settings}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'publish_center' && (
            <PublishCenterView
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeTab === 'users' && currentUser && (
            <UserManagementView
              users={users}
              teachers={teachers}
              rooms={rooms}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'activity_logs' && (
            <ActivityLogsView
              logs={activityLogs}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'room_logs' && (
            <RoomLogsView
              rooms={rooms}
              students={students}
              logs={activityLogs}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'settings_presensi' && (
            <SettingsView
              settings={settings}
              initialTab="presensi"
              onSettingsUpdated={refreshAllData}
              onResetData={handleResetData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              initialTab="pesantren"
              onSettingsUpdated={refreshAllData}
              onResetData={handleResetData}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="print:hidden border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">QN Student Affairs System</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">{settings.schoolName}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Berkhidmat Untuk Ummat – QN Student Affairs System &copy; {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
