use crate::models::SystemGuardrails;
use std::path::{Path, PathBuf};
use sysinfo::{Disks, System};

pub fn default_workshop_root() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        PathBuf::from(r"C:\BCI_Workshop_2026")
    }
    #[cfg(not(target_os = "windows"))]
    {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("/tmp"))
            .join("BCI_Workshop_2026")
    }
}

pub fn workshop_venv_dir() -> PathBuf {
    default_workshop_root().join(".venv")
}

pub fn workshop_tools_dir() -> PathBuf {
    default_workshop_root().join("tools")
}

pub fn workshop_downloads_dir() -> PathBuf {
    default_workshop_root().join("downloads")
}

pub fn workshop_venv_python() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        workshop_venv_dir().join("Scripts").join("python.exe")
    }
    #[cfg(not(target_os = "windows"))]
    {
        workshop_venv_dir().join("bin").join("python")
    }
}

pub fn workshop_arduino_cli() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        workshop_tools_dir().join("arduino-cli").join("arduino-cli.exe")
    }
    #[cfg(not(target_os = "windows"))]
    {
        workshop_tools_dir().join("arduino-cli").join("arduino-cli")
    }
}

pub fn workshop_uv_bin() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        workshop_tools_dir().join("uv").join("uv.exe")
    }
    #[cfg(not(target_os = "windows"))]
    {
        workshop_tools_dir().join("uv").join("uv")
    }
}

pub fn is_ascii_str(s: &str) -> bool {
    s.is_ascii()
}

pub fn free_disk_gb_for_path(target: &Path) -> f64 {
    let disks = Disks::new_with_refreshed_list();
    let target_str = target.to_string_lossy().to_lowercase();
    let mut best_mount_len = 0usize;
    let mut best_free: u64 = 0;

    for disk in &disks {
        let mount = disk.mount_point().to_string_lossy().to_lowercase();
        if target_str.starts_with(&mount) && mount.len() >= best_mount_len {
            best_mount_len = mount.len();
            best_free = disk.available_space();
        }
    }

    if best_mount_len == 0 {
        if let Some(first) = disks.list().first() {
            best_free = first.available_space();
        }
    }
    (best_free as f64) / (1024.0 * 1024.0 * 1024.0)
}

#[tauri::command]
pub async fn get_system_guardrails() -> Result<SystemGuardrails, String> {
    let root = default_workshop_root();
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let root_str = root.to_string_lossy().to_string();
    let home_str = home.to_string_lossy().to_string();

    let free_gb = free_disk_gb_for_path(&root);
    let os_name = System::name().unwrap_or_else(|| std::env::consts::OS.to_string());
    let os_version = System::os_version().unwrap_or_default();
    let arch = std::env::consts::ARCH.to_string();

    let net_check = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(client) => client
            .head("https://www.google.com/generate_204")
            .send()
            .await
            .is_ok(),
        Err(_) => false,
    };

    Ok(SystemGuardrails {
        os_name,
        os_version,
        arch,
        workshop_root: root_str.clone(),
        home_dir: home_str.clone(),
        home_is_ascii: is_ascii_str(&home_str),
        root_is_ascii: is_ascii_str(&root_str),
        free_disk_gb: free_gb,
        disk_ok: free_gb >= 5.0,
        internet_ok: net_check,
    })
}
