import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { LanguageProvider, useI18n } from './i18n';
import { ThemeProvider } from './theme';
import { checkHubUpdate, fetchManifest, getSystemGuardrails } from './api/bridge';
import { Header } from './components/Header';
import { UpdatePromptModal } from './components/UpdatePromptModal';
import { UninstallModal } from './components/UninstallModal';
import { SignInView } from './views/SignInView';
import { OnboardingView } from './views/OnboardingView';
import { DiagnosticsView } from './views/DiagnosticsView';
import { DashboardView } from './views/DashboardView';
import type {
  AppScreen,
  AuthUser,
  ComponentId,
  ComponentScanStatus,
  HubUpdateInfo,
  Manifest,
} from './types';

const AppShell: React.FC = () => {
  const { t } = useI18n();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState<AppScreen>('sign_in');
  const [scans, setScans] = useState<ComponentScanStatus[]>([]);
  const [selectedApps, setSelectedApps] = useState<ComponentId[]>([]);
  const [updateInfo, setUpdateInfo] = useState<HubUpdateInfo | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [uninstallModalOpen, setUninstallModalOpen] = useState(false);
  const [osName, setOsName] = useState<string>('');

  useEffect(() => {
    void fetchManifest().then(setManifest);
    void getSystemGuardrails()
      .then((g) => setOsName(g.os_name))
      .catch(() => {});
    void checkHubUpdate()
      .then((info) => {
        setUpdateInfo(info);
        if (info.update_available) {
          setUpdateModalOpen(true);
        }
      })
      .catch(() => {
        // Silent failure if offline on launch
      });
  }, []);

  const handleSignedIn = (authedUser: AuthUser) => {
    setUser(authedUser);
    setScreen('onboarding');
  };

  const handleSignOut = () => {
    setUser(null);
    setScreen('sign_in');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        user={user}
        screen={screen}
        manifest={manifest}
        updateInfo={updateInfo}
        onNavigate={setScreen}
        onSignOut={handleSignOut}
        onOpenUpdateModal={() => setUpdateModalOpen(true)}
      />

      <main className="pb-12">
        {!user || screen === 'sign_in' ? (
          <SignInView manifest={manifest} onSignedIn={handleSignedIn} />
        ) : screen === 'onboarding' ? (
          <OnboardingView
            user={user}
            manifest={manifest}
            selectedApps={selectedApps}
            onSelectedAppsChange={setSelectedApps}
            onScanUpdated={setScans}
            onContinueToDiagnostics={() => setScreen('diagnostics')}
          />
        ) : screen === 'diagnostics' ? (
          <DiagnosticsView
            user={user}
            manifest={manifest}
            selectedApps={selectedApps}
            onGoDashboard={() => setScreen('dashboard')}
          />
        ) : (
          <DashboardView
            user={user}
            manifest={manifest}
            scans={scans}
            selectedApps={selectedApps}
            onGoOnboarding={() => setScreen('onboarding')}
            onGoDiagnostics={() => setScreen('diagnostics')}
            onOpenUninstall={() => setUninstallModalOpen(true)}
          />
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/60 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-xs text-slate-500 sm:px-6">
          <span>BCI Workshop 2026</span>
          <button
            type="button"
            onClick={() => setUninstallModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t.uninstall.triggerBtn}</span>
          </button>
        </div>
      </footer>

      <UpdatePromptModal
        open={updateModalOpen}
        info={updateInfo}
        onClose={() => setUpdateModalOpen(false)}
      />

      <UninstallModal
        open={uninstallModalOpen}
        osName={osName}
        onClose={() => setUninstallModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
