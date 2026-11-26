import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  HardDrive,
  RefreshCw,
  Wifi,
  FolderCheck,
  AlertTriangle,
  AlertCircle,
  Download,
  ArrowRight,
  Terminal,
  Info,
  UploadCloud,
} from 'lucide-react';
import { useI18n } from '../i18n';
import {
  getSystemGuardrails,
  installComponent,
  listenInstallProgress,
  runDiagnostics,
  scanInstalledComponents,
  uploadTelemetry,
} from '../api/bridge';
import { PreActionModal } from '../components/PreActionModal';
import type {
  AuthUser,
  ComponentId,
  ComponentScanStatus,
  Manifest,
  PreActionModalPayload,
  SystemGuardrails,
} from '../types';

interface OnboardingViewProps {
  user: AuthUser;
  manifest: Manifest | null;
  selectedApps: ComponentId[];
  onSelectedAppsChange: (ids: ComponentId[]) => void;
  onScanUpdated: (scans: ComponentScanStatus[]) => void;
  onContinueToDiagnostics: () => void;
}

const REQUIRED_IDS: ComponentId[] = [
  'python_env',
  'arduino_ide',
  'drivers',
  'openbci_gui',
  'lab_recorder',
];

const COMPONENT_ORDER: ComponentId[] = [
  'python_env',
  'arduino_ide',
  'drivers',
  'openbci_gui',
  'lab_recorder',
  'jupyterlab',
  'thonny',
  'antigravity',
  'github_desktop',
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  user,
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
  const [preScanTelemetryState, setPreScanTelemetryState] = useState<'idle' | 'sending' | 'sent'>(
    'idle'
  );
  const [failedComponents, setFailedComponents] = useState<{ id: ComponentId; message: string }[]>(
    []
  );
  const [installSummaryState, setInstallSummaryState] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [errorReportStatus, setErrorReportStatus] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [activeModal, setActiveModal] = useState<PreActionModalPayload | null>(null);
  const [pendingResolver, setPendingResolver] = useState<((ok: boolean) => void) | null>(null);
  const hasAutoUploadedPreScan = useRef(false);

  const appendLog = (line: string) => {
    setLogs((prev) => [...prev.slice(-80), line]);
  };

  const needsSetupAction = (id: ComponentId, list: ComponentScanStatus[]): boolean => {
    const status = list.find((item) => item.id === id);
    if (!status?.installed) return true;
    if (id === 'arduino_ide' && status.notes === 'ide_only_missing_libs') return true;
    return false;
  };

  const runScan = async (autoUploadBaseline = false) => {
    setScanning(true);
    try {
      const [g, s] = await Promise.all([getSystemGuardrails(), scanInstalledComponents()]);
      setGuardrails(g);
      setScans(s);
      onScanUpdated(s);
      const autoDefaults = REQUIRED_IDS.filter((id) => needsSetupAction(id, s));
      if (selectedApps.length === 0 && autoDefaults.length > 0 && !autoUploadBaseline) {
        onSelectedAppsChange(autoDefaults);
      } else if (autoUploadBaseline && selectedApps.length === 0 && autoDefaults.length > 0) {
        onSelectedAppsChange(autoDefaults);
      }

      if (autoUploadBaseline && !hasAutoUploadedPreScan.current) {
        hasAutoUploadedPreScan.current = true;
        const endpoint = manifest?.urls.telemetry_endpoint ?? '';
        if (endpoint && !endpoint.includes('REPLACE_WITH')) {
          setPreScanTelemetryState('sending');
          try {
            const baselineReport = await runDiagnostics(autoDefaults);
            const osArch = `${g.os_name} ${g.os_version} (${g.arch})`.trim();
            const resp = await uploadTelemetry({
              endpoint,
              user,
              eventType: 'pre_scan_diagnostics',
              report: baselineReport,
              osArch,
              optionalAppsSelected: autoDefaults,
            });
            setPreScanTelemetryState(resp.ok ? 'sent' : 'idle');
          } catch {
            setPreScanTelemetryState('idle');
          }
        }
      }
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    void runScan(true);
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

  const selectRequiredMissing = () => {
    const missing = REQUIRED_IDS.filter((id) => needsSetupAction(id, scans));
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
    setFailedComponents([]);
    setInstallSummaryState('idle');
    setErrorReportStatus('idle');

    const sessionLogs: string[] = [];
    const pushSessionLog = (line: string) => {
      sessionLogs.push(line);
      appendLog(line);
    };

    const failures: { id: ComponentId; message: string }[] = [];
    const succeededIds = new Set<ComponentId>();

    for (const id of selectedApps) {
      pushSessionLog(`--- ${t.components[id].title} ---`);
      try {
        const res = await installComponent(id, manifest);
        pushSessionLog(res.message);
        if (res.status === 'failed') {
          failures.push({ id, message: res.message });
        } else if (res.status === 'needs_manual_step' && res.manual_action_type) {
          const confirmed = await waitForManualStep({
            componentId: id,
            actionType: res.manual_action_type,
            manualUrl: res.manual_url,
          });
          pushSessionLog(
            confirmed
              ? `[${id}] User confirmed manual step complete.`
              : `[${id}] Skipped manual step.`
          );
          if (confirmed) {
            succeededIds.add(id);
          }
        } else {
          succeededIds.add(id);
        }
      } catch (err) {
        const errText = String(err);
        pushSessionLog(`[${id}] ERROR: ${errText}`);
        failures.push({ id, message: errText });
      }
    }

    await runScan(false);
    // Keep only failed/pending items selected so the user isn't prompted to reinstall succeeded ones.
    onSelectedAppsChange(selectedApps.filter((id) => !succeededIds.has(id)));
    setFailedComponents(failures);

    if (failures.length > 0) {
      setInstallSummaryState('error');
      const endpoint = manifest.urls.telemetry_endpoint;
      if (endpoint && !endpoint.includes('REPLACE_WITH')) {
        try {
          const osArch = guardrails
            ? `${guardrails.os_name} ${guardrails.os_version} (${guardrails.arch})`.trim()
            : '';
          const diag = await runDiagnostics(selectedApps).catch(() => undefined);
          const resp = await uploadTelemetry({
            endpoint,
            user,
            eventType: 'install_error',
            report: diag,
            osArch,
            overallStatus: 'INSTALL_ERROR',
            optionalAppsSelected: selectedApps,
            studentNote: `Auto-report: install failed for ${failures.map((f) => `${f.id} (${f.message})`).join('; ')}`,
            rawLogs: `${sessionLogs.join('\n')}\n\n${diag?.raw_logs ?? ''}`.trim(),
          });
          setErrorReportStatus(resp.ok ? 'sent' : 'failed');
        } catch {
          setErrorReportStatus('failed');
        }
      }
    } else {
      setInstallSummaryState('success');
    }

    setInstalling(false);
  };

  const scanMap = new Map(scans.map((s) => [s.id, s]));

  const getCardPreScanBanner = (
    id: ComponentId,
    status?: ComponentScanStatus
  ): string | null => {
    if (!status) return null;
    if (id === 'python_env') {
      const ver = status.detected_version ?? '';
      if (status.notes === 'venv_ready') {
        return t.onboarding.pythonVenvReady.replace('{ver}', ver);
      }
      if (status.notes === 'compatible_system_python') {
        return t.onboarding.pythonReuseCompatible.replace('{ver}', ver);
      }
      if (status.notes === 'incompatible_system_python') {
        return t.onboarding.pythonIncompatibleFound.replace('{ver}', ver);
      }
      if (status.notes === 'not_found') {
        return t.onboarding.pythonNotFound;
      }
    }
    if (id === 'arduino_ide' && status.notes === 'ide_only_missing_libs') {
      return t.onboarding.arduinoIdeOnlyBanner;
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Pre-Flight System Guardrails */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">{t.guardrails.title}</h2>
            {preScanTelemetryState === 'sending' && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {t.onboarding.preScanUploading}
              </span>
            )}
            {preScanTelemetryState === 'sent' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <UploadCloud className="h-3.5 w-3.5" />
                <span>{t.onboarding.preScanUploadOk}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void runScan(false)}
            disabled={scanning || installing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{t.onboarding.rescanBtn}</span>
          </button>
        </div>

        {guardrails && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 text-sm">
                <Cpu className="h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <div className="text-xs text-slate-500">{t.guardrails.osLabel}</div>
                  <div className="font-bold text-slate-800" dir="ltr">
                    {guardrails.os_name} {guardrails.os_version} ({guardrails.arch})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 text-sm">
                <HardDrive
                  className={`h-5 w-5 shrink-0 ${guardrails.disk_ok ? 'text-emerald-600' : 'text-amber-600'}`}
                />
                <div>
                  <div className="text-xs text-slate-500">{t.guardrails.diskLabel}</div>
                  <div className="font-bold text-slate-800">
                    {guardrails.free_disk_gb.toFixed(1)} GB —{' '}
                    {guardrails.disk_ok ? t.guardrails.diskOk : t.guardrails.diskLow}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 text-sm">
                <FolderCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">{t.guardrails.pathLabel}</div>
                  <div className="truncate font-mono font-bold text-slate-800" dir="ltr">
                    {guardrails.workshop_root}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 text-sm">
                <Wifi
                  className={`h-5 w-5 shrink-0 ${guardrails.internet_ok ? 'text-emerald-600' : 'text-rose-600'}`}
                />
                <div>
                  <div className="text-xs text-slate-500">{t.guardrails.internetLabel}</div>
                  <div className="font-bold text-slate-800">
                    {guardrails.internet_ok ? t.guardrails.internetOk : t.guardrails.internetFail}
                  </div>
                </div>
              </div>
            </div>

            {!guardrails.home_is_ascii && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
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

      {/* Component Selection Cards */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.onboarding.heading}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              {t.onboarding.subheading}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectRequiredMissing}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              {t.onboarding.selectAllRequired}
            </button>
            <button
              type="button"
              onClick={() => onSelectedAppsChange([])}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t.onboarding.clearSelection}
            </button>
          </div>
        </div>

        {scanning ? (
          <div className="py-12 text-center text-base text-slate-500">{t.onboarding.scanning}</div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {COMPONENT_ORDER.map((id) => {
              const copy = t.components[id];
              const status = scanMap.get(id);
              const isSelected = selectedApps.includes(id);
              const isInstalled = Boolean(status?.installed);
              const isRequired = REQUIRED_IDS.includes(id);
              const preScanBanner = getCardPreScanBanner(id, status);

              return (
                <div
                  key={id}
                  onClick={() => !installing && toggleSelect(id)}
                  className={`cursor-pointer rounded-2xl border p-4.5 transition ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-200'
                      : isInstalled
                        ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={installing}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{copy.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{copy.subtitle}</p>
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                      dir="ltr"
                    >
                      {copy.approxSize}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                    {copy.whyNeeded}
                  </p>

                  {preScanBanner && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/70 p-2.5 text-xs font-medium text-brand-900">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{preScanBanner}</span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{t.onboarding.alreadyInstalled}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {t.onboarding.notFound}
                      </span>
                    )}

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isRequired
                          ? 'border border-rose-200 bg-rose-50 text-rose-800'
                          : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {copy.recommendedTag ??
                        (isRequired ? t.onboarding.requiredBadge : t.onboarding.optionalBadge)}
                    </span>

                    {status?.detected_path && (
                      <span className="truncate text-xs text-slate-400" dir="ltr">
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
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-brand-300">
              <Terminal className="h-4 w-4" />
              <span>{t.onboarding.liveLogTitle}</span>
            </div>
            <pre
              className="max-h-44 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed"
              dir="ltr"
            >
              {logs.join('\n')}
            </pre>
          </div>
        )}

        {installSummaryState === 'error' && failedComponents.length > 0 && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <div className="flex items-start gap-2.5 font-bold">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <span>{t.onboarding.installFailedTitle}</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 ps-6 text-xs sm:text-sm" dir="ltr">
              {failedComponents.map((f) => (
                <li key={f.id}>
                  <strong>{f.id}</strong>: {f.message}
                </li>
              ))}
            </ul>
            {errorReportStatus === 'sent' && (
              <p className="mt-2.5 text-xs font-semibold text-emerald-800 sm:text-sm">
                {t.onboarding.installErrorAutoSent}
              </p>
            )}
            {errorReportStatus === 'failed' && (
              <p className="mt-2.5 text-xs font-semibold text-rose-800 sm:text-sm">
                {t.onboarding.installErrorSendFailed}
              </p>
            )}
          </div>
        )}

        {installSummaryState === 'success' && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{t.onboarding.installAllSuccess}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            disabled={installing || selectedApps.length === 0}
            onClick={handleInstallAll}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
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
