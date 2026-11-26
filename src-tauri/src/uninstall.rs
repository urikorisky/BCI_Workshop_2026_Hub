use crate::models::{
    ComponentScanStatus, UninstallExecutionResult, UninstallItem, UninstallPlan,
};
use crate::scanner::{
    detect_antigravity_path, detect_arduino_ide_path, detect_github_desktop_path,
    detect_lab_recorder_path, detect_openbci_gui_path, detect_thonny_path,
};
use crate::system::{default_workshop_root, workshop_tools_dir};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const LEDGER_FILENAME: &str = "hub_install_ledger.json";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct InstallLedger {
    baseline_recorded_at: String,
    preexisting_ids: Vec<String>,
    installed_by_hub: Vec<String>,
}

fn ledger_path() -> PathBuf {
    default_workshop_root().join(LEDGER_FILENAME)
}

fn read_ledger() -> Option<InstallLedger> {
    let path = ledger_path();
    if !path.is_file() {
        return None;
    }
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str::<InstallLedger>(&raw).ok()
}

fn write_ledger(ledger: &InstallLedger) -> Result<(), String> {
    let root = default_workshop_root();
    std::fs::create_dir_all(&root).map_err(|e| format!("Failed creating workshop root: {e}"))?;
    let json = serde_json::to_string_pretty(ledger).map_err(|e| e.to_string())?;
    std::fs::write(ledger_path(), json).map_err(|e| format!("Failed writing install ledger: {e}"))
}

/// Records which components already existed on the machine the very first time the Hub runs.
/// Once written, `preexisting_ids` is never overwritten so pre-existing apps stay protected.
pub fn ensure_baseline_ledger(scans: &[ComponentScanStatus]) {
    if read_ledger().is_some() {
        return;
    }

    let mut preexisting = Vec::new();
    for item in scans {
        if item.installed && item.id != "python_env" && item.id != "jupyterlab" {
            if !preexisting.contains(&item.id) {
                preexisting.push(item.id.clone());
            }
        }
    }

    let ledger = InstallLedger {
        baseline_recorded_at: chrono::Utc::now().to_rfc3339(),
        preexisting_ids: preexisting,
        installed_by_hub: Vec::new(),
    };
    let _ = write_ledger(&ledger);
}

/// Marks a component as installed by the Hub unless it already existed before first launch.
pub fn record_component_installed(id: &str) {
    let mut ledger = read_ledger().unwrap_or_else(|| InstallLedger {
        baseline_recorded_at: chrono::Utc::now().to_rfc3339(),
        preexisting_ids: Vec::new(),
        installed_by_hub: Vec::new(),
    });

    if ledger.preexisting_ids.iter().any(|p| p == id) {
        return;
    }
    if !ledger.installed_by_hub.iter().any(|i| i == id) {
        ledger.installed_by_hub.push(id.to_string());
        let _ = write_ledger(&ledger);
    }
}

#[tauri::command]
pub async fn record_hub_installed(id: String) -> Result<(), String> {
    record_component_installed(&id);
    Ok(())
}

fn dir_size_bytes(path: &Path) -> u64 {
    let Ok(meta) = std::fs::symlink_metadata(path) else {
        return 0;
    };
    if meta.file_type().is_symlink() {
        return 0;
    }
    if meta.is_file() {
        return meta.len();
    }
    if !meta.is_dir() {
        return 0;
    }
    let Ok(entries) = std::fs::read_dir(path) else {
        return 0;
    };
    let mut total = 0u64;
    for entry in entries.flatten() {
        let Ok(ft) = entry.file_type() else {
            continue;
        };
        if ft.is_symlink() {
            continue;
        }
        if ft.is_file() {
            total += entry.metadata().map(|m| m.len()).unwrap_or(0);
        } else if ft.is_dir() {
            total += dir_size_bytes(&entry.path());
        }
    }
    total
}

fn bytes_to_mb(bytes: u64) -> Option<f64> {
    if bytes == 0 {
        return None;
    }
    Some(((bytes as f64) / (1024.0 * 1024.0) * 10.0).round() / 10.0)
}

fn desktop_shortcut_paths() -> Vec<PathBuf> {
    let Some(desktop) = dirs::desktop_dir() else {
        return Vec::new();
    };
    let candidates = [
        "BCI_Workshop_2026_Website.url",
        "BCI_Workshop_2026_Website.webloc",
        "BCI_Workshop_2026_GitBook.url",
        "BCI_Workshop_2026_GitBook.webloc",
    ];
    candidates
        .iter()
        .map(|name| desktop.join(name))
        .filter(|p| p.is_file())
        .collect()
}

fn friendly_component_name(id: &str) -> &'static str {
    match id {
        "arduino_ide" => "Arduino IDE",
        "thonny" => "Thonny IDE",
        "openbci_gui" => "OpenBCI GUI",
        "lab_recorder" => "LabRecorder",
        "antigravity" => "Antigravity",
        "github_desktop" => "GitHub Desktop",
        "drivers" => "CH340 / FTDI Drivers",
        _ => "System Tool",
    }
}

fn is_hub_installed(ledger: &InstallLedger, id: &str) -> bool {
    ledger.installed_by_hub.iter().any(|x| x == id)
        && !ledger.preexisting_ids.iter().any(|x| x == id)
}

#[tauri::command]
pub async fn get_uninstall_plan() -> Result<UninstallPlan, String> {
    let root = default_workshop_root();
    let tools = workshop_tools_dir();
    let ledger = read_ledger().unwrap_or_default();
    let mut items = Vec::new();

    // Category A: Hub-managed files & folders inside BCI_Workshop_2026 / Desktop shortcuts.
    let py_paths = [
        root.join(".venv"),
        root.join("uv-python"),
        root.join("uv-cache"),
        tools.join("uv"),
    ];
    let py_bytes: u64 = py_paths.iter().map(|p| dir_size_bytes(p)).sum();
    if py_paths.iter().any(|p| p.exists()) {
        items.push(UninstallItem {
            id: "python_env".to_string(),
            category: "workshop_data".to_string(),
            label_he: "סביבת Python ו-JupyterLab של הסדנה (.venv + uv)".to_string(),
            label_en: "Workshop Python & JupyterLab environment (.venv + uv)".to_string(),
            path_display: root.join(".venv").to_string_lossy().to_string(),
            size_mb: bytes_to_mb(py_bytes),
            default_checked: true,
            requires_external_uninstaller: false,
        });
    }

    let arduino_paths = [
        tools.join("arduino-cli"),
        root.join("arduino-data"),
        root.join("diag_sketch"),
    ];
    let arduino_bytes: u64 = arduino_paths.iter().map(|p| dir_size_bytes(p)).sum();
    if arduino_paths.iter().any(|p| p.exists()) {
        items.push(UninstallItem {
            id: "arduino_data".to_string(),
            category: "workshop_data".to_string(),
            label_he: "ליבות וספריות Arduino שהורדו לסדנה (arduino-cli)".to_string(),
            label_en: "Workshop Arduino cores & libraries (arduino-cli)".to_string(),
            path_display: root.join("arduino-data").to_string_lossy().to_string(),
            size_mb: bytes_to_mb(arduino_bytes),
            default_checked: true,
            requires_external_uninstaller: false,
        });
    }

    let openbci_portable = tools.join("OpenBCI_GUI");
    if openbci_portable.exists() {
        items.push(UninstallItem {
            id: "openbci_gui_portable".to_string(),
            category: "workshop_data".to_string(),
            label_he: "OpenBCI GUI (עותק מקומי בתיקיית הסדנה)".to_string(),
            label_en: "OpenBCI GUI (workshop portable folder)".to_string(),
            path_display: openbci_portable.to_string_lossy().to_string(),
            size_mb: bytes_to_mb(dir_size_bytes(&openbci_portable)),
            default_checked: true,
            requires_external_uninstaller: false,
        });
    }

    let lab_portable = tools.join("LabRecorder");
    if lab_portable.exists() {
        items.push(UninstallItem {
            id: "lab_recorder_portable".to_string(),
            category: "workshop_data".to_string(),
            label_he: "LSL LabRecorder (עותק מקומי בתיקיית הסדנה)".to_string(),
            label_en: "LSL LabRecorder (workshop portable folder)".to_string(),
            path_display: lab_portable.to_string_lossy().to_string(),
            size_mb: bytes_to_mb(dir_size_bytes(&lab_portable)),
            default_checked: true,
            requires_external_uninstaller: false,
        });
    }

    let dl_dir = root.join("downloads");
    if dl_dir.exists() {
        items.push(UninstallItem {
            id: "downloads_cache".to_string(),
            category: "workshop_data".to_string(),
            label_he: "קובצי התקנה זמניים שהורדו (downloads)".to_string(),
            label_en: "Downloaded installer cache (downloads)".to_string(),
            path_display: dl_dir.to_string_lossy().to_string(),
            size_mb: bytes_to_mb(dir_size_bytes(&dl_dir)),
            default_checked: true,
            requires_external_uninstaller: false,
        });
    }

    let shortcuts = desktop_shortcut_paths();
    if !shortcuts.is_empty() {
        items.push(UninstallItem {
            id: "desktop_shortcut".to_string(),
            category: "workshop_data".to_string(),
            label_he: "קיצור הדרך לאתר הקורס על שולחן העבודה".to_string(),
            label_en: "Course website shortcut on Desktop".to_string(),
            path_display: shortcuts[0].to_string_lossy().to_string(),
            size_mb: None,
            default_checked: true,
            requires_external_uninstaller: false,
        });
    }

    let materials_dir = root.join("Materials");
    if materials_dir.exists() {
        items.push(UninstallItem {
            id: "materials".to_string(),
            category: "workshop_data".to_string(),
            label_he: "תיקיית החומרים והקוד המסונכרנת (Materials) — שמור אם יצרת קבצים".to_string(),
            label_en: "Synced course materials folder (Materials) — keep if you edited files"
                .to_string(),
            path_display: materials_dir.to_string_lossy().to_string(),
            size_mb: bytes_to_mb(dir_size_bytes(&materials_dir)),
            default_checked: false,
            requires_external_uninstaller: false,
        });
    }

    // Category B: Standalone apps ONLY if installed via the Hub and NOT pre-existing before Hub launch.
    let app_checks: Vec<(&str, &str, &str, Option<String>)> = vec![
        (
            "arduino_ide",
            "Arduino IDE 2.x",
            "Arduino IDE 2.x",
            detect_arduino_ide_path(),
        ),
        ("thonny", "Thonny IDE", "Thonny IDE", detect_thonny_path()),
        (
            "antigravity",
            "Antigravity",
            "Antigravity",
            detect_antigravity_path(),
        ),
        (
            "github_desktop",
            "GitHub Desktop",
            "GitHub Desktop",
            detect_github_desktop_path(),
        ),
    ];

    for (id, label_he, label_en, path_opt) in app_checks {
        if is_hub_installed(&ledger, id) {
            if let Some(detected) = path_opt {
                items.push(UninstallItem {
                    id: id.to_string(),
                    category: "hub_installed_app".to_string(),
                    label_he: format!("{label_he} (הותקן דרך ה-Hub)"),
                    label_en: format!("{label_en} (installed via Hub)"),
                    path_display: detected,
                    size_mb: None,
                    default_checked: false,
                    requires_external_uninstaller: cfg!(target_os = "windows"),
                });
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if is_hub_installed(&ledger, "openbci_gui") {
            let p = PathBuf::from("/Applications/OpenBCI_GUI.app");
            if p.exists() {
                items.push(UninstallItem {
                    id: "openbci_gui_app".to_string(),
                    category: "hub_installed_app".to_string(),
                    label_he: "OpenBCI GUI בתיקיית Applications".to_string(),
                    label_en: "OpenBCI GUI in Applications".to_string(),
                    path_display: p.to_string_lossy().to_string(),
                    size_mb: bytes_to_mb(dir_size_bytes(&p)),
                    default_checked: false,
                    requires_external_uninstaller: false,
                });
            }
        }
        if is_hub_installed(&ledger, "lab_recorder") {
            let p = PathBuf::from("/Applications/LabRecorder.app");
            if p.exists() {
                items.push(UninstallItem {
                    id: "lab_recorder_app".to_string(),
                    category: "hub_installed_app".to_string(),
                    label_he: "LabRecorder בתיקיית Applications".to_string(),
                    label_en: "LabRecorder in Applications".to_string(),
                    path_display: p.to_string_lossy().to_string(),
                    size_mb: bytes_to_mb(dir_size_bytes(&p)),
                    default_checked: false,
                    requires_external_uninstaller: false,
                });
            }
        }
    }

    let preexisting_protected = ledger
        .preexisting_ids
        .iter()
        .map(|id| friendly_component_name(id).to_string())
        .collect();

    Ok(UninstallPlan {
        workshop_root: root.to_string_lossy().to_string(),
        items,
        preexisting_protected,
    })
}

fn remove_path_if_exists(path: &Path, removed: &mut Vec<String>, errors: &mut Vec<String>) {
    if !path.exists() {
        return;
    }
    let res = if path.is_dir() {
        std::fs::remove_dir_all(path)
    } else {
        std::fs::remove_file(path)
    };
    match res {
        Ok(_) => removed.push(path.to_string_lossy().to_string()),
        Err(e) => errors.push(format!("{}: {e}", path.display())),
    }
}

#[cfg(target_os = "windows")]
fn launch_windows_uninstaller(display_name_regex: &str, delay_secs: u64) -> Result<(), String> {
    let delay_prefix = if delay_secs > 0 {
        format!("Start-Sleep -Seconds {delay_secs}; ")
    } else {
        String::new()
    };
    let escaped_regex = display_name_regex.replace('\'', "''");
    let ps = format!(
        "{delay_prefix}\
$paths = @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'); \
$entry = Get-ItemProperty $paths -ErrorAction SilentlyContinue | Where-Object {{ $_.DisplayName -match '{escaped_regex}' }} | Select-Object -First 1; \
if ($entry -and $entry.UninstallString) {{ \
  $u = $entry.UninstallString.Trim(); \
  if ($u -match '(?i)msiexec(?:\\.exe)?\\s*(.*)') {{ \
    $a = ($matches[1] -replace '(?i)/I\\s*\\{{', '/X{{').Trim(); \
    if ([string]::IsNullOrWhiteSpace($a) -and $entry.PSChildName -match '^\\{{') {{ $a = \"/X$($entry.PSChildName)\" }}; \
    Start-Process -FilePath 'msiexec.exe' -ArgumentList $a \
  }} elseif ($u -match '^\"([^\"]+)\"\\s*(.*)$') {{ \
    $exe = $matches[1]; $rest = $matches[2].Trim(); \
    if ($rest) {{ Start-Process -FilePath $exe -ArgumentList $rest }} else {{ Start-Process -FilePath $exe }} \
  }} else {{ \
    $parts = $u -split '\\s+', 2; \
    if ($parts.Length -gt 1) {{ Start-Process -FilePath $parts[0] -ArgumentList $parts[1] }} else {{ Start-Process -FilePath $parts[0] }} \
  }} \
}} else {{ \
  Start-Process 'ms-settings:appsfeatures' \
}}"
    );

    Command::new("powershell")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed starting Windows uninstaller: {e}"))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn trash_macos_app(app_path: &Path) -> Result<(), String> {
    let escaped = app_path
        .to_string_lossy()
        .replace('\\', "\\\\")
        .replace('"', "\\\"");
    let script = format!("tell application \"Finder\" to delete POSIX file \"{escaped}\"");
    match crate::scanner::run_silent_command("osascript", &["-e", &script]) {
        Some((true, _, _)) => Ok(()),
        Some((false, _, err)) => Err(format!(
            "Failed moving {} to Trash: {err}",
            app_path.display()
        )),
        None => Err("Failed invoking osascript".to_string()),
    }
}

#[cfg(target_os = "macos")]
fn schedule_macos_self_trash() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let bundle = exe
        .ancestors()
        .find(|p| {
            p.extension().and_then(|e| e.to_str()) == Some("app")
                && p.file_name()
                    .and_then(|n| n.to_str())
                    .map(|s| s.to_lowercase().contains("bci workshop hub"))
                    .unwrap_or(false)
        })
        .ok_or_else(|| "Could not locate BCI Workshop Hub.app bundle".to_string())?;
    let bundle_str = bundle.to_string_lossy().to_string();
    Command::new("sh")
        .args([
            "-c",
            "sleep 1; osascript -e 'on run argv' -e 'tell application \"Finder\" to delete POSIX file (item 1 of argv)' -e 'end run' \"$1\"",
            "_",
            &bundle_str,
        ])
        .spawn()
        .map_err(|e| format!("Failed scheduling macOS bundle removal: {e}"))?;
    Ok(())
}

fn uninstall_standalone_app(
    ledger: &InstallLedger,
    ledger_id: &str,
    display_name: &str,
    _win_regex: &str,
    detected_path: Option<String>,
    removed: &mut Vec<String>,
    launched: &mut Vec<String>,
    errors: &mut Vec<String>,
) {
    if !is_hub_installed(ledger, ledger_id) {
        errors.push(format!(
            "{display_name}: skipped because it existed before the Hub was installed."
        ));
        return;
    }

    #[cfg(target_os = "windows")]
    {
        let _ = (detected_path, removed);
        match launch_windows_uninstaller(_win_regex, 0) {
            Ok(_) => launched.push(display_name.to_string()),
            Err(e) => errors.push(format!("{display_name}: {e}")),
        }
    }

    #[cfg(target_os = "macos")]
    {
        let _ = launched;
        if let Some(p) = detected_path {
            let pb = PathBuf::from(&p);
            match trash_macos_app(&pb) {
                Ok(_) => removed.push(p),
                Err(e) => errors.push(e),
            }
        }
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = (detected_path, removed, launched, errors);
    }
}

#[tauri::command]
pub async fn execute_uninstall(
    app: tauri::AppHandle,
    selected_item_ids: Vec<String>,
    uninstall_hub_self: bool,
) -> Result<UninstallExecutionResult, String> {
    let root = default_workshop_root();
    let tools = workshop_tools_dir();
    let ledger = read_ledger().unwrap_or_default();

    let mut removed = Vec::new();
    let mut launched_uninstallers = Vec::new();
    let mut errors = Vec::new();

    for id in &selected_item_ids {
        match id.as_str() {
            "python_env" => {
                for p in [
                    root.join(".venv"),
                    root.join("uv-python"),
                    root.join("uv-cache"),
                    tools.join("uv"),
                ] {
                    remove_path_if_exists(&p, &mut removed, &mut errors);
                }
            }
            "arduino_data" => {
                for p in [
                    tools.join("arduino-cli"),
                    root.join("arduino-data"),
                    root.join("diag_sketch"),
                ] {
                    remove_path_if_exists(&p, &mut removed, &mut errors);
                }
            }
            "openbci_gui_portable" => {
                remove_path_if_exists(&tools.join("OpenBCI_GUI"), &mut removed, &mut errors);
            }
            "lab_recorder_portable" => {
                remove_path_if_exists(&tools.join("LabRecorder"), &mut removed, &mut errors);
            }
            "downloads_cache" => {
                remove_path_if_exists(&root.join("downloads"), &mut removed, &mut errors);
            }
            "desktop_shortcut" => {
                for p in desktop_shortcut_paths() {
                    remove_path_if_exists(&p, &mut removed, &mut errors);
                }
            }
            "materials" => {
                remove_path_if_exists(&root.join("Materials"), &mut removed, &mut errors);
            }
            "arduino_ide" => uninstall_standalone_app(
                &ledger,
                "arduino_ide",
                "Arduino IDE",
                "^Arduino IDE",
                detect_arduino_ide_path(),
                &mut removed,
                &mut launched_uninstallers,
                &mut errors,
            ),
            "thonny" => uninstall_standalone_app(
                &ledger,
                "thonny",
                "Thonny IDE",
                "^Thonny",
                detect_thonny_path(),
                &mut removed,
                &mut launched_uninstallers,
                &mut errors,
            ),
            "antigravity" => uninstall_standalone_app(
                &ledger,
                "antigravity",
                "Antigravity",
                "Antigravity",
                detect_antigravity_path(),
                &mut removed,
                &mut launched_uninstallers,
                &mut errors,
            ),
            "github_desktop" => uninstall_standalone_app(
                &ledger,
                "github_desktop",
                "GitHub Desktop",
                "^GitHub Desktop",
                detect_github_desktop_path(),
                &mut removed,
                &mut launched_uninstallers,
                &mut errors,
            ),
            #[cfg(target_os = "macos")]
            "openbci_gui_app" => uninstall_standalone_app(
                &ledger,
                "openbci_gui",
                "OpenBCI GUI",
                "",
                Some("/Applications/OpenBCI_GUI.app".to_string())
                    .filter(|p| Path::new(p).exists()),
                &mut removed,
                &mut launched_uninstallers,
                &mut errors,
            ),
            #[cfg(target_os = "macos")]
            "lab_recorder_app" => uninstall_standalone_app(
                &ledger,
                "lab_recorder",
                "LabRecorder",
                "",
                Some("/Applications/LabRecorder.app".to_string())
                    .filter(|p| Path::new(p).exists()),
                &mut removed,
                &mut launched_uninstallers,
                &mut errors,
            ),
            _ => {}
        }
    }

    // Remove empty tools/ and clean up ledger + workshop root if no user files remain.
    if tools.is_dir() {
        let is_empty = std::fs::read_dir(&tools)
            .map(|mut d| d.next().is_none())
            .unwrap_or(false);
        if is_empty {
            let _ = std::fs::remove_dir(&tools);
        }
    }
    if uninstall_hub_self && root.is_dir() {
        let lp = ledger_path();
        if lp.is_file() {
            let _ = std::fs::remove_file(&lp);
        }
        let is_empty = std::fs::read_dir(&root)
            .map(|mut d| d.next().is_none())
            .unwrap_or(false);
        if is_empty {
            let _ = std::fs::remove_dir(&root);
        }
    }

    let mut will_exit = false;
    if uninstall_hub_self {
        crate::auth::clear_auth_session_file();
        #[cfg(target_os = "windows")]
        {
            match launch_windows_uninstaller("^BCI Workshop Hub$", 1) {
                Ok(_) => {
                    launched_uninstallers.push("BCI Workshop Hub".to_string());
                    will_exit = true;
                }
                Err(e) => errors.push(format!("BCI Workshop Hub: {e}")),
            }
        }
        #[cfg(target_os = "macos")]
        {
            match schedule_macos_self_trash() {
                Ok(_) => {
                    removed.push("BCI Workshop Hub.app".to_string());
                    will_exit = true;
                }
                Err(e) => errors.push(format!("BCI Workshop Hub: {e}")),
            }
        }
    }

    if will_exit {
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(600)).await;
            app.exit(0);
        });
    }

    Ok(UninstallExecutionResult {
        removed,
        launched_uninstallers,
        errors,
        will_exit,
    })
}
