import React from 'react';
import { BrainCircuit, Globe, LogOut, Megaphone, AlertTriangle, Palette } from 'lucide-react';
import { useI18n } from '../i18n';
import { ENABLE_THEME_SWATCH_DEBUG, THEME_OPTIONS, useTheme } from '../theme';
import { HUB_VERSION, isTauriRuntime } from '../api/bridge';
import type { AppScreen, AuthUser, HubUpdateInfo, Manifest } from '../types';

interface HeaderProps {
  user: AuthUser | null;
  screen: AppScreen;
  manifest: Manifest | null;
  updateInfo?: HubUpdateInfo | null;
  onNavigate: (next: AppScreen) => void;
  onSignOut: () => void;
  onOpenUpdateModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  screen,
  manifest,
  updateInfo,
  onNavigate,
  onSignOut,
  onOpenUpdateModal,
}) => {
  const { lang, setLang, t } = useI18n();
  const {
    theme,
    setTheme,
    fontScale,
    increaseFont,
    decreaseFont,
    canIncreaseFont,
    canDecreaseFont,
  } = useTheme();

  const notice = manifest?.notice;
  const noticeText = notice ? (lang === 'he' ? notice.he : notice.en) : '';

  const navItems: { id: AppScreen; label: string }[] = [
    { id: 'dashboard', label: t.nav.dashboard },
    { id: 'onboarding', label: t.nav.onboarding },
    { id: 'diagnostics', label: t.nav.diagnostics },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{t.appName}</h1>
              <span
                className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                dir="ltr"
              >
                v{HUB_VERSION}
              </span>
              {updateInfo?.update_available && onOpenUpdateModal && (
                <button
                  type="button"
                  onClick={onOpenUpdateModal}
                  className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 transition hover:bg-amber-200"
                >
                  {t.update.pillLabel} <span dir="ltr">v{updateInfo.latest_version}</span>
                </button>
              )}
              {!isTauriRuntime() && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {t.previewBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 sm:text-sm">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Fixed px sizing on toolbar prevents A+/A- from shifting buttons under a stationary cursor */}
        <div
          className="flex shrink-0 flex-wrap items-center gap-[8px]"
          style={{ fontSize: '13px', lineHeight: '18px' }}
        >
          {ENABLE_THEME_SWATCH_DEBUG && (
            <div
              className="inline-flex items-center gap-[6px] rounded-[8px] border border-slate-200 bg-slate-50 px-[10px] py-[6px]"
              title={lang === 'he' ? 'בחירת ערכת צבעים (מצב ניסוי)' : 'Theme color swatch (debug)'}
            >
              <Palette className="h-[14px] w-[14px] text-slate-500" />
              {THEME_OPTIONS.map((opt) => {
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    title={lang === 'he' ? opt.labelHe : opt.labelEn}
                    aria-label={lang === 'he' ? opt.labelHe : opt.labelEn}
                    className={`h-[16px] w-[16px] rounded-full transition-transform ${
                      active
                        ? 'scale-125 ring-2 ring-slate-900 ring-offset-1'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.swatchHex }}
                  />
                );
              })}
            </div>
          )}

          {/* Accessibility A- / A+ font size ticker */}
          <div
            className="inline-flex items-center overflow-hidden rounded-[8px] border border-slate-200 bg-slate-50"
            dir="ltr"
            aria-label={lang === 'he' ? 'הגדלת והקטנת גופן' : 'Adjust font size'}
          >
            <button
              type="button"
              disabled={!canDecreaseFont}
              onClick={decreaseFont}
              title={lang === 'he' ? 'הקטן גופן' : 'Decrease font size'}
              className="w-[32px] py-[6px] text-center text-[12px] font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              A-
            </button>
            <span className="w-[46px] border-x border-slate-200 py-[6px] text-center text-[11px] font-semibold text-slate-500 tabular-nums">
              {fontScale}%
            </span>
            <button
              type="button"
              disabled={!canIncreaseFont}
              onClick={increaseFont}
              title={lang === 'he' ? 'הגדל גופן' : 'Increase font size'}
              className="w-[32px] py-[6px] text-center text-[12px] font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              A+
            </button>
          </div>

          {/* Explicit 2-segment language selector */}
          <div
            className="inline-flex items-center overflow-hidden rounded-[8px] border border-slate-200 bg-slate-50 p-[2px]"
            dir="ltr"
            role="group"
            aria-label="Language"
          >
            <Globe className="mx-[6px] h-[14px] w-[14px] shrink-0 text-brand-600" />
            <button
              type="button"
              onClick={() => setLang('he')}
              className={`rounded-[6px] px-[8px] py-[4px] text-[12px] font-bold transition ${
                lang === 'he'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              עברית
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-[6px] px-[8px] py-[4px] text-[12px] font-bold transition ${
                lang === 'en'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>

          {user && (
            <div className="flex items-center gap-[8px] rounded-[8px] border border-slate-200 bg-slate-50 px-[10px] py-[5px]">
              <div className="hidden text-start sm:block">
                <div className="text-[12px] font-semibold text-slate-800">{user.name}</div>
                <div className="text-[11px] text-slate-500">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title={t.signIn.signOut}
                className="rounded p-[4px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                <LogOut className="h-[15px] w-[15px]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {user && screen !== 'sign_in' && (
        <nav className="border-t border-slate-100 bg-slate-50/70">
          <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
            {navItems.map((item) => {
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
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
          className={`border-t px-4 py-2.5 text-xs sm:px-6 sm:text-sm ${
            notice.severity === 'urgent'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : notice.severity === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-brand-200 bg-brand-50 text-brand-900'
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
