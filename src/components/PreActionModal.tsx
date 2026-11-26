import React from 'react';
import { ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { openExternalUrl } from '../api/bridge';
import type { PreActionModalPayload } from '../types';

interface PreActionModalProps {
  payload: PreActionModalPayload | null;
  onVerifyDone: () => void;
  onSkip: () => void;
}

export const PreActionModal: React.FC<PreActionModalProps> = ({
  payload,
  onVerifyDone,
  onSkip,
}) => {
  const { t } = useI18n();
  if (!payload) return null;

  const actionCopy = t.preAction.actions[payload.actionType];
  const compCopy = t.components[payload.componentId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {t.preAction.titlePrefix} {compCopy.title}
            </p>
            <h3 className="mt-0.5 text-lg font-bold text-slate-900">{actionCopy.title}</h3>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="font-semibold text-slate-800">{t.preAction.whatHappensLabel}</p>
            <p className="mt-1 text-slate-600">{actionCopy.whatHappens}</p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5">
            <p className="font-semibold text-indigo-950">{t.preAction.whatToClickLabel}</p>
            <p className="mt-1.5 whitespace-pre-line leading-relaxed text-indigo-900">
              {actionCopy.whatToClick}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          {payload.manualUrl && (
            <button
              type="button"
              onClick={() => openExternalUrl(payload.manualUrl!)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{t.preAction.openLinkBtn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {t.preAction.skipBtn}
          </button>

          <button
            type="button"
            onClick={onVerifyDone}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{t.preAction.verifyDoneBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
