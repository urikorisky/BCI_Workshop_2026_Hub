import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UploadCloud,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { runDiagnostics, uploadTelemetry } from '../api/bridge';
import { hasInstalledBefore, hasWorkshopSetupOnDisk } from '../state/onboardingState';
import type {
  AuthUser,
  ComponentId,
  ComponentScanStatus,
  DiagnosticReport,
  Manifest,
} from '../types';

interface DiagnosticsViewProps {
  user: AuthUser;
  manifest: Manifest | null;
  scans: ComponentScanStatus[];
  selectedApps: ComponentId[];
  onGoDashboard: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  user,
  manifest,
  scans,
  selectedApps,
  onGoDashboard,
}) => {
  const { t } = useI18n();
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [running, setRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const hasAutoStarted = useRef(false);

  const isPostInstall = hasInstalledBefore() || hasWorkshopSetupOnDisk(scans);

  const uploadReport = async (diagReport: DiagnosticReport) => {
    const endpoint = manifest?.urls.telemetry_endpoint ?? '';
    if (!endpoint || endpoint.includes('REPLACE_WITH')) return;
    setUploading(true);
    setUploadNotice(null);
    const phaseTag = isPostInstall ? '[PHASE: POST-INSTALL]' : '[PHASE: PRE-INSTALL]';
    try {
      const resp = await uploadTelemetry({
        endpoint,
        user,
        eventType: isPostInstall ? 'post_install_diagnostics' : 'diagnostics',
        report: diagReport,
        optionalAppsSelected: selectedApps,
        rawLogs: `${phaseTag}\n${diagReport.raw_logs}`,
      });
      if (resp.ok) {
        setUploadNotice({ ok: true, msg: t.diagnostics.uploadSuccess });
      } else {
        setUploadNotice({ ok: false, msg: `${t.diagnostics.uploadError} ${resp.error ?? ''}` });
      }
    } catch (err) {
      setUploadNotice({ ok: false, msg: `${t.diagnostics.uploadError} ${String(err)}` });
    } finally {
      setUploading(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setUploadNotice(null);
    try {
      const res = await runDiagnostics(selectedApps);
      setReport(res);
      await uploadReport(res);
    } finally {
      setRunning(false);
    }
  };

  // Auto-run hardware-free verification and auto-upload on entering this screen.
  useEffect(() => {
    if (!hasAutoStarted.current) {
      hasAutoStarted.current = true;
      void handleRun();
    }
  }, []);

  const renderStatusIcon = (status: string) => {
    if (status === 'pass') return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    if (status === 'warn') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-rose-600" />;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.diagnostics.heading}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              {t.diagnostics.subheading}
            </p>
          </div>
          <button
            type="button"
            disabled={running}
            onClick={handleRun}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Activity className={`h-4 w-4 ${running ? 'animate-pulse' : ''}`} />
            <span>{running ? t.diagnostics.running : t.diagnostics.runBtn}</span>
          </button>
        </div>

        {running && !report && (
          <div className="py-12 text-center text-base font-medium text-slate-500">
            {t.diagnostics.running}
          </div>
        )}

        {report && (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-xl border p-4 text-base font-bold ${
                report.overall_status === 'pass'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : report.overall_status === 'warn'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {t.diagnostics.overallLabels[report.overall_status]}
            </div>

            <div className="space-y-3">
              {report.checks.map((chk) => {
                const remediationText = chk.remediation_key
                  ? t.diagnostics.remediations[
                      chk.remediation_key as keyof typeof t.diagnostics.remediations
                    ]
                  : undefined;

                return (
                  <div
                    key={chk.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {renderStatusIcon(chk.status)}
                        <span className="text-sm font-bold text-slate-900 sm:text-base">
                          {t.diagnostics.checkNames[chk.id]}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                          chk.status === 'pass'
                            ? 'bg-emerald-100 text-emerald-800'
                            : chk.status === 'warn'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.diagnostics.statusLabels[chk.status]}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-700 sm:text-sm" dir="ltr">
                      {chk.summary}
                    </p>
                    {chk.details && (
                      <p className="mt-1 text-xs text-slate-500" dir="ltr">
                        {chk.details}
                      </p>
                    )}

                    {remediationText && chk.status !== 'pass' && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:text-sm">
                        <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{remediationText}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {uploading && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm font-semibold text-brand-800">
                {t.diagnostics.uploading}
              </div>
            )}

            {uploadNotice && (
              <div
                className={`rounded-xl border p-3.5 text-sm font-semibold ${
                  uploadNotice.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {uploadNotice.msg}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={uploading}
                onClick={() => void uploadReport(report)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 shadow-xs transition hover:bg-emerald-50 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                <span>{uploading ? t.diagnostics.uploading : t.diagnostics.uploadBtn}</span>
              </button>

              <button
                type="button"
                onClick={onGoDashboard}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
              >
                <span>{t.diagnostics.goDashboard}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
