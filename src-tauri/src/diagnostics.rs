use crate::models::{DiagnosticCheckResult, DiagnosticReport, SerialDeviceInfo};
use crate::scanner::{
    detect_antigravity_path, detect_arduino_ide_path, detect_drivers_status,
    detect_github_desktop_path, detect_lab_recorder_path, detect_openbci_gui_path,
    detect_thonny_path, run_silent_command, run_silent_command_with_env,
};
use crate::system::{
    default_workshop_root, free_disk_gb_for_path, is_ascii_str, workshop_arduino_cli,
    workshop_venv_python,
};

fn check_system_and_path() -> DiagnosticCheckResult {
    let root = default_workshop_root();
    let root_str = root.to_string_lossy().to_string();
    let free_gb = free_disk_gb_for_path(&root);
    let ascii_ok = is_ascii_str(&root_str);

    if !ascii_ok {
        DiagnosticCheckResult {
            id: "system_path".to_string(),
            status: "fail".to_string(),
            summary: format!("Non-ASCII install path: {root_str}"),
            details: "Workshop root contains non-ASCII characters.".to_string(),
            remediation_key: Some("non_ascii_path".to_string()),
        }
    } else if free_gb < 5.0 {
        DiagnosticCheckResult {
            id: "system_path".to_string(),
            status: "warn".to_string(),
            summary: format!("{root_str} (ASCII OK), {free_gb:.1} GB free (< 5 GB)"),
            details: "Low disk space may interrupt large tool installations.".to_string(),
            remediation_key: None,
        }
    } else {
        DiagnosticCheckResult {
            id: "system_path".to_string(),
            status: "pass".to_string(),
            summary: format!("{root_str} (ASCII OK), {free_gb:.1} GB free"),
            details: format!("OS: {} {}", std::env::consts::OS, std::env::consts::ARCH),
            remediation_key: None,
        }
    }
}

fn check_arduino_compile() -> DiagnosticCheckResult {
    let cli = workshop_arduino_cli();
    if !cli.exists() {
        return DiagnosticCheckResult {
            id: "arduino_compile".to_string(),
            status: "warn".to_string(),
            summary: "arduino-cli not installed yet".to_string(),
            details: "Install Arduino IDE & Libraries from Onboarding to run offline compile tests."
                .to_string(),
            remediation_key: Some("arduino_compile_fail".to_string()),
        };
    }

    let smoke_dir = default_workshop_root().join("diag_sketch");
    let _ = std::fs::create_dir_all(&smoke_dir);
    let sketch_path = smoke_dir.join("diag_sketch.ino");
    let sketch_src = "#include <Servo.h>\n#include <AccelStepper.h>\nServo s;\nvoid setup() { s.attach(3); }\nvoid loop() {}\n";
    if let Err(e) = std::fs::write(&sketch_path, sketch_src) {
        return DiagnosticCheckResult {
            id: "arduino_compile".to_string(),
            status: "fail".to_string(),
            summary: "Could not write test sketch".to_string(),
            details: e.to_string(),
            remediation_key: Some("arduino_compile_fail".to_string()),
        };
    }

    let cli_str = cli.to_string_lossy().to_string();
    let dir_str = smoke_dir.to_string_lossy().to_string();
    let data_dir = default_workshop_root().join("arduino-data");
    let dl_dir = data_dir.join("downloads");
    let user_dir = data_dir.join("user");
    let data_str = data_dir.to_string_lossy().to_string();
    let dl_str = dl_dir.to_string_lossy().to_string();
    let user_str = user_dir.to_string_lossy().to_string();
    let arduino_envs = [
        ("ARDUINO_DIRECTORIES_DATA", data_str.as_str()),
        ("ARDUINO_DIRECTORIES_DOWNLOADS", dl_str.as_str()),
        ("ARDUINO_DIRECTORIES_USER", user_str.as_str()),
    ];
    match run_silent_command_with_env(
        &cli_str,
        &["compile", "--fqbn", "arduino:avr:uno", &dir_str],
        &arduino_envs,
    ) {
        Some((true, stdout, _)) => DiagnosticCheckResult {
            id: "arduino_compile".to_string(),
            status: "pass".to_string(),
            summary: "Compiled Arduino Uno smoke sketch (Servo + AccelStepper)".to_string(),
            details: stdout.lines().last().unwrap_or("Compile succeeded").to_string(),
            remediation_key: None,
        },
        Some((false, _, stderr)) => DiagnosticCheckResult {
            id: "arduino_compile".to_string(),
            status: "fail".to_string(),
            summary: "Arduino offline compile failed".to_string(),
            details: stderr,
            remediation_key: Some("arduino_compile_fail".to_string()),
        },
        None => DiagnosticCheckResult {
            id: "arduino_compile".to_string(),
            status: "fail".to_string(),
            summary: "Failed executing arduino-cli".to_string(),
            details: "Process spawn failed".to_string(),
            remediation_key: Some("arduino_compile_fail".to_string()),
        },
    }
}

fn check_drivers() -> DiagnosticCheckResult {
    let (ok, notes) = detect_drivers_status();
    DiagnosticCheckResult {
        id: "drivers".to_string(),
        status: if ok { "pass" } else { "warn" }.to_string(),
        summary: if ok {
            "USB Serial driver support verified".to_string()
        } else {
            "CH340 USB driver not detected yet".to_string()
        },
        details: notes,
        remediation_key: if ok {
            None
        } else {
            Some("drivers_missing".to_string())
        },
    }
}

fn run_python_diag_snippet(id: &str, code: &str, fail_key: &str) -> DiagnosticCheckResult {
    let py = workshop_venv_python();
    if !py.exists() {
        return DiagnosticCheckResult {
            id: id.to_string(),
            status: "warn".to_string(),
            summary: "Workshop Python .venv not installed yet".to_string(),
            details: "Skipped until Python environment is installed.".to_string(),
            remediation_key: Some("python_missing".to_string()),
        };
    }
    let py_str = py.to_string_lossy().to_string();
    match run_silent_command(&py_str, &["-c", code]) {
        Some((true, stdout, _)) => DiagnosticCheckResult {
            id: id.to_string(),
            status: "pass".to_string(),
            summary: stdout.lines().next().unwrap_or("Passed").to_string(),
            details: stdout,
            remediation_key: None,
        },
        Some((false, stdout, stderr)) => DiagnosticCheckResult {
            id: id.to_string(),
            status: "fail".to_string(),
            summary: "Verification check failed".to_string(),
            details: format!("{stdout}\n{stderr}").trim().to_string(),
            remediation_key: Some(fail_key.to_string()),
        },
        None => DiagnosticCheckResult {
            id: id.to_string(),
            status: "fail".to_string(),
            summary: "Failed launching workshop Python".to_string(),
            details: "Process spawn failed".to_string(),
            remediation_key: Some(fail_key.to_string()),
        },
    }
}

fn check_optional_apps(selected_apps: &[String]) -> DiagnosticCheckResult {
    let mut missing = Vec::new();
    let mut found = Vec::new();

    for app in selected_apps {
        let present = match app.as_str() {
            "arduino_ide" => detect_arduino_ide_path().is_some(),
            "thonny" => detect_thonny_path().is_some(),
            "openbci_gui" => detect_openbci_gui_path().is_some(),
            "lab_recorder" => detect_lab_recorder_path().is_some(),
            "antigravity" => detect_antigravity_path().is_some(),
            "github_desktop" => detect_github_desktop_path().is_some(),
            "python_env" => workshop_venv_python().exists(),
            "jupyterlab" => {
                let py = workshop_venv_python();
                py.exists()
                    && run_silent_command(&py.to_string_lossy(), &["-m", "jupyterlab", "--version"])
                        .map(|(ok, _, _)| ok)
                        .unwrap_or(false)
            }
            "drivers" => detect_drivers_status().0,
            _ => true,
        };
        if present {
            found.push(app.clone());
        } else {
            missing.push(app.clone());
        }
    }

    if missing.is_empty() {
        DiagnosticCheckResult {
            id: "optional_apps".to_string(),
            status: "pass".to_string(),
            summary: format!("All {} selected components verified", found.len()),
            details: if found.is_empty() {
                "No optional apps selected yet.".to_string()
            } else {
                format!("Present: {}", found.join(", "))
            },
            remediation_key: None,
        }
    } else {
        DiagnosticCheckResult {
            id: "optional_apps".to_string(),
            status: "warn".to_string(),
            summary: format!("Missing selected optional apps: {}", missing.join(", ")),
            details: format!("Found: {}", found.join(", ")),
            remediation_key: Some("apps_missing".to_string()),
        }
    }
}

#[tauri::command]
pub async fn run_diagnostics(selected_apps: Vec<String>) -> Result<DiagnosticReport, String> {
    let python_gui_code = r#"
import sys, serial, numpy, scipy, PyQt6, sounddevice, matplotlib, mne, tkinter
from PyQt6.QtWidgets import QApplication
root = tkinter.Tk()
root.withdraw()
root.update()
root.destroy()
app = QApplication.instance() or QApplication([])
print(f"Python {sys.version.split()[0]} + tkinter + PyQt6 + MNE OK")
"#;

    let lsl_code = r#"
import time, pylsl
info = pylsl.StreamInfo("HubDiagStream", "EEG", 1, 100, "float32", "hub_diag_01")
outlet = pylsl.StreamOutlet(info)
streams = pylsl.resolve_byprop("name", "HubDiagStream", timeout=3.0)
assert len(streams) >= 1, "Could not resolve local LSL stream"
inlet = pylsl.StreamInlet(streams[0])
inlet.open_stream(timeout=3.0)
for i in range(5):
    outlet.push_sample([float(i)])
    time.sleep(0.01)
samples = []
for _ in range(5):
    s, _ = inlet.pull_sample(timeout=1.0)
    if s is not None:
        samples.append(s[0])
assert len(samples) >= 1, "No samples pulled from synthetic LSL stream"
print(f"Synthetic LSL loopback verified ({len(samples)} samples)")
"#;

    let brainflow_code = r#"
import time
from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds
BoardShim.disable_board_logger()
board = BoardShim(BoardIds.SYNTHETIC_BOARD.value, BrainFlowInputParams())
board.prepare_session()
board.start_stream()
time.sleep(0.4)
data = board.get_board_data()
board.stop_stream()
board.release_session()
assert data.shape[1] > 0, "No samples from BrainFlow SYNTHETIC_BOARD"
print(f"BrainFlow SYNTHETIC_BOARD OK ({data.shape[1]} samples)")
"#;

    let mic_code = r#"
import sounddevice as sd
devs = sd.query_devices()
in_devs = [d['name'] for d in devs if d['max_input_channels'] > 0]
assert len(in_devs) > 0, "No microphone input device detected"
with sd.InputStream(channels=1, samplerate=16000, blocksize=512):
    pass
print(f"Microphone OK ({in_devs[0]})")
"#;

    let checks = vec![
        check_system_and_path(),
        check_arduino_compile(),
        check_drivers(),
        run_python_diag_snippet("python_gui", python_gui_code, "python_missing"),
        run_python_diag_snippet("lsl_loopback", lsl_code, "lsl_fail"),
        run_python_diag_snippet("brainflow_synthetic", brainflow_code, "brainflow_fail"),
        run_python_diag_snippet("mic_audio", mic_code, "mic_fail"),
        check_optional_apps(&selected_apps),
    ];

    let has_fail = checks.iter().any(|c| c.status == "fail");
    let has_warn = checks.iter().any(|c| c.status == "warn");
    let overall_status = if has_fail {
        "fail"
    } else if has_warn {
        "warn"
    } else {
        "pass"
    }
    .to_string();

    let raw_logs = checks
        .iter()
        .map(|c| format!("[{}] {}: {} | {}", c.status.to_uppercase(), c.id, c.summary, c.details))
        .collect::<Vec<_>>()
        .join("\n");

    Ok(DiagnosticReport {
        timestamp: chrono::Utc::now().to_rfc3339(),
        os_arch: format!("{} / {}", std::env::consts::OS, std::env::consts::ARCH),
        hub_version: env!("CARGO_PKG_VERSION").to_string(),
        overall_status,
        checks,
        raw_logs,
    })
}

#[tauri::command]
pub async fn find_arduino_ports() -> Result<Vec<SerialDeviceInfo>, String> {
    let py = workshop_venv_python();
    if py.exists() {
        let script = r#"
import json, serial, serial.tools.list_ports
out = []
for p in serial.tools.list_ports.comports():
    vid = f"{p.vid:04X}" if p.vid is not None else None
    pid = f"{p.pid:04X}" if p.pid is not None else None
    busy = False
    try:
        s = serial.Serial(p.device, 9600, timeout=0.1)
        s.close()
    except Exception:
        busy = True
    out.append({
        "port": p.device,
        "description": p.description or "",
        "vid": vid,
        "pid": pid,
        "is_ch340": vid == "1A86" and pid == "7523",
        "is_ftdi": vid == "0403",
        "port_busy": busy,
    })
print(json.dumps(out))
"#;
        if let Some((true, stdout, _)) = run_silent_command(&py.to_string_lossy(), &["-c", script]) {
            if let Ok(parsed) = serde_json::from_str::<Vec<SerialDeviceInfo>>(&stdout) {
                return Ok(parsed);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let ps = "Get-PnpDevice -Class Ports -Status OK -ErrorAction SilentlyContinue | Select-Object Name, DeviceID | ConvertTo-Json -Compress";
        if let Some((true, stdout, _)) = run_silent_command("powershell", &["-NoProfile", "-Command", ps]) {
            let trimmed = stdout.trim();
            if !trimmed.is_empty() {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                    let arr = if val.is_array() {
                        val.as_array().cloned().unwrap_or_default()
                    } else {
                        vec![val]
                    };
                    let devices = arr
                        .into_iter()
                        .map(|item| {
                            let name = item["Name"].as_str().unwrap_or("").to_string();
                            let dev_id = item["DeviceID"].as_str().unwrap_or("").to_uppercase();
                            let port = name
                                .split('(')
                                .nth(1)
                                .and_then(|s| s.split(')').next())
                                .unwrap_or("COM?")
                                .to_string();
                            SerialDeviceInfo {
                                port,
                                description: name,
                                vid: if dev_id.contains("VID_1A86") { Some("1A86".to_string()) } else { None },
                                pid: if dev_id.contains("PID_7523") { Some("7523".to_string()) } else { None },
                                is_ch340: dev_id.contains("VID_1A86&PID_7523"),
                                is_ftdi: dev_id.contains("VID_0403"),
                                port_busy: false,
                            }
                        })
                        .collect();
                    return Ok(devices);
                }
            }
        }
    }

    Ok(Vec::new())
}
