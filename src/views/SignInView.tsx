import React, { useState } from 'react';
import { ShieldCheck, Lock, Check, X, LogIn, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { getSystemGuardrails, startGoogleSignIn, uploadTelemetry } from '../api/bridge';
import type { AuthUser, Manifest } from '../types';

interface SignInViewProps {
  manifest: Manifest | null;
  onSignedIn: (user: AuthUser, rememberMe: boolean) => void;
}

export const SignInView: React.FC<SignInViewProps> = ({ manifest, onSignedIn }) => {
  const { t } = useI18n();
  const [consented, setConsented] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const clientId = manifest?.oauth_client_id ?? '';
      const [user, guardrails] = await Promise.all([
        startGoogleSignIn(clientId),
        getSystemGuardrails().catch(() => null),
      ]);
      const osArch = guardrails
        ? `${guardrails.os_name} ${guardrails.os_version} (${guardrails.arch})`.trim()
        : '';
      const endpoint = manifest?.urls.telemetry_endpoint ?? '';
      if (endpoint && !endpoint.includes('REPLACE_WITH')) {
        void uploadTelemetry({
          endpoint,
          user,
          eventType: 'sign_in',
          osArch,
          optionalAppsSelected: [],
        }).catch(() => {});
      }
      onSignedIn(user, rememberMe);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700">
            <ShieldCheck className="h-4 w-4" />
            <span>Bar-Ilan University • 2026</span>
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {t.signIn.welcomeTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {t.signIn.welcomeBody}
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Lock className="h-4 w-4 text-brand-600" />
            <span>{t.signIn.privacyTitle}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t.signIn.privacyIntro}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <p className="text-xs font-bold text-emerald-800 sm:text-sm">{t.signIn.sentListTitle}</p>
              <ul className="mt-2 space-y-2 text-xs text-slate-700 sm:text-sm">
                {t.signIn.sentItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-800 sm:text-sm">{t.signIn.neverSentTitle}</p>
              <ul className="mt-2 space-y-2 text-xs text-slate-600 sm:text-sm">
                {t.signIn.neverSentItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3.5 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>{t.signIn.consentCheckbox}</span>
          </label>

          <label className="mt-2.5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>{t.signIn.rememberMe}</span>
          </label>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={!consented || loading}
            onClick={handleSignIn}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-5 w-5" />
            <span>{loading ? t.signIn.signingIn : t.signIn.signInButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
