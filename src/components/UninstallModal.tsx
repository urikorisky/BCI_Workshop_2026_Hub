import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import { executeUninstall, getUninstallPlan } from '../api/bridge';
import { useI18n } from '../i18n';
import type { UninstallExecutionResult, UninstallItem, UninstallPlan } from '../types';

interface UninstallModalProps {
  open: boolean;
  osName?: string;
  onClose: () => void;
}

export const UninstallModal: React.FC<UninstallModalProps> = ({ open, osName, onClose }) => {
  const { lang, t } = useI18n();
  const [plan, setPlan] = useState<UninstallPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uninstallSelf, setUninstallSelf] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<UninstallExecutionResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setResult(null);
    setLoadError(null);
    setUninstallSelf(true);
    void getUninstallPlan()
      .then((loaded) => {
        setPlan(loaded);
        setSelectedIds(
          new Set(loaded.items.filter((it) => it.default_checked).map((it) => it.id))
        );
      })
      .catch((err) => {
        setLoadError(String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  if (!open) {
    return null;
  }

  const isMac = osName?.toLowerCase().includes('mac') || osName?.toLowerCase().includes('darwin');

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setRunning(true);
    setLoadError(null);
    try {
      const res = await executeUninstall(Array.from(selectedIds), uninstallSelf);
      setResult(res);
    } catch (err) {
      setLoadError(String(err));
    } finally {
      setRunning(false);
    }
  };

  const workshopItems = plan?.items.filter((i) => i.category === 'workshop_data') ?? [];
  const hubAppItems = plan?.items.filter((i) => i.category === 'hub_installed_app') ?? [];

  const renderItem = (item: UninstallItem) => {
    const checked = selectedIds.has(item.id);
    const label = lang === 'he' ? item.label_he : item.label_en;
    return (
      <label
        key={item.id}
        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
          checked ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={running}
          onChange={() => toggleItem(item.id)}
          className="mt-1 h-4 w-4 accent-rose-600"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900 sm:text-sm">{label}</span>
            {typeof item.size_mb === 'number' && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600" dir="ltr">
                {item.size_mb.toFixed(1)} MB
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-slate-500" dir="ltr">
            {item.path_display}
          </div>
          {item.requires_external_uninstaller && (
            <div className="mt-0.5 text-[11px] text-amber-700">{t.uninstall.externalUninstallerHint}</div>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{t.uninstall.title}</h3>
              <p className="mt-0.5 text-xs text-slate-600">{t.uninstall.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            aria-label={t.uninstall.closeBtn}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t.uninstall.loading}</span>
            </div>
          ) : result ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>{t.uninstall.doneRemoved} {result.removed.length}</span>
              </div>
              {result.removed.length > 0 && (
                <ul className="list-disc space-y-1 ps-5 text-[11px]" dir="ltr">
                  {result.removed.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              {result.launched_uninstallers.length > 0 && (
                <div className="pt-1">
                  <div className="font-bold">{t.uninstall.doneLaunched}</div>
                  <div className="text-[11px]">{result.launched_uninstallers.join(', ')}</div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-800">
                  <div className="font-bold">{t.uninstall.doneErrors}</div>
                  <ul className="list-disc ps-5 text-[11px]" dir="ltr">
                    {result.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              {plan && plan.preexisting_protected.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <span className="font-bold">{t.uninstall.protectedPrefix} </span>
                    <span>{plan.preexisting_protected.join(', ')}</span>
                  </div>
                </div>
              )}

              {workshopItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t.uninstall.workshopDataHeading}
                  </h4>
                  <div className="space-y-2">{workshopItems.map(renderItem)}</div>
                </div>
              )}

              {hubAppItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t.uninstall.hubAppsHeading}
                  </h4>
                  <div className="space-y-2">{hubAppItems.map(renderItem)}</div>
                </div>
              )}

              {workshopItems.length === 0 && hubAppItems.length === 0 && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  {t.uninstall.emptyItems}
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3.5">
                <input
                  type="checkbox"
                  checked={uninstallSelf}
                  disabled={running}
                  onChange={(e) => setUninstallSelf(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-rose-600"
                />
                <div>
                  <div className="text-xs font-extrabold text-slate-900 sm:text-sm">
                    {t.uninstall.uninstallSelfLabel}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-600">
                    {isMac ? t.uninstall.uninstallSelfDescMac : t.uninstall.uninstallSelfDescWindows}
                  </div>
                </div>
              </label>
            </>
          )}

          {loadError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {loadError}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            disabled={running}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {result ? t.uninstall.closeBtn : t.uninstall.cancelBtn}
          </button>

          {!result && !loading && (
            <button
              type="button"
              disabled={running || (selectedIds.size === 0 && !uninstallSelf)}
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>{running ? t.uninstall.runningBtn : t.uninstall.confirmBtn}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
