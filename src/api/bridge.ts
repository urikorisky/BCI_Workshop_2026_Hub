import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import fallbackManifest from '../../manifest.json';
import type {
  AuthUser,
  ComponentId,
  ComponentScanStatus,
  DiagnosticReport,
  InstallActionResult,
  InstallProgressEvent,
  Manifest,
  SerialDeviceInfo,
  SystemGuardrails,
  TelemetryResponse,
} from '../types';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const PREVIEW_INSTALLED_SET = new Set<ComponentId>(['arduino_ide', 'github_desktop']);

export async function fetchManifest(): Promise<Manifest> {
  if (!isTauriRuntime()) {
    return fallbackManifest as Manifest;
  }
  try {
    return await invoke<Manifest>('fetch_manifest');
  } catch {
    return fallbackManifest as Manifest;
  }
}

export async function getSystemGuardrails(): Promise<SystemGuardrails> {
  if (!isTauriRuntime()) {
    return {
      os_name: 'Windows (Preview)',
      os_version: '11',
      arch: 'x86_64',
      workshop_root: 'C:\\BCI_Workshop_2026',
      home_dir: 'C:\\Users\\Student',
      home_is_ascii: true,
      root_is_ascii: true,
      free_disk_gb: 64.5,
      disk_ok: true,
      internet_ok: true,
    };
  }
  return invoke<SystemGuardrails>('get_system_guardrails');
}

export async function startGoogleSignIn(clientId: string): Promise<AuthUser> {
  if (!isTauriRuntime()) {
    await new Promise((r) => setTimeout(r, 700));
    return {
      email: 'student.preview@biu.ac.il',
      name: 'Preview Student',
      id_token: 'preview-mock-id-token',
    };
  }
  return invoke<AuthUser>('start_google_sign_in', { clientId });
}

export async function scanInstalledComponents(): Promise<ComponentScanStatus[]> {
  if (!isTauriRuntime()) {
    await new Promise((r) => setTimeout(r, 400));
    const allIds: ComponentId[] = [
      'python_env',
      'jupyterlab',
      'thonny',
      'arduino_ide',
      'drivers',
      'openbci_gui',
      'lab_recorder',
      'antigravity',
      'github_desktop',
    ];
    return allIds.map((id) => {
      if (id === 'python_env') {
        return {
          id,
          installed: false,
          detected_version: '3.14.0',
          detected_path: 'python',
          notes: 'incompatible_system_python',
        };
      }
      if (id === 'arduino_ide') {
        return {
          id,
          installed: true,
          detected_version: 'IDE installed (libs pending)',
          detected_path: 'C:\\Program Files\\Arduino IDE\\Arduino IDE.exe',
          notes: 'ide_only_missing_libs',
        };
      }
      return {
        id,
        installed: PREVIEW_INSTALLED_SET.has(id),
        detected_version: PREVIEW_INSTALLED_SET.has(id) ? 'Detected' : undefined,
        detected_path: PREVIEW_INSTALLED_SET.has(id) ? 'C:\\Program Files\\...' : undefined,
      };
    });
  }
  return invoke<ComponentScanStatus[]>('scan_installed_components');
}

export async function installComponent(
  id: ComponentId,
  manifest: Manifest
): Promise<InstallActionResult> {
  if (!isTauriRuntime()) {
    await new Promise((r) => setTimeout(r, 550));
    if (id === 'drivers') {
      PREVIEW_INSTALLED_SET.add(id);
      return {
        id,
        status: 'needs_manual_step',
        message: 'Driver installer launched (preview)',
        manual_action_type: 'windows_uac_driver',
      };
    }
    PREVIEW_INSTALLED_SET.add(id);
    return {
      id,
      status: 'completed',
      message: `${id} ready (preview)`,
    };
  }
  return invoke<InstallActionResult>('install_component', { id, manifest });
}

export async function listenInstallProgress(
  handler: (evt: InstallProgressEvent) => void
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {};
  }
  return listen<InstallProgressEvent>('install-progress', (event) => {
    handler(event.payload);
  });
}

export async function runDiagnostics(selectedApps: ComponentId[]): Promise<DiagnosticReport> {
  if (!isTauriRuntime()) {
    await new Promise((r) => setTimeout(r, 800));
    return {
      timestamp: new Date().toISOString(),
      os_arch: 'windows / x86_64 (preview)',
      hub_version: '0.1.1',
      overall_status: 'warn',
      checks: [
        {
          id: 'system_path',
          status: 'pass',
          summary: 'C:\\BCI_Workshop_2026 (ASCII OK), 64.5 GB free',
          details: 'OS: Windows 11 x86_64. Workshop root path verified.',
        },
        {
          id: 'arduino_compile',
          status: 'pass',
          summary: 'Compiled smoke sketch (Servo + AccelStepper)',
          details: 'arduino-cli compile --fqbn arduino:avr:uno succeeded in 2.4s.',
        },
        {
          id: 'drivers',
          status: PREVIEW_INSTALLED_SET.has('drivers') ? 'pass' : 'warn',
          summary: PREVIEW_INSTALLED_SET.has('drivers')
            ? 'CH340 & FTDI drivers detected'
            : 'CH340 driver not yet verified',
          details: 'Driver scan completed in preview mode.',
          remediation_key: PREVIEW_INSTALLED_SET.has('drivers') ? undefined : 'drivers_missing',
        },
        {
          id: 'python_gui',
          status: 'pass',
          summary: 'Python 3.11 + tkinter + PyQt6 OK',
          details: 'All core packages imported cleanly.',
        },
        {
          id: 'lsl_loopback',
          status: 'pass',
          summary: 'Synthetic LSL Outlet -> Inlet verified (5 samples)',
          details: 'liblsl loaded and resolved local stream.',
        },
        {
          id: 'brainflow_synthetic',
          status: 'pass',
          summary: 'BrainFlow SYNTHETIC_BOARD streamed 250 samples',
          details: 'Native BrainFlow library verified.',
        },
        {
          id: 'mic_audio',
          status: 'pass',
          summary: 'Input audio device accessible via sounddevice',
          details: 'Default microphone active.',
        },
        {
          id: 'optional_apps',
          status: 'pass',
          summary: 'Selected optional apps verified',
          details: `Checked: ${selectedApps.join(', ') || 'defaults'}`,
        },
      ],
      raw_logs: 'Preview diagnostic log output.',
    };
  }
  return invoke<DiagnosticReport>('run_diagnostics', { selectedApps });
}

export async function uploadTelemetry(params: {
  endpoint: string;
  user: AuthUser;
  eventType: 'sign_in' | 'pre_scan_diagnostics' | 'diagnostics' | 'help_request';
  report?: DiagnosticReport;
  osArch?: string;
  optionalAppsSelected: ComponentId[];
  studentNote?: string;
}): Promise<TelemetryResponse> {
  if (!isTauriRuntime()) {
    await new Promise((r) => setTimeout(r, 450));
    return {
      ok: true,
      email: params.user.email,
      roster_status: 'Enrolled (2026) [Preview]',
    };
  }
  return invoke<TelemetryResponse>('upload_telemetry', {
    payload: {
      endpoint: params.endpoint,
      id_token: params.user.id_token,
      event_type: params.eventType,
      hub_version: '0.1.2',
      overall_status: params.report?.overall_status ?? (params.eventType === 'sign_in' ? 'SIGNED_IN' : ''),
      os_arch: params.report?.os_arch ?? params.osArch ?? '',
      checks: params.report?.checks ?? [],
      optional_apps_selected: params.optionalAppsSelected,
      student_note: params.studentNote ?? '',
      raw_logs: params.report?.raw_logs ?? '',
    },
  });
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isTauriRuntime()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await openUrl(url);
}

export async function createGitbookShortcut(url: string): Promise<string> {
  if (!isTauriRuntime()) {
    return 'Desktop/BCI_Workshop_2026_GitBook.url (preview)';
  }
  return invoke<string>('create_gitbook_shortcut', { url });
}

export async function syncCourseMaterials(repoUrl: string): Promise<string> {
  if (!isTauriRuntime()) {
    await new Promise((r) => setTimeout(r, 600));
    return 'Synced Student_Facing into C:\\BCI_Workshop_2026\\Materials (preview)';
  }
  return invoke<string>('sync_course_materials', { repoUrl });
}

export async function launchApp(id: ComponentId): Promise<string> {
  if (!isTauriRuntime()) {
    return `Launched ${id} (preview)`;
  }
  return invoke<string>('launch_app', { id });
}

export async function findArduinoPorts(): Promise<SerialDeviceInfo[]> {
  if (!isTauriRuntime()) {
    await new Promise((r) => setTimeout(r, 450));
    return [
      {
        port: 'COM9',
        description: 'USB-SERIAL CH340 (COM9)',
        vid: '1A86',
        pid: '7523',
        is_ch340: true,
        is_ftdi: false,
        port_busy: false,
      },
    ];
  }
  return invoke<SerialDeviceInfo[]>('find_arduino_ports');
}
