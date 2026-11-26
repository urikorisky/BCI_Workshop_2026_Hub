import React from 'react';
import { BrainCircuit, Globe, LogOut, Megaphone, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n';
import { isTauriRuntime } from '../api/bridge';
import type { AppScreen, AuthUser, Manifest } from '../types';

interface HeaderProps {
  user: AuthUser | null;
  screen: AppScreen;
  manifest: Manifest | null;
  onNavigate: (next: AppScreen) => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  screen,
  manifest,
  onNavigate,
  onSignOut,
}) => {
  const { lang, t, toggleLang } = useI18n();
  const notice = manifest?.notice;
  const noticeText = notice ? (lang === 'he' ? notice.he : notice.en) : '';

  const navItems: { id: AppScreen; label: string }[] = [
    { id: 'onboarding', label: t.nav.onboarding },
    { id: 'diagnostics', label: t.nav.diagnostics },
    { id: 'dashboard', label: t.nav.dashboard },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">{t.appName}</h1>
              {!isTauriRuntime() && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {t.previewBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-600" />
            <span>{t.langToggle}</span>
          </button>

          {user && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <div className="hidden text-start sm:block">
                <div className="font-semibold text-slate-800">{user.name}</div>
                <div className="text-[11px] text-slate-500">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title={t.signIn.signOut}
                className="rounded p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {user && screen !== 'sign_in' && (
        <nav className="border-t border-slate-100 bg-slate-50/70">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
            {navItems.map((item) => {
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {notice?.enabled && noticeText.trim().length > 0 && (
        <div
          className={`border-t px-4 py-2 text-xs sm:px-6 sm:text-sm ${
            notice.severity === 'urgent'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : notice.severity === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-indigo-200 bg-indigo-50 text-indigo-900'
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2 font-medium">
            {notice.severity === 'info' ? (
              <Megaphone className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{noticeText}</span>
          </div>
        </div>
      )}
    </header>
  );
};
