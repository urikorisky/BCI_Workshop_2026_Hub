import React, { useEffect, useState } from 'react';
import { Usb, RefreshCw, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { findArduinoPorts } from '../api/bridge';
import type { SerialDeviceInfo } from '../types';

interface FindArduinoModalProps {
  open: boolean;
  onClose: () => void;
}

export const FindArduinoModal: React.FC<FindArduinoModalProps> = ({ open, onClose }) => {
  const { t } = useI18n();
  const [ports, setPorts] = useState<SerialDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      const list = await findArduinoPorts();
      setPorts(list);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (open) {
      void scan();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
              <Usb className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.findArduino.title}</h3>
              <p className="mt-0.5 text-xs text-slate-600">{t.findArduino.subtitle}</p>
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

        <div className="mt-4">
          <button
            type="button"
            onClick={scan}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? t.findArduino.scanning : t.findArduino.scanBtn}</span>
          </button>
        </div>

        <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto">
          {!scanning && ports.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-600">
              {t.findArduino.empty}
            </div>
          )}

          {ports.map((p) => (
            <div
              key={p.port}
              className={`rounded-xl border p-3.5 ${
                p.is_ch340
                  ? 'border-indigo-300 bg-indigo-50/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-slate-900" dir="ltr">
                  {p.port}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {p.is_ch340 && (
                    <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      {t.findArduino.ch340Badge}
                    </span>
                  )}
                  {p.is_ftdi && (
                    <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      {t.findArduino.ftdiBadge}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-600" dir="ltr">
                {p.description}
                {p.vid && p.pid ? ` (VID:${p.vid} PID:${p.pid})` : ''}
              </p>

              <div className="mt-2">
                {p.port_busy ? (
                  <div className="flex items-start gap-1.5 rounded-lg bg-amber-100 p-2 text-xs font-medium text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{t.findArduino.busyWarning}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t.findArduino.freeBadge}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            {t.findArduino.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
