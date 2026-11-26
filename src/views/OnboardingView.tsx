import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  HardDrive,
  RefreshCw,
  Wifi,
  FolderCheck,
  AlertTriangle,
  Download,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { useI18n } from '../i18n';
import {
  getSystemGuardrails,
  installComponent,
  listenInstallProgress,
  scanInstalledComponents,
} from '../api/bridge';
import { PreActionModal } from '../components/PreActionModal';
import type {
  ComponentId,
  ComponentScanStatus,
  Manifest,
  PreActionModalPayload,
  SystemGuardrails,
} from '../types';

interface OnboardingViewProps {
  manifest: Manifest | null;
  selectedApps: ComponentId[];
  onSelectedAppsChange: (ids: ComponentId[]) => void;
  onScanUpdated: (scans: ComponentScanStatus[]) => void;
  onContinueToDiagnostics: () => void;
}

const RECOMMENDED_IDS: ComponentId[] = ['python_env', 'jupyterlab', 'arduino_ide', 'drivers'];

const COMPONENT_ORDER: ComponentId[] = [
  'python_env',
  'jupyterlab',
  'arduino_ide',
  'drivers',
  'openbci_gui',
  'lab_recorder',
  'thonny',
  'antigravity',
  'github_desktop',
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  manifest,
  selectedApps,
  onSelectedAppsChange,
  onScanUpdated,
  onContinueToDiagnostics,
}) => {
  const { t } = useI18n();
  const [guardrails, setGuardrails] = useState<SystemGuardrails | null>(null);
  const [scans, setScans] = useState<ComponentScanStatus[]>([]);
  const [scanning, setScanning] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeModal, setActiveModal] = useState<PreActionModalPayload | null>(null);
  const [pendingResolver, setPendingResolver] = useState<((ok: boolean) => void) | null>(null);

  const appendLog = (line: string) => {
    setLogs((prev) => [...prev.slice(-80), line]);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const [g, s] = await Promise.all([getSystemGuardrails(), scanInstalledComponents()]);
      setGuardrails(g);
      setScans(s);
      onScanUpdated(s);
      const autoDefaults = RECOMMENDED_IDS.filter(
        (id) => !s.find((item) => item.id === id)?.installed
      );
      if (selectedApps.length === 0 && autoDefaults.length > 0) {
        onSelectedAppsChange(autoDefaults);
      }
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    void runScan();
    let unlisten: (() => void) | undefined;
    void listenInstallProgress((evt) => {
      appendLog(`[${evt.component_id}] (${evt.percent}%) ${evt.message}`);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const toggleSelect = (id: ComponentId) => {
    if (selectedApps.includes(id)) {
      onSelectedAppsChange(selectedApps.filter((item) => item !== id));
    } else {
      onSelectedAppsChange([...selectedApps, id]);
    }
  };

  const selectRecommendedMissing = () => {
    const missing = RECOMMENDED_IDS.filter(
      (id) => !scans.find((s) => s.id === id)?.installed
    );
    onSelectedAppsChange(missing);
  };

  const waitForManualStep = (modal: PreActionModalPayload): Promise<boolean> =>
    new Promise((resolve) => {
      setActiveModal(modal);
      setPendingResolver(() => resolve);
    });

  const handleInstallAll = async () => {
    if (!manifest || selectedApps.length === 0) return;
    setInstalling(true);
    setLogs([]);
    for (const id of selectedApps) {
      appendLog(`--- ${t.components[id].title} ---`);
      try {
        const res = await installComponent(id, manifest);
        appendLog(res.message);
        if (res.status === 'needs_manual_step' && res.manual_action_type) {
          const confirmed = await waitForManualStep({
            componentId: id,
            actionType: res.manual_action_type,
            manualUrl: res.manual_url,
          });
          appendLog(
            confirmed
              ? `[${id}] User confirmed manual step complete.`
              : `[${id}] Skipped manual step.`
          );
        }
      } catch (err) {
        appendLog(`[${id}] ERROR: ${String(err)}`);
      }
    }
    await runScan();
    setInstalling(false);
  };

  const scanMap = new Map(scans.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Pre-Flight System Guardrails */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">{t.guardrails.title}</h2>
          <button
            type="button"
            onClick={runScan}
            disabled={scanning || installing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{t.onboarding.rescanBtn}</span>
          </button>
        </div>

        {guardrails && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 text-xs">
                <Cpu className="h-4 w-4 shrink-0 text-indigo-600" />
                <div>
                  <div className="text-slate-500">{t.guardrails.osLabel}</div>
                  <div className="font-bold text-slate-800" dir="ltr">
                    {guardrails.os_name} {guardrails.os_version} ({guardrails.arch})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 text-xs">
                <HardDrive
                  className={`h-4 w-4 shrink-0 ${guardrails.disk_ok ? 'text-emerald-600' : 'text-amber-600'}`}
                />
                <div>
                  <div className="text-slate-500">{t.guardrails.diskLabel}</div>
                  <div className="font-bold text-slate-800">
                    {guardrails.free_disk_gb.toFixed(1)} GB —{' '}
                    {guardrails.disk_ok ? t.guardrails.diskOk : t.guardrails.diskLow}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 text-xs">
                <FolderCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <div className="text-slate-500">{t.guardrails.pathLabel}</div>
                  <div className="truncate font-mono font-bold text-slate-800" dir="ltr">
                    {guardrails.workshop_root}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 text-xs">
                <Wifi
                  className={`h-4 w-4 shrink-0 ${guardrails.internet_ok ? 'text-emerald-600' : 'text-rose-600'}`}
                />
                <div>
                  <div className="text-slate-500">{t.guardrails.internetLabel}</div>
                  <div className="font-bold text-slate-800">
                    {guardrails.internet_ok ? t.guardrails.internetOk : t.guardrails.internetFail}
                  </div>
                </div>
              </div>
            </div>

            {!guardrails.home_is_ascii && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {t.guardrails.asciiWarning}{' '}
                  <strong className="font-mono" dir="ltr">
                    {guardrails.workshop_root}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Optional Component Selection Cards */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.onboarding.heading}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 sm:text-sm">
              {t.onboarding.subheading}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectRecommendedMissing}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              {t.onboarding.selectAllMissing}
            </button>
            <button
              type="button"
              onClick={() => onSelectedAppsChange([])}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t.onboarding.clearSelection}
            </button>
          </div>
        </div>

        {scanning ? (
          <div className="py-10 text-center text-sm text-slate-500">{t.onboarding.scanning}</div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {COMPONENT_ORDER.map((id) => {
              const copy = t.components[id];
              const status = scanMap.get(id);
              const isSelected = selectedApps.includes(id);
              const isInstalled = Boolean(status?.installed);

              return (
                <div
                  key={id}
                  onClick={() => !installing && toggleSelect(id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-200'
                      : isInstalled
                        ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={installing}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{copy.title}</h3>
                        <p className="text-xs text-slate-500">{copy.subtitle}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600" dir="ltr">
                      {copy.approxSize}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-700">{copy.whyNeeded}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{t.onboarding.alreadyInstalled}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {t.onboarding.notFound}
                      </span>
                    )}

                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                      {copy.recommendedTag ?? t.onboarding.optionalBadge}
                    </span>

                    {status?.detected_path && (
                      <span className="truncate text-[11px] text-slate-400" dir="ltr">
                        {status.detected_path}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-100">
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-indigo-300">
              <Terminal className="h-3.5 w-3.5" />
              <span>{t.onboarding.liveLogTitle}</span>
            </div>
            <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed" dir="ltr">
              {logs.join('\n')}
            </pre>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            disabled={installing || selectedApps.length === 0}
            onClick={handleInstallAll}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>
              {installing
                ? t.onboarding.installing
                : `${t.onboarding.installSelected} (${selectedApps.length})`}
            </span>
          </button>

          <button
            type="button"
            disabled={installing}
            onClick={onContinueToDiagnostics}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <span>
              {logs.length > 0
                ? t.onboarding.continueToDiagnostics
                : t.onboarding.skipToDiagnostics}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <PreActionModal
        payload={activeModal}
        onVerifyDone={() => {
          setActiveModal(null);
          pendingResolver?.(true);
          setPendingResolver(null);
        }}
        onSkip={() => {
          setActiveModal(null);
          pendingResolver?.(false);
          setPendingResolver(null);
        }}
      />
    </div>
  );
};
