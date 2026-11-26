import React, { useState } from 'react';
import { Download, ExternalLink, Sparkles, X } from 'lucide-react';
import { downloadAndOpenHubUpdate, openExternalUrl } from '../api/bridge';
import { useI18n } from '../i18n';
import type { HubUpdateInfo } from '../types';

interface UpdatePromptModalProps {
  open: boolean;
  info: HubUpdateInfo | null;
  onClose: () => void;
}

export const UpdatePromptModal: React.FC<UpdatePromptModalProps> = ({ open, info, onClose }) => {
  const { lang, t } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const [openedPath, setOpenedPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !info || !info.update_available) {
    return null;
  }

  const formattedDate = info.published_at
    ? new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(info.published_at))
    : null;

  const fallbackUrl = info.download_url ?? info.release_url;

  const handleInstallClick = async () => {
    if (!info.download_url) {
      await openExternalUrl(info.release_url);
      return;
    }
    setDownloading(true);
    setErrorMsg(null);
    try {
      const assetName = info.asset_name ?? `BCI_Workshop_Hub_${info.latest_version}`;
      const path = await downloadAndOpenHubUpdate(info.download_url, assetName);
      setOpenedPath(path);
    } catch (err) {
      setErrorMsg(`${t.update.errorPrefix} ${String(err)}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{t.update.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                <span>{t.update.versionLabel} </span>
                <span className="font-semibold text-slate-700" dir="ltr">
                  v{info.current_version} → v{info.latest_version}
                </span>
                {formattedDate ? <span className="ms-1.5">({formattedDate})</span> : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t.update.closeBtn}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-700">{t.update.body}</p>

        {info.asset_name && (
          <div
            className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
            dir="ltr"
          >
            {info.asset_name}
          </div>
        )}

        {openedPath && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed font-medium text-emerald-900">
            {t.update.openedNote}
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {openedPath ? t.update.closeBtn : t.update.laterBtn}
          </button>

          <button
            type="button"
            onClick={() => openExternalUrl(fallbackUrl)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{t.update.openBrowserBtn}</span>
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={handleInstallClick}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Download className={`h-4 w-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? t.update.downloadingBtn : t.update.installBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
