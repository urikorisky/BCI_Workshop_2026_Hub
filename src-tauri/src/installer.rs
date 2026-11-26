use crate::models::{
    HubUpdateInfo, InstallActionResult, InstallProgressEvent, Manifest, PlatformArtifact,
};
use crate::scanner::{
    detect_antigravity_path, detect_arduino_ide_path, detect_github_desktop_path,
    detect_lab_recorder_path, detect_openbci_gui_path, detect_thonny_path,
    find_compatible_system_python, run_silent_command, run_silent_command_with_env,
};
use crate::system::{
    default_workshop_root, workshop_arduino_cli, workshop_downloads_dir, workshop_tools_dir,
    workshop_uv_bin, workshop_uv_cache_dir, workshop_uv_python_dir, workshop_venv_dir,
    workshop_venv_python,
};
use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Emitter;

const BUNDLED_MANIFEST: &str = include_str!("../../manifest.json");
const REMOTE_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/urikorisky/BCI_Workshop_2026_Hub/main/manifest.json";
const HUB_RELEASES_API_URL: &str =
    "https://api.github.com/repos/urikorisky/BCI_Workshop_2026_Hub/releases/latest";
const HUB_RELEASES_WEB_URL: &str =
    "https://github.com/urikorisky/BCI_Workshop_2026_Hub/releases/latest";

fn emit_progress(app: &tauri::AppHandle, component_id: &str, stage: &str, percent: u8, msg: &str) {
    let _ = app.emit(
        "install-progress",
        InstallProgressEvent {
            component_id: component_id.to_string(),
            stage: stage.to_string(),
            percent,
            message: msg.to_string(),
        },
    );
}

#[tauri::command]
pub async fn fetch_manifest() -> Result<Manifest, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    if let Ok(resp) = client.get(REMOTE_MANIFEST_URL).send().await {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<Manifest>().await {
                return Ok(parsed);
            }
        }
    }

    serde_json::from_str::<Manifest>(BUNDLED_MANIFEST)
        .map_err(|e| format!("Failed parsing bundled manifest: {e}"))
}

fn select_artifact(manifest: &Manifest, key: &str) -> Option<PlatformArtifact> {
    let entry = manifest.components.get(key)?;
    #[cfg(target_os = "windows")]
    {
        entry.windows.clone()
    }
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        entry.macos_arm64.clone().or_else(|| entry.macos_x64.clone())
    }
    #[cfg(all(target_os = "macos", not(target_arch = "aarch64")))]
    {
        entry.macos_x64.clone().or_else(|| entry.macos_arm64.clone())
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        None
    }
}

async fn download_file_verified(
    app: &tauri::AppHandle,
    component_id: &str,
    url: &str,
    expected_sha256: &str,
    dest: &Path,
) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed creating dir: {e}"))?;
    }

    emit_progress(app, component_id, "download", 5, &format!("Downloading {url}..."));

    let resp = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {} while downloading {url}", resp.status()));
    }

    let total = resp.content_length().unwrap_or(0);
    let mut stream = resp.bytes_stream();
    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("Cannot create {}: {e}", dest.display()))?;
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;

    use tokio::io::AsyncWriteExt;
    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(|e| format!("Stream read error: {e}"))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Write error: {e}"))?;
        hasher.update(&chunk);
        downloaded += chunk.len() as u64;
        if total > 0 {
            let pct = ((downloaded * 75) / total).min(80) as u8;
            emit_progress(app, component_id, "download", pct, "Downloading...");
        }
    }
    file.flush().await.map_err(|e| format!("Flush error: {e}"))?;

    let actual = hex::encode(hasher.finalize());
    let expected = expected_sha256.trim().to_lowercase();
    if !expected.is_empty() && actual != expected {
        let _ = tokio::fs::remove_file(dest).await;
        return Err(format!("SHA-256 mismatch: expected {expected}, got {actual}"));
    }

    emit_progress(app, component_id, "download", 82, "Download verified.");
    Ok(())
}

fn extract_archive(archive: &Path, dest_dir: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dest_dir).map_err(|e| format!("Cannot create dir: {e}"))?;
    let archive_str = archive.to_string_lossy().to_string();
    let dest_str = dest_dir.to_string_lossy().to_string();

    // Windows 10/11 and macOS both ship bsdtar (`tar -xf`) supporting .zip and .tar.gz.
    if let Some((ok, _, stderr)) = run_silent_command("tar", &["-xf", &archive_str, "-C", &dest_str]) {
        if ok {
            return Ok(());
        }
        return Err(format!("Archive extraction failed: {stderr}"));
    }

    #[cfg(target_os = "windows")]
    {
        let ps = format!(
            "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
            archive_str.replace('\'', "''"),
            dest_str.replace('\'', "''")
        );
        if let Some((ok, _, stderr)) =
            run_silent_command("powershell", &["-NoProfile", "-Command", &ps])
        {
            if ok {
                return Ok(());
            }
            return Err(format!("Expand-Archive failed: {stderr}"));
        }
    }

    Err("No archive extraction tool available".to_string())
}

async fn ensure_uv(app: &tauri::AppHandle, manifest: &Manifest) -> Result<PathBuf, String> {
    let uv_bin = workshop_uv_bin();
    if uv_bin.is_file() {
        return Ok(uv_bin);
    }
    let artifact = select_artifact(manifest, "uv")
        .ok_or_else(|| "No uv artifact configured for this platform".to_string())?;
    let archive_name = if artifact.kind == "targz" { "uv.tar.gz" } else { "uv.zip" };
    let archive_path = workshop_downloads_dir().join(archive_name);
    download_file_verified(app, "python_env", &artifact.url, &artifact.sha256, &archive_path).await?;
    let uv_dir = workshop_tools_dir().join("uv");
    extract_archive(&archive_path, &uv_dir)?;
    let resolved = workshop_uv_bin();
    if resolved.is_file() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = std::fs::metadata(&resolved) {
                let mut perms = meta.permissions();
                if perms.mode() & 0o111 == 0 {
                    perms.set_mode(0o755);
                    let _ = std::fs::set_permissions(&resolved, perms);
                }
            }
        }
        return Ok(resolved);
    }
    Err(format!(
        "uv binary missing after archive extraction in {}",
        uv_dir.display()
    ))
}

fn find_extracted_uv_python(uv_py_dir: &Path, target_minor: &str) -> Option<PathBuf> {
    let prefix = format!("cpython-{target_minor}.");
    let entries = std::fs::read_dir(uv_py_dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with(&prefix) {
            continue;
        }
        let path = entry.path();
        #[cfg(target_os = "windows")]
        let candidate = path.join("python.exe");
        #[cfg(not(target_os = "windows"))]
        let candidate = path.join("bin").join("python3");
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

async fn install_python_env(
    app: &tauri::AppHandle,
    manifest: &Manifest,
) -> Result<InstallActionResult, String> {
    std::fs::create_dir_all(default_workshop_root()).map_err(|e| e.to_string())?;
    let uv_bin = ensure_uv(app, manifest).await?;
    let uv_str = uv_bin.to_string_lossy().to_string();
    let venv_dir = workshop_venv_dir();
    let venv_str = venv_dir.to_string_lossy().to_string();

    let uv_py_dir = workshop_uv_python_dir();
    let uv_cache_dir = workshop_uv_cache_dir();
    std::fs::create_dir_all(&uv_py_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&uv_cache_dir).map_err(|e| e.to_string())?;
    let uv_py_str = uv_py_dir.to_string_lossy().to_string();
    let uv_cache_str = uv_cache_dir.to_string_lossy().to_string();
    let uv_envs = [
        ("UV_PYTHON_INSTALL_DIR", uv_py_str.as_str()),
        ("UV_CACHE_DIR", uv_cache_str.as_str()),
        ("UV_LINK_MODE", "copy"),
    ];

    if !workshop_venv_python().exists() {
        if let Some((sys_prog, sys_args, ver)) = find_compatible_system_python() {
            emit_progress(
                app,
                "python_env",
                "venv",
                45,
                &format!("Reusing system Python {ver} to create isolated .venv..."),
            );
            let mut args: Vec<String> = sys_args;
            args.push("-m".to_string());
            args.push("venv".to_string());
            args.push(venv_str.clone());
            let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
            let (ok, _, err) = run_silent_command(&sys_prog, &arg_refs)
                .ok_or_else(|| "Failed invoking system Python".to_string())?;
            if !ok {
                return Err(format!("Failed creating .venv: {err}"));
            }
        } else {
            emit_progress(
                app,
                "python_env",
                "python",
                45,
                &format!(
                    "Installing isolated Python {} via uv...",
                    manifest.python.target_version
                ),
            );
            let mut extracted_py =
                find_extracted_uv_python(&uv_py_dir, &manifest.python.target_version);
            let mut install_err = String::new();

            if extracted_py.is_none() {
                let (ok_py, _, err_py) = run_silent_command_with_env(
                    &uv_str,
                    &[
                        "python",
                        "install",
                        &manifest.python.target_version,
                        "--no-bin",
                        "--no-registry",
                        "--install-dir",
                        &uv_py_str,
                    ],
                    &uv_envs,
                )
                .ok_or_else(|| "Failed running uv python install".to_string())?;
                install_err = err_py;
                // Re-check extracted binary even if uv complained creating minor-version link (Windows os error 448).
                extracted_py =
                    find_extracted_uv_python(&uv_py_dir, &manifest.python.target_version);
                if !ok_py && extracted_py.is_none() {
                    return Err(format!("uv python install failed: {install_err}"));
                }
            }

            let py_exe = extracted_py.ok_or_else(|| {
                format!("uv python binary missing after install ({install_err})")
            })?;
            let py_exe_str = py_exe.to_string_lossy().to_string();

            emit_progress(app, "python_env", "venv", 58, "Creating isolated .venv...");
            let (ok_v, _, err_v) =
                run_silent_command(&py_exe_str, &["-m", "venv", &venv_str])
                    .ok_or_else(|| "Failed invoking extracted Python for venv".to_string())?;
            if !ok_v {
                return Err(format!("Creating .venv failed: {err_v}"));
            }
        }
    }

    emit_progress(
        app,
        "python_env",
        "packages",
        70,
        "Installing Python packages (pyserial, numpy, scipy, PyQt6, sounddevice, pylsl, mne, brainflow)...",
    );

    let venv_py_str = workshop_venv_python().to_string_lossy().to_string();
    let mut pip_args: Vec<&str> = vec![
        "pip",
        "install",
        "--python",
        &venv_py_str,
        "--link-mode",
        "copy",
    ];
    for pkg in &manifest.python.core_packages {
        pip_args.push(pkg.as_str());
    }
    let (ok_pip, stdout_pip, err_pip) = run_silent_command_with_env(&uv_str, &pip_args, &uv_envs)
        .ok_or_else(|| "Failed running uv pip install".to_string())?;
    if !ok_pip {
        return Err(format!("Package installation failed: {err_pip}"));
    }

    emit_progress(app, "python_env", "done", 100, "Python environment ready.");
    Ok(InstallActionResult {
        id: "python_env".to_string(),
        status: "completed".to_string(),
        message: "Workshop Python environment and all packages installed.".to_string(),
        manual_action_type: None,
        manual_url: None,
        detail_log: Some(stdout_pip),
    })
}

async fn install_jupyterlab(
    app: &tauri::AppHandle,
    manifest: &Manifest,
) -> Result<InstallActionResult, String> {
    if !workshop_venv_python().exists() {
        install_python_env(app, manifest).await?;
    }
    let uv_bin = ensure_uv(app, manifest).await?;
    let uv_str = uv_bin.to_string_lossy().to_string();
    let venv_py_str = workshop_venv_python().to_string_lossy().to_string();

    let uv_py_dir = workshop_uv_python_dir();
    let uv_cache_dir = workshop_uv_cache_dir();
    let _ = std::fs::create_dir_all(&uv_py_dir);
    let _ = std::fs::create_dir_all(&uv_cache_dir);
    let uv_py_str = uv_py_dir.to_string_lossy().to_string();
    let uv_cache_str = uv_cache_dir.to_string_lossy().to_string();
    let uv_envs = [
        ("UV_PYTHON_INSTALL_DIR", uv_py_str.as_str()),
        ("UV_CACHE_DIR", uv_cache_str.as_str()),
        ("UV_LINK_MODE", "copy"),
    ];

    emit_progress(app, "jupyterlab", "packages", 50, "Installing JupyterLab + ipywidgets...");
    let mut args: Vec<&str> = vec![
        "pip",
        "install",
        "--python",
        &venv_py_str,
        "--link-mode",
        "copy",
    ];
    for pkg in &manifest.python.jupyter_packages {
        args.push(pkg.as_str());
    }
    let (ok, out, err) = run_silent_command_with_env(&uv_str, &args, &uv_envs)
        .ok_or_else(|| "Failed running uv pip install for JupyterLab".to_string())?;
    if !ok {
        return Err(format!("JupyterLab installation failed: {err}"));
    }
    emit_progress(app, "jupyterlab", "done", 100, "JupyterLab installed.");
    Ok(InstallActionResult {
        id: "jupyterlab".to_string(),
        status: "completed".to_string(),
        message: "JupyterLab and ipywidgets installed in workshop .venv.".to_string(),
        manual_action_type: None,
        manual_url: None,
        detail_log: Some(out),
    })
}

async fn install_arduino_stack(
    app: &tauri::AppHandle,
    manifest: &Manifest,
) -> Result<InstallActionResult, String> {
    let cli_bin = workshop_arduino_cli();
    if !cli_bin.exists() {
        let artifact = select_artifact(manifest, "arduino_cli")
            .ok_or_else(|| "Missing arduino_cli manifest entry".to_string())?;
        let name = if artifact.kind == "targz" {
            "arduino-cli.tar.gz"
        } else {
            "arduino-cli.zip"
        };
        let archive = workshop_downloads_dir().join(name);
        download_file_verified(app, "arduino_ide", &artifact.url, &artifact.sha256, &archive).await?;
        extract_archive(&archive, &workshop_tools_dir().join("arduino-cli"))?;
    }

    let cli_str = cli_bin.to_string_lossy().to_string();
    let data_dir = default_workshop_root().join("arduino-data");
    let dl_dir = data_dir.join("downloads");
    let user_dir = data_dir.join("user");
    std::fs::create_dir_all(&dl_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&user_dir).map_err(|e| e.to_string())?;
    let data_str = data_dir.to_string_lossy().to_string();
    let dl_str = dl_dir.to_string_lossy().to_string();
    let user_str = user_dir.to_string_lossy().to_string();
    let arduino_envs = [
        ("ARDUINO_DIRECTORIES_DATA", data_str.as_str()),
        ("ARDUINO_DIRECTORIES_DOWNLOADS", dl_str.as_str()),
        ("ARDUINO_DIRECTORIES_USER", user_str.as_str()),
    ];

    emit_progress(app, "arduino_ide", "cli", 55, "Installing arduino:avr board core...");
    let _ = run_silent_command_with_env(&cli_str, &["core", "update-index"], &arduino_envs);
    for core in &manifest.arduino.cores {
        let (ok, _, err) =
            run_silent_command_with_env(&cli_str, &["core", "install", core], &arduino_envs)
                .ok_or_else(|| "Failed invoking arduino-cli".to_string())?;
        if !ok {
            return Err(format!("Failed installing Arduino core {core}: {err}"));
        }
    }

    emit_progress(app, "arduino_ide", "libs", 75, "Installing Servo, AccelStepper, ADS1X15, NeoPixel...");
    let _ = run_silent_command_with_env(&cli_str, &["lib", "update-index"], &arduino_envs);
    for lib in &manifest.arduino.libraries {
        let (ok, _, err) =
            run_silent_command_with_env(&cli_str, &["lib", "install", lib], &arduino_envs)
                .ok_or_else(|| "Failed installing Arduino library".to_string())?;
        if !ok {
            return Err(format!("Failed installing Arduino library {lib}: {err}"));
        }
    }

    if detect_arduino_ide_path().is_some() {
        emit_progress(app, "arduino_ide", "done", 100, "Arduino IDE & libraries ready.");
        return Ok(InstallActionResult {
            id: "arduino_ide".to_string(),
            status: "completed".to_string(),
            message: "Arduino cores, libraries, and IDE verified.".to_string(),
            manual_action_type: None,
            manual_url: None,
            detail_log: None,
        });
    }

    let ide_artifact = select_artifact(manifest, "arduino_ide")
        .ok_or_else(|| "Missing arduino_ide manifest entry".to_string())?;
    let ext = match ide_artifact.kind.as_str() {
        "dmg" => "dmg",
        _ => "exe",
    };
    let installer_path = workshop_downloads_dir().join(format!("arduino-ide.{ext}"));
    download_file_verified(
        app,
        "arduino_ide",
        &ide_artifact.url,
        &ide_artifact.sha256,
        &installer_path,
    )
    .await?;

    open_local_installer(app, &installer_path)?;

    let action_type = if cfg!(target_os = "macos") {
        "macos_dmg_drag"
    } else {
        "windows_installer_wizard"
    };

    Ok(InstallActionResult {
        id: "arduino_ide".to_string(),
        status: "needs_manual_step".to_string(),
        message: "Arduino IDE installer opened; awaiting completion confirmation.".to_string(),
        manual_action_type: Some(action_type.to_string()),
        manual_url: Some(ide_artifact.url),
        detail_log: None,
    })
}

fn open_local_installer(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("Failed opening {}: {e}", path.display()))
}

async fn install_generic_component(
    app: &tauri::AppHandle,
    manifest: &Manifest,
    id: &str,
) -> Result<InstallActionResult, String> {
    use tauri_plugin_opener::OpenerExt;
    let manifest_key = if id == "drivers" { "ch340_driver" } else { id };
    let artifact = select_artifact(manifest, manifest_key)
        .ok_or_else(|| format!("No artifact configured for {id}"))?;

    if artifact.kind == "browser_page" {
        app.opener()
            .open_url(&artifact.url, None::<&str>)
            .map_err(|e| format!("Failed opening browser link: {e}"))?;
        let action_type = if id == "drivers" && cfg!(target_os = "windows") {
            "windows_uac_driver"
        } else {
            "browser_download_page"
        };
        return Ok(InstallActionResult {
            id: id.to_string(),
            status: "needs_manual_step".to_string(),
            message: "Opened official download page in browser.".to_string(),
            manual_action_type: Some(action_type.to_string()),
            manual_url: Some(artifact.url),
            detail_log: None,
        });
    }

    let ext = match artifact.kind.as_str() {
        "zip" => "zip",
        "targz" => "tar.gz",
        "dmg" => "dmg",
        "pkg" => "pkg",
        _ => "exe",
    };
    let dest = workshop_downloads_dir().join(format!("{id}.{ext}"));
    download_file_verified(app, id, &artifact.url, &artifact.sha256, &dest).await?;

    if artifact.kind == "zip" || artifact.kind == "targz" {
        let folder_name = match id {
            "openbci_gui" => "OpenBCI_GUI",
            "lab_recorder" => "LabRecorder",
            _ => id,
        };
        let target_dir = workshop_tools_dir().join(folder_name);
        extract_archive(&dest, &target_dir)?;
        emit_progress(app, id, "done", 100, "Extracted successfully.");
        return Ok(InstallActionResult {
            id: id.to_string(),
            status: "completed".to_string(),
            message: format!("Extracted {id} to {}", target_dir.display()),
            manual_action_type: None,
            manual_url: None,
            detail_log: None,
        });
    }

    open_local_installer(app, &dest)?;
    let manual_action_type = match artifact.kind.as_str() {
        "dmg" => "macos_dmg_drag",
        "pkg" => "macos_pkg_wizard",
        _ => "windows_installer_wizard",
    };
    Ok(InstallActionResult {
        id: id.to_string(),
        status: "needs_manual_step".to_string(),
        message: format!("Launched {id} installer."),
        manual_action_type: Some(manual_action_type.to_string()),
        manual_url: Some(artifact.url),
        detail_log: None,
    })
}

#[tauri::command]
pub async fn install_component(
    app: tauri::AppHandle,
    id: String,
    manifest: Manifest,
) -> Result<InstallActionResult, String> {
    let result = match id.as_str() {
        "python_env" => install_python_env(&app, &manifest).await,
        "jupyterlab" => install_jupyterlab(&app, &manifest).await,
        "arduino_ide" => install_arduino_stack(&app, &manifest).await,
        _ => install_generic_component(&app, &manifest, &id).await,
    };
    if let Ok(ref res) = result {
        if res.status == "completed" {
            crate::uninstall::record_component_installed(&id);
        }
    }
    result
}

#[tauri::command]
pub async fn create_gitbook_shortcut(url: String) -> Result<String, String> {
    let desktop = dirs::desktop_dir()
        .ok_or_else(|| "Could not locate Desktop directory".to_string())?;

    #[cfg(target_os = "windows")]
    {
        let shortcut = desktop.join("BCI_Workshop_2026_Website.url");
        let content = format!("[InternetShortcut]\r\nURL={url}\r\n");
        std::fs::write(&shortcut, content)
            .map_err(|e| format!("Failed writing desktop shortcut: {e}"))?;
        Ok(shortcut.to_string_lossy().to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let shortcut = desktop.join("BCI_Workshop_2026_Website.webloc");
        let content = format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\"><dict><key>URL</key><string>{url}</string></dict></plist>\n"
        );
        std::fs::write(&shortcut, content)
            .map_err(|e| format!("Failed writing desktop shortcut: {e}"))?;
        Ok(shortcut.to_string_lossy().to_string())
    }
}

#[tauri::command]
pub async fn sync_course_materials(repo_url: String) -> Result<String, String> {
    let materials_dir = default_workshop_root().join("Materials");
    let mat_str = materials_dir.to_string_lossy().to_string();
    std::fs::create_dir_all(default_workshop_root()).map_err(|e| e.to_string())?;

    if materials_dir.join(".git").exists() {
        let _ = run_silent_command("git", &["-C", &mat_str, "stash", "push", "-u", "-m", "hub-auto-preserve"]);
        let (ok, out, err) = run_silent_command("git", &["-C", &mat_str, "pull", "--rebase"])
            .ok_or_else(|| "Git pull failed".to_string())?;
        let _ = run_silent_command("git", &["-C", &mat_str, "stash", "pop"]);
        if ok {
            return Ok(format!("Updated {mat_str}: {out}"));
        }
        return Err(format!("Git pull failed: {err}"));
    }

    if let Some((ok, _, _)) = run_silent_command("git", &["--version"]) {
        if ok {
            let (clone_ok, _, err) = run_silent_command("git", &["clone", &repo_url, &mat_str])
                .ok_or_else(|| "Git clone failed".to_string())?;
            if clone_ok {
                return Ok(format!("Cloned Student_Facing into {mat_str}"));
            }
            return Err(format!("Git clone error: {err}"));
        }
    }

    Err("Git is not installed yet — download daily ZIPs directly from the course website or install GitHub Desktop.".to_string())
}

#[tauri::command]
pub async fn launch_app(app: tauri::AppHandle, id: String) -> Result<String, String> {
    use tauri_plugin_opener::OpenerExt;

    if id == "jupyterlab" {
        let py = workshop_venv_python();
        if !py.exists() {
            return Err("Workshop Python .venv not installed yet.".to_string());
        }
        let mut cmd = Command::new(&py);
        cmd.args(["-m", "jupyterlab"]);
        cmd.current_dir(default_workshop_root());
        cmd.spawn().map_err(|e| format!("Failed launching JupyterLab: {e}"))?;
        return Ok("Launched JupyterLab in your browser.".to_string());
    }

    let path_opt = match id.as_str() {
        "thonny" => detect_thonny_path(),
        "arduino_ide" => detect_arduino_ide_path(),
        "openbci_gui" => detect_openbci_gui_path(),
        "lab_recorder" => detect_lab_recorder_path(),
        "antigravity" => detect_antigravity_path(),
        "github_desktop" => detect_github_desktop_path(),
        _ => None,
    };

    let target = path_opt.ok_or_else(|| format!("{id} was not found on this machine."))?;
    app.opener()
        .open_path(&target, None::<&str>)
        .map_err(|e| format!("Failed launching {id}: {e}"))?;
    Ok(format!("Launched {id}."))
}

fn parse_semver_tuple(v: &str) -> Option<(u64, u64, u64)> {
    let trimmed = v.trim().trim_start_matches(|c| c == 'v' || c == 'V');
    let core = trimmed.split('-').next().unwrap_or(trimmed);
    let mut parts = core.split('.');
    let major = parts.next()?.parse::<u64>().ok()?;
    let minor = parts.next().unwrap_or("0").parse::<u64>().ok()?;
    let patch = parts.next().unwrap_or("0").parse::<u64>().ok()?;
    Some((major, minor, patch))
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    match (parse_semver_tuple(latest), parse_semver_tuple(current)) {
        (Some(l), Some(c)) => l > c,
        _ => false,
    }
}

fn select_hub_release_asset(assets: &[serde_json::Value]) -> Option<(String, String)> {
    #[cfg(target_os = "windows")]
    {
        let mut fallback_exe: Option<(String, String)> = None;
        for asset in assets {
            let name = asset["name"].as_str().unwrap_or("");
            let url = asset["browser_download_url"].as_str().unwrap_or("");
            if name.is_empty() || url.is_empty() {
                continue;
            }
            let lower = name.to_lowercase();
            if lower.ends_with(".msi") {
                return Some((name.to_string(), url.to_string()));
            }
            if lower.ends_with(".exe") && fallback_exe.is_none() {
                fallback_exe = Some((name.to_string(), url.to_string()));
            }
        }
        fallback_exe
    }
    #[cfg(target_os = "macos")]
    {
        let mut fallback_dmg: Option<(String, String)> = None;
        for asset in assets {
            let name = asset["name"].as_str().unwrap_or("");
            let url = asset["browser_download_url"].as_str().unwrap_or("");
            if name.is_empty() || url.is_empty() {
                continue;
            }
            let lower = name.to_lowercase();
            if lower.ends_with(".dmg") {
                if lower.contains("universal") {
                    return Some((name.to_string(), url.to_string()));
                }
                if fallback_dmg.is_none() {
                    fallback_dmg = Some((name.to_string(), url.to_string()));
                }
            }
        }
        fallback_dmg
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = assets;
        None
    }
}

#[tauri::command]
pub async fn check_hub_update() -> Result<HubUpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION").to_string();
    let mut fallback = HubUpdateInfo {
        current_version: current.clone(),
        latest_version: current.clone(),
        update_available: false,
        download_url: None,
        asset_name: None,
        release_url: HUB_RELEASES_WEB_URL.to_string(),
        published_at: None,
    };

    let Ok(client) = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent(format!("BCI-Workshop-Hub/{current}"))
        .build()
    else {
        return Ok(fallback);
    };

    // Tier 1: Live GitHub Releases API (exact asset URLs & release metadata).
    if let Ok(resp) = client
        .get(HUB_RELEASES_API_URL)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let tag = json["tag_name"].as_str().unwrap_or("").trim();
                if !tag.is_empty() {
                    let latest = tag.trim_start_matches(|c| c == 'v' || c == 'V').to_string();
                    let release_url = json["html_url"]
                        .as_str()
                        .unwrap_or(HUB_RELEASES_WEB_URL)
                        .to_string();
                    let published_at = json["published_at"].as_str().map(|s| s.to_string());
                    let matched = json["assets"]
                        .as_array()
                        .and_then(|arr| select_hub_release_asset(arr));
                    let (asset_name, download_url) = match matched {
                        Some((n, u)) => (Some(n), Some(u)),
                        None => (None, None),
                    };
                    let update_available =
                        is_newer_version(&latest, &current) && download_url.is_some();
                    return Ok(HubUpdateInfo {
                        current_version: current,
                        latest_version: latest,
                        update_available,
                        download_url,
                        asset_name,
                        release_url,
                        published_at,
                    });
                }
            }
        }
    }

    // Tier 2: Redirect fallback via web releases URL (bypasses GitHub API IP rate limits).
    if let Ok(resp) = client.get(HUB_RELEASES_WEB_URL).send().await {
        let final_url = resp.url().as_str().to_string();
        if let Some(tag) = final_url.split("/releases/tag/").nth(1) {
            let clean_tag = tag.split(&['?', '#'][..]).next().unwrap_or(tag).trim();
            let latest = clean_tag
                .trim_start_matches(|c| c == 'v' || c == 'V')
                .to_string();
            if !latest.is_empty() {
                fallback.latest_version = latest.clone();
                fallback.release_url = final_url.clone();
                if is_newer_version(&latest, &current) {
                    let candidate_name = if cfg!(target_os = "windows") {
                        Some(format!("BCI.Workshop.Hub_{latest}_x64_en-US.msi"))
                    } else if cfg!(target_os = "macos") {
                        Some(format!("BCI.Workshop.Hub_{latest}_universal.dmg"))
                    } else {
                        None
                    };
                    if let Some(name) = candidate_name {
                        let candidate_url = format!(
                            "https://github.com/urikorisky/BCI_Workshop_2026_Hub/releases/download/v{latest}/{name}"
                        );
                        if let Ok(head_resp) = client.head(&candidate_url).send().await {
                            if head_resp.status().is_success() {
                                fallback.update_available = true;
                                fallback.asset_name = Some(name);
                                fallback.download_url = Some(candidate_url);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(fallback)
}

#[tauri::command]
pub async fn download_and_open_hub_update(
    app: tauri::AppHandle,
    download_url: String,
    asset_name: String,
) -> Result<String, String> {
    if !download_url.starts_with("https://github.com/urikorisky/BCI_Workshop_2026_Hub/") {
        return Err("Refused update URL outside official repository.".to_string());
    }
    let safe_name = Path::new(&asset_name)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("BCI_Workshop_Hub_Update");
    let dest = workshop_downloads_dir().join(safe_name);
    download_file_verified(&app, "hub_update", &download_url, "", &dest).await?;
    open_local_installer(&app, &dest)?;
    Ok(dest.to_string_lossy().to_string())
}
