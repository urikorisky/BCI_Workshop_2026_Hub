import React, { useState } from 'react';
import { LifeBuoy, Send, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { runDiagnostics, uploadTelemetry } from '../api/bridge';
import type { AuthUser, ComponentId, Manifest } from '../types';

interface HelpReportModalProps {
  open: boolean;
  user: AuthUser;
  manifest: Manifest | null;
  selectedApps: ComponentId[];
  onClose: () => void;
}

export const HelpReportModal: React.FC<HelpReportModalProps> = ({
  open,
  user,
  manifest,
  selectedApps,
  onClose,
}) => {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const report = await runDiagnostics(selectedApps);
      const endpoint = manifest?.urls.telemetry_endpoint ?? '';
      const resp = await uploadTelemetry({
        endpoint,
        user,
        eventType: 'help_request',
        report,
        optionalAppsSelected: selectedApps,
        studentNote: note.trim(),
      });
      if (resp.ok) {
        setResult({ ok: true, text: t.helpModal.sentSuccess });
        setNote('');
      } else {
        setResult({ ok: false, text: resp.error ?? 'Upload failed' });
      }
    } catch (err) {
      setResult({ ok: false, text: String(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.helpModal.title}</h3>
              <p className="mt-0.5 text-xs text-slate-600">{t.helpModal.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <textarea
            rows={4}
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.helpModal.placeholder}
            className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          {result && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{result.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              {t.helpModal.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={sending || note.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sending ? t.helpModal.sending : t.helpModal.sendBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
