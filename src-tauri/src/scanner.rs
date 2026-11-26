use crate::models::ComponentScanStatus;
use crate::system::{workshop_arduino_cli, workshop_tools_dir, workshop_venv_python};
use std::path::PathBuf;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn run_silent_command(program: &str, args: &[&str]) -> Option<(bool, String, String)> {
    run_silent_command_with_env(program, args, &[])
}

pub fn run_silent_command_with_env(
    program: &str,
    args: &[&str],
    envs: &[(&str, &str)],
) -> Option<(bool, String, String)> {
    let mut cmd = Command::new(program);
    cmd.args(args);
    for (k, v) in envs {
        cmd.env(k, v);
    }
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let out = cmd.output().ok()?;
    Some((
        out.status.success(),
        String::from_utf8_lossy(&out.stdout).trim().to_string(),
        String::from_utf8_lossy(&out.stderr).trim().to_string(),
    ))
}

/// Finds an existing Python binary on the machine that is >=3.10, <3.13, and has working tkinter.
pub fn find_compatible_system_python() -> Option<(String, Vec<String>, String)> {
    #[cfg(target_os = "windows")]
    let candidates: Vec<(&str, Vec<&str>)> = vec![
        ("py", vec!["-3.11"]),
        ("py", vec!["-3.12"]),
        ("py", vec!["-3.10"]),
        ("python", vec![]),
        ("python3", vec![]),
    ];

    #[cfg(not(target_os = "windows"))]
    let candidates: Vec<(&str, Vec<&str>)> = vec![
        ("python3.11", vec![]),
        ("python3.12", vec![]),
        ("python3.10", vec![]),
        ("/opt/homebrew/bin/python3.11", vec![]),
        ("/opt/homebrew/bin/python3.12", vec![]),
        ("/usr/local/bin/python3.11", vec![]),
        ("/usr/local/bin/python3.12", vec![]),
        ("python3", vec![]),
    ];

    let probe = "import sys, tkinter; v=sys.version_info; print(f'{v.major}.{v.minor}.{v.micro}'); sys.exit(0 if (v.major==3 and 10<=v.minor<13) else 2)";

    for (prog, prefix_args) in candidates {
        let mut args: Vec<&str> = prefix_args.clone();
        args.push("-c");
        args.push(probe);
        if let Some((ok, stdout, _)) = run_silent_command(prog, &args) {
            if ok && !stdout.is_empty() {
                return Some((
                    prog.to_string(),
                    prefix_args.iter().map(|s| s.to_string()).collect(),
                    stdout,
                ));
            }
        }
    }
    None
}

/// Finds any installed system Python (even outside 3.10-3.12 or missing tkinter) for clear pre-scan reporting.
pub fn find_any_system_python() -> Option<(String, String)> {
    #[cfg(target_os = "windows")]
    let candidates: Vec<(&str, Vec<&str>)> = vec![
        ("py", vec!["-3"]),
        ("python", vec![]),
        ("python3", vec![]),
    ];

    #[cfg(not(target_os = "windows"))]
    let candidates: Vec<(&str, Vec<&str>)> = vec![
        ("python3", vec![]),
        ("/opt/homebrew/bin/python3", vec![]),
        ("/usr/local/bin/python3", vec![]),
        ("python", vec![]),
    ];

    let probe = "import sys; v=sys.version_info; print(f'{v.major}.{v.minor}.{v.micro}')";

    for (prog, prefix_args) in candidates {
        let mut args: Vec<&str> = prefix_args.clone();
        args.push("-c");
        args.push(probe);
        if let Some((ok, stdout, _)) = run_silent_command(prog, &args) {
            if ok && !stdout.is_empty() {
                return Some((prog.to_string(), stdout));
            }
        }
    }
    None
}

fn first_existing_path(paths: Vec<PathBuf>) -> Option<String> {
    for p in paths {
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

pub fn detect_arduino_ide_path() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let local_app = dirs::data_local_dir().unwrap_or_default();
        if let Some(found) = first_existing_path(vec![
            local_app.join("Programs").join("Arduino IDE").join("Arduino IDE.exe"),
            PathBuf::from(r"C:\Program Files\Arduino IDE\Arduino IDE.exe"),
            PathBuf::from(r"C:\Program Files (x86)\Arduino IDE\Arduino IDE.exe"),
            PathBuf::from(r"C:\Program Files (x86)\Arduino\arduino.exe"),
        ]) {
            return Some(found);
        }

        // Fallback: check Windows Uninstall Registry for custom install locations.
        let ps = "$p = Get-ItemProperty 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match 'Arduino IDE' } | Select-Object -First 1 -ExpandProperty UninstallString; if ($p) { $p }";
        if let Some((true, stdout, _)) = run_silent_command("powershell", &["-NoProfile", "-Command", ps]) {
            let trimmed = stdout.trim();
            if !trimmed.is_empty() {
                let exe_part = if let Some(rest) = trimmed.strip_prefix('"') {
                    rest.split('"').next().unwrap_or("")
                } else {
                    trimmed.split_whitespace().next().unwrap_or("")
                };
                if let Some(dir) = PathBuf::from(exe_part).parent() {
                    let candidate = dir.join("Arduino IDE.exe");
                    if candidate.exists() {
                        return Some(candidate.to_string_lossy().to_string());
                    }
                }
            }
        }
        None
    }
    #[cfg(target_os = "macos")]
    {
        first_existing_path(vec![
            PathBuf::from("/Applications/Arduino IDE.app"),
            dirs::home_dir().unwrap_or_default().join("Applications/Arduino IDE.app"),
        ])
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        None
    }
}

pub fn detect_thonny_path() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let local_app = dirs::data_local_dir().unwrap_or_default();
        first_existing_path(vec![
            local_app.join("Programs").join("Thonny").join("thonny.exe"),
            PathBuf::from(r"C:\Program Files (x86)\Thonny\thonny.exe"),
            PathBuf::from(r"C:\Program Files\Thonny\thonny.exe"),
        ])
    }
    #[cfg(target_os = "macos")]
    {
        first_existing_path(vec![
            PathBuf::from("/Applications/Thonny.app"),
            dirs::home_dir().unwrap_or_default().join("Applications/Thonny.app"),
        ])
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        None
    }
}

pub fn detect_openbci_gui_path() -> Option<String> {
    let tools = workshop_tools_dir().join("OpenBCI_GUI");
    #[cfg(target_os = "windows")]
    {
        first_existing_path(vec![
            tools.join("OpenBCI_GUI.exe"),
            PathBuf::from(r"C:\Program Files\OpenBCI_GUI\OpenBCI_GUI.exe"),
        ])
    }
    #[cfg(target_os = "macos")]
    {
        first_existing_path(vec![
            PathBuf::from("/Applications/OpenBCI_GUI.app"),
            tools.join("OpenBCI_GUI.app"),
        ])
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        None
    }
}

pub fn detect_lab_recorder_path() -> Option<String> {
    let tools = workshop_tools_dir().join("LabRecorder");
    #[cfg(target_os = "windows")]
    {
        first_existing_path(vec![
            tools.join("LabRecorder.exe"),
            tools.join("LabRecorder").join("LabRecorder.exe"),
        ])
    }
    #[cfg(target_os = "macos")]
    {
        first_existing_path(vec![
            PathBuf::from("/Applications/LabRecorder.app"),
            tools.join("LabRecorder.app"),
        ])
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        None
    }
}

pub fn detect_antigravity_path() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let local_app = dirs::data_local_dir().unwrap_or_default();
        first_existing_path(vec![
            local_app.join("Programs").join("Antigravity").join("Antigravity.exe"),
            local_app.join("Programs").join("Google Antigravity").join("Antigravity.exe"),
            PathBuf::from(r"C:\Program Files\Antigravity\Antigravity.exe"),
        ])
    }
    #[cfg(target_os = "macos")]
    {
        first_existing_path(vec![
            PathBuf::from("/Applications/Antigravity.app"),
            dirs::home_dir().unwrap_or_default().join("Applications/Antigravity.app"),
        ])
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        None
    }
}

pub fn detect_github_desktop_path() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let local_app = dirs::data_local_dir().unwrap_or_default();
        first_existing_path(vec![
            local_app.join("GitHubDesktop").join("GitHubDesktop.exe"),
        ])
    }
    #[cfg(target_os = "macos")]
    {
        first_existing_path(vec![
            PathBuf::from("/Applications/GitHub Desktop.app"),
            dirs::home_dir().unwrap_or_default().join("Applications/GitHub Desktop.app"),
        ])
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        None
    }
}

pub fn detect_drivers_status() -> (bool, String) {
    #[cfg(target_os = "windows")]
    {
        if let Some((ok, stdout, _)) = run_silent_command("pnputil", &["/enum-drivers"]) {
            if ok {
                let lower = stdout.to_lowercase();
                let has_ch340 = lower.contains("ch341") || lower.contains("ch340") || lower.contains("wch");
                let has_ftdi = lower.contains("ftdibus") || lower.contains("ftdi");
                let summary = format!("CH340={}, FTDI={}", has_ch340, has_ftdi);
                return (has_ch340, summary);
            }
        }
        (false, "Unable to query Windows driver store".to_string())
    }
    #[cfg(target_os = "macos")]
    {
        let apple_ch340 = PathBuf::from("/System/Library/DriverExtensions/com.apple.DriverKit-AppleUSBCHCOM.dext").exists()
            || PathBuf::from("/System/Library/Extensions/AppleUSBCHCOM.kext").exists();
        let wch_ch340 = PathBuf::from("/Library/Extensions/usbserial.kext").exists()
            || PathBuf::from("/Applications/WCHUSBDriver.app").exists();
        let ch340_ok = apple_ch340 || wch_ch340;
        (
            ch340_ok,
            format!("macOS USBCHCOM={}, WCH={}", apple_ch340, wch_ch340),
        )
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        (true, "Linux kernel includes ch341/ftdi_sio".to_string())
    }
}

#[tauri::command]
pub async fn scan_installed_components() -> Result<Vec<ComponentScanStatus>, String> {
    let mut results = Vec::new();

    // 1. python_env
    let venv_py = workshop_venv_python();
    let py_status = if venv_py.exists() {
        let ver = run_silent_command(&venv_py.to_string_lossy(), &["--version"])
            .map(|(_, o, _)| o)
            .unwrap_or_else(|| "Workshop .venv".to_string());
        ComponentScanStatus {
            id: "python_env".to_string(),
            installed: true,
            detected_version: Some(ver),
            detected_path: Some(venv_py.to_string_lossy().to_string()),
            notes: Some("venv_ready".to_string()),
        }
    } else if let Some((prog, _, ver)) = find_compatible_system_python() {
        ComponentScanStatus {
            id: "python_env".to_string(),
            installed: false,
            detected_version: Some(ver),
            detected_path: Some(prog),
            notes: Some("compatible_system_python".to_string()),
        }
    } else if let Some((prog, ver)) = find_any_system_python() {
        ComponentScanStatus {
            id: "python_env".to_string(),
            installed: false,
            detected_version: Some(ver),
            detected_path: Some(prog),
            notes: Some("incompatible_system_python".to_string()),
        }
    } else {
        ComponentScanStatus {
            id: "python_env".to_string(),
            installed: false,
            detected_version: None,
            detected_path: None,
            notes: Some("not_found".to_string()),
        }
    };
    results.push(py_status);

    // 2. jupyterlab
    let jlab_installed = if venv_py.exists() {
        run_silent_command(&venv_py.to_string_lossy(), &["-m", "jupyterlab", "--version"])
            .map(|(ok, _, _)| ok)
            .unwrap_or(false)
    } else {
        false
    };
    results.push(ComponentScanStatus {
        id: "jupyterlab".to_string(),
        installed: jlab_installed,
        detected_version: if jlab_installed { Some("In .venv".to_string()) } else { None },
        detected_path: if jlab_installed { Some(venv_py.to_string_lossy().to_string()) } else { None },
        notes: None,
    });

    // 3. thonny
    let thonny_path = detect_thonny_path();
    results.push(ComponentScanStatus {
        id: "thonny".to_string(),
        installed: thonny_path.is_some(),
        detected_version: thonny_path.as_ref().map(|_| "Installed".to_string()),
        detected_path: thonny_path,
        notes: None,
    });

    // 4. arduino_ide (+ arduino-cli)
    let arduino_path = detect_arduino_ide_path();
    let cli_ok = workshop_arduino_cli().exists();
    let arduino_notes = match (arduino_path.is_some(), cli_ok) {
        (true, true) => Some("ide_and_cli_ready".to_string()),
        (true, false) => Some("ide_only_missing_libs".to_string()),
        (false, _) => Some("not_found".to_string()),
    };
    results.push(ComponentScanStatus {
        id: "arduino_ide".to_string(),
        installed: arduino_path.is_some(),
        detected_version: if arduino_path.is_some() {
            Some(if cli_ok {
                "IDE + Libraries".to_string()
            } else {
                "IDE installed (libs pending)".to_string()
            })
        } else {
            None
        },
        detected_path: arduino_path,
        notes: arduino_notes,
    });

    // 5. drivers
    let (drv_ok, drv_notes) = detect_drivers_status();
    results.push(ComponentScanStatus {
        id: "drivers".to_string(),
        installed: drv_ok,
        detected_version: Some(drv_notes.clone()),
        detected_path: None,
        notes: Some(drv_notes),
    });

    // 6. openbci_gui
    let openbci_path = detect_openbci_gui_path();
    results.push(ComponentScanStatus {
        id: "openbci_gui".to_string(),
        installed: openbci_path.is_some(),
        detected_version: openbci_path.as_ref().map(|_| "Installed".to_string()),
        detected_path: openbci_path,
        notes: None,
    });

    // 7. lab_recorder
    let lab_rec_path = detect_lab_recorder_path();
    results.push(ComponentScanStatus {
        id: "lab_recorder".to_string(),
        installed: lab_rec_path.is_some(),
        detected_version: lab_rec_path.as_ref().map(|_| "Installed".to_string()),
        detected_path: lab_rec_path,
        notes: None,
    });

    // 8. antigravity
    let agy_path = detect_antigravity_path();
    results.push(ComponentScanStatus {
        id: "antigravity".to_string(),
        installed: agy_path.is_some(),
        detected_version: agy_path.as_ref().map(|_| "Installed".to_string()),
        detected_path: agy_path,
        notes: None,
    });

    // 9. github_desktop
    let gd_path = detect_github_desktop_path();
    results.push(ComponentScanStatus {
        id: "github_desktop".to_string(),
        installed: gd_path.is_some(),
        detected_version: gd_path.as_ref().map(|_| "Installed".to_string()),
        detected_path: gd_path,
        notes: None,
    });

    Ok(results)
}
