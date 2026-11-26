import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  BookmarkPlus,
  Play,
  Usb,
  Activity,
  LifeBuoy,
  ChevronDown,
  FolderSync,
  Settings2,
} from 'lucide-react';
import { useI18n } from '../i18n';
import {
  createGitbookShortcut,
  launchApp,
  openExternalUrl,
  syncCourseMaterials,
} from '../api/bridge';
import { FindArduinoModal } from '../components/FindArduinoModal';
import { HelpReportModal } from '../components/HelpReportModal';
import type { AuthUser, ComponentId, ComponentScanStatus, Manifest } from '../types';

interface DashboardViewProps {
  user: AuthUser;
  manifest: Manifest | null;
  scans: ComponentScanStatus[];
  selectedApps: ComponentId[];
  onGoOnboarding: () => void;
  onGoDiagnostics: () => void;
}

type LaunchableAppId =
  | 'jupyterlab'
  | 'thonny'
  | 'arduino_ide'
  | 'openbci_gui'
  | 'lab_recorder'
  | 'antigravity'
  | 'github_desktop';

const LAUNCHABLE_APPS: LaunchableAppId[] = [
  'jupyterlab',
  'arduino_ide',
  'openbci_gui',
  'lab_recorder',
  'thonny',
  'antigravity',
  'github_desktop',
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  manifest,
  scans,
  selectedApps,
  onGoOnboarding,
  onGoDiagnostics,
}) => {
  const { t } = useI18n();
  const [shortcutMsg, setShortcutMsg] = useState<string | null>(null);
  const [launchFeedback, setLaunchFeedback] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [arduinoModalOpen, setArduinoModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const scanMap = new Map(scans.map((s) => [s.id, s]));
  const gitbookUrl =
    manifest?.urls.gitbook ??
    'https://urikorisky.github.io/BIU_BCI_Workshop_2026_StudentResources/';
  const studentRepoUrl =
    manifest?.urls.student_repo ??
    'https://github.com/urikorisky/BIU_BCI_Workshop_2026_StudentResources';

  const handleShortcut = async () => {
    try {
      const path = await createGitbookShortcut(gitbookUrl);
      setShortcutMsg(`${t.dashboard.shortcutCreated} (${path})`);
    } catch (err) {
      setShortcutMsg(String(err));
    }
  };

  const handleLaunch = async (id: LaunchableAppId) => {
    try {
      const msg = await launchApp(id);
      setLaunchFeedback(msg);
    } catch (err) {
      setLaunchFeedback(String(err));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const msg = await syncCourseMaterials(studentRepoUrl);
      setSyncMsg(msg);
    } catch (err) {
      setSyncMsg(String(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">{t.dashboard.heading}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.dashboard.subheading}</p>
      </div>

      {/* Course Materials Hub */}
      <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-slate-50 p-6 shadow-xs">
        <h3 className="text-base font-bold text-brand-950">{t.dashboard.materialsSection}</h3>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openExternalUrl(gitbookUrl)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
          >
            <BookOpen className="h-4 w-4" />
            <span>{t.dashboard.openGitbook}</span>
          </button>

          <button
            type="button"
            onClick={() => openExternalUrl(studentRepoUrl)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Code2 className="h-4 w-4 text-slate-600" />
            <span>{t.dashboard.openGithub}</span>
          </button>

          <button
            type="button"
            onClick={handleShortcut}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3 text-xs font-semibold text-brand-800 transition hover:bg-brand-50 sm:text-sm"
          >
            <BookmarkPlus className="h-4 w-4" />
            <span>{t.dashboard.createShortcut}</span>
          </button>
        </div>
        <p className="mt-2.5 text-sm text-slate-600">{t.dashboard.openGitbookDesc}</p>
        {shortcutMsg && (
          <p className="mt-2 text-xs font-semibold text-emerald-700 sm:text-sm">{shortcutMsg}</p>
        )}
      </section>

      {/* Launch Installed Apps */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{t.dashboard.appsSection}</h3>
          {launchFeedback && (
            <span className="text-xs font-medium text-brand-700 sm:text-sm">{launchFeedback}</span>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LAUNCHABLE_APPS.map((id) => {
            const label = t.dashboard.appLabels[id];
            const isInstalled = Boolean(scanMap.get(id)?.installed);
            return (
              <div
                key={id}
                className={`flex items-center justify-between rounded-xl border p-3.5 ${
                  isInstalled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">{label.name}</div>
                  <div className="text-xs text-slate-500">{label.desc}</div>
                </div>
                {isInstalled ? (
                  <button
                    type="button"
                    onClick={() => handleLaunch(id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{t.dashboard.launchBtn}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGoOnboarding}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    {t.dashboard.installMissingBtn}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Classroom Tools */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900">{t.dashboard.toolsSection}</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setArduinoModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-800 transition hover:bg-brand-100"
          >
            <Usb className="h-4 w-4" />
            <span>{t.dashboard.findArduinoBtn}</span>
          </button>

          <button
            type="button"
            onClick={onGoDiagnostics}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100"
          >
            <Activity className="h-4 w-4" />
            <span>{t.dashboard.rerunDiagBtn}</span>
          </button>

          <button
            type="button"
            onClick={onGoOnboarding}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100"
          >
            <Settings2 className="h-4 w-4" />
            <span>{t.dashboard.reopenOnboardingBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => setHelpModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
          >
            <LifeBuoy className="h-4 w-4" />
            <span>{t.dashboard.stuckBtn}</span>
          </button>
        </div>
      </section>

      {/* Advanced Settings (Opt-in Local Repo Sync) */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <span>{t.dashboard.advancedTitle}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {advancedOpen && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs leading-relaxed text-slate-600">{t.dashboard.advancedDesc}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={syncing}
                onClick={handleSync}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                <FolderSync className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? t.dashboard.syncing : t.dashboard.syncMaterialsBtn}</span>
              </button>
              {syncMsg && (
                <span className="text-xs font-medium text-emerald-700" dir="ltr">
                  {syncMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <FindArduinoModal open={arduinoModalOpen} onClose={() => setArduinoModalOpen(false)} />
      <HelpReportModal
        open={helpModalOpen}
        user={user}
        manifest={manifest}
        selectedApps={selectedApps}
        onClose={() => setHelpModalOpen(false)}
      />
    </div>
  );
};
