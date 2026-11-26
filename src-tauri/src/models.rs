use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformArtifact {
    pub url: String,
    #[serde(default)]
    pub sha256: String,
    #[serde(default)]
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentManifestEntry {
    pub version: String,
    pub approx_size_mb: u64,
    pub windows: Option<PlatformArtifact>,
    pub macos_arm64: Option<PlatformArtifact>,
    pub macos_x64: Option<PlatformArtifact>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestUrls {
    pub gitbook: String,
    pub student_repo: String,
    pub telemetry_endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestNotice {
    pub enabled: bool,
    pub severity: String,
    pub he: String,
    pub en: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestPython {
    pub target_version: String,
    pub min_version: String,
    pub max_exclusive_version: String,
    pub core_packages: Vec<String>,
    pub jupyter_packages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestArduino {
    pub cores: Vec<String>,
    pub libraries: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub manifest_version: String,
    pub workshop_year: u32,
    pub urls: ManifestUrls,
    pub oauth_client_id: String,
    pub notice: ManifestNotice,
    pub python: ManifestPython,
    pub arduino: ManifestArduino,
    pub components: HashMap<String, ComponentManifestEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub email: String,
    pub name: String,
    pub id_token: String,
    pub picture: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemGuardrails {
    pub os_name: String,
    pub os_version: String,
    pub arch: String,
    pub workshop_root: String,
    pub home_dir: String,
    pub home_is_ascii: bool,
    pub root_is_ascii: bool,
    pub free_disk_gb: f64,
    pub disk_ok: bool,
    pub internet_ok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentScanStatus {
    pub id: String,
    pub installed: bool,
    pub detected_version: Option<String>,
    pub detected_path: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallActionResult {
    pub id: String,
    pub status: String,
    pub message: String,
    pub manual_action_type: Option<String>,
    pub manual_url: Option<String>,
    pub detail_log: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProgressEvent {
    pub component_id: String,
    pub stage: String,
    pub percent: u8,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticCheckResult {
    pub id: String,
    pub status: String,
    pub summary: String,
    pub details: String,
    pub remediation_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReport {
    pub timestamp: String,
    pub os_arch: String,
    pub hub_version: String,
    pub overall_status: String,
    pub checks: Vec<DiagnosticCheckResult>,
    pub raw_logs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialDeviceInfo {
    pub port: String,
    pub description: String,
    pub vid: Option<String>,
    pub pid: Option<String>,
    pub is_ch340: bool,
    pub is_ftdi: bool,
    pub port_busy: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryPayload {
    pub endpoint: String,
    pub id_token: String,
    pub event_type: String,
    pub hub_version: String,
    pub overall_status: String,
    pub os_arch: String,
    pub checks: Vec<DiagnosticCheckResult>,
    pub optional_apps_selected: Vec<String>,
    pub student_note: String,
    pub raw_logs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryResponse {
    pub ok: bool,
    pub email: Option<String>,
    pub roster_status: Option<String>,
    pub log_url: Option<String>,
    pub error: Option<String>,
}
