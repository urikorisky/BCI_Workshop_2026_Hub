import React, { useEffect, useState } from 'react';
import { LanguageProvider } from './i18n';
import { ThemeProvider } from './theme';
import { fetchManifest } from './api/bridge';
import { Header } from './components/Header';
import { SignInView } from './views/SignInView';
import { OnboardingView } from './views/OnboardingView';
import { DiagnosticsView } from './views/DiagnosticsView';
import { DashboardView } from './views/DashboardView';
import type { AppScreen, AuthUser, ComponentId, ComponentScanStatus, Manifest } from './types';

const AppShell: React.FC = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState<AppScreen>('sign_in');
  const [scans, setScans] = useState<ComponentScanStatus[]>([]);
  const [selectedApps, setSelectedApps] = useState<ComponentId[]>([]);

  useEffect(() => {
    void fetchManifest().then(setManifest);
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
        onNavigate={setScreen}
        onSignOut={handleSignOut}
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
          />
        )}
      </main>
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
