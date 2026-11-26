export type Language = 'he' | 'en';

export type AppScreen = 'sign_in' | 'onboarding' | 'diagnostics' | 'dashboard';

export type ComponentId =
  | 'python_env'
  | 'jupyterlab'
  | 'thonny'
  | 'arduino_ide'
  | 'drivers'
  | 'openbci_gui'
  | 'lab_recorder'
  | 'antigravity'
  | 'github_desktop';

export interface PlatformArtifact {
  url: string;
  sha256: string;
  kind: string;
}

export interface ComponentManifestEntry {
  version: string;
  approx_size_mb: number;
  windows?: PlatformArtifact;
  macos_arm64?: PlatformArtifact;
  macos_x64?: PlatformArtifact;
}

export interface Manifest {
  manifest_version: string;
  workshop_year: number;
  urls: {
    gitbook: string;
    student_repo: string;
    telemetry_endpoint: string;
  };
  oauth_client_id: string;
  notice: {
    enabled: boolean;
    severity: 'info' | 'warning' | 'urgent';
    he: string;
    en: string;
  };
  python: {
    target_version: string;
    min_version: string;
    max_exclusive_version: string;
    core_packages: string[];
    jupyter_packages: string[];
  };
  arduino: {
    cores: string[];
    libraries: string[];
  };
  components: Record<string, ComponentManifestEntry>;
}

export interface AuthUser {
  email: string;
  name: string;
  id_token: string;
  picture?: string;
  refresh_token?: string;
}

export interface SystemGuardrails {
  os_name: string;
  os_version: string;
  arch: string;
  workshop_root: string;
  home_dir: string;
  home_is_ascii: boolean;
  root_is_ascii: boolean;
  free_disk_gb: number;
  disk_ok: boolean;
  internet_ok: boolean;
}

export interface ComponentScanStatus {
  id: ComponentId;
  installed: boolean;
  detected_version?: string;
  detected_path?: string;
  notes?: string;
}

export interface InstallActionResult {
  id: ComponentId;
  status: 'completed' | 'needs_manual_step' | 'failed';
  message: string;
  manual_action_type?:
    | 'windows_uac_driver'
    | 'windows_installer_wizard'
    | 'macos_dmg_drag'
    | 'macos_pkg_wizard'
    | 'browser_download_page'
    | 'macos_system_extension';
  manual_url?: string;
  detail_log?: string;
}

export interface InstallProgressEvent {
  component_id: ComponentId;
  stage: string;
  percent: number;
  message: string;
}

export type DiagnosticStatus = 'pass' | 'warn' | 'fail' | 'skipped';

export interface DiagnosticCheckResult {
  id:
    | 'system_path'
    | 'arduino_compile'
    | 'drivers'
    | 'python_gui'
    | 'lsl_loopback'
    | 'brainflow_synthetic'
    | 'mic_audio'
    | 'optional_apps';
  status: DiagnosticStatus;
  summary: string;
  details: string;
  remediation_key?: string;
}

export interface DiagnosticReport {
  timestamp: string;
  os_arch: string;
  hub_version: string;
  overall_status: 'pass' | 'warn' | 'fail';
  checks: DiagnosticCheckResult[];
  raw_logs: string;
}

export interface SerialDeviceInfo {
  port: string;
  description: string;
  vid?: string;
  pid?: string;
  is_ch340: boolean;
  is_ftdi: boolean;
  port_busy: boolean;
}

export interface TelemetryResponse {
  ok: boolean;
  email?: string;
  roster_status?: string;
  log_url?: string;
  error?: string;
}

export interface PreActionModalPayload {
  componentId: ComponentId;
  actionType: NonNullable<InstallActionResult['manual_action_type']>;
  manualUrl?: string;
}

export interface HubUpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  download_url?: string;
  asset_name?: string;
  release_url: string;
  published_at?: string;
}

export interface UninstallItem {
  id: string;
  category: 'workshop_data' | 'hub_installed_app' | string;
  label_he: string;
  label_en: string;
  path_display: string;
  size_mb?: number;
  default_checked: boolean;
  requires_external_uninstaller: boolean;
}

export interface UninstallPlan {
  workshop_root: string;
  items: UninstallItem[];
  preexisting_protected: string[];
}

export interface UninstallExecutionResult {
  removed: string[];
  launched_uninstallers: string[];
  errors: string[];
  will_exit: boolean;
}
