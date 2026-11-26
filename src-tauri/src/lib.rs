mod auth;
mod diagnostics;
mod installer;
mod models;
mod scanner;
mod system;
mod telemetry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            installer::fetch_manifest,
            system::get_system_guardrails,
            auth::start_google_sign_in,
            scanner::scan_installed_components,
            installer::install_component,
            diagnostics::run_diagnostics,
            telemetry::upload_telemetry,
            installer::create_gitbook_shortcut,
            installer::sync_course_materials,
            installer::launch_app,
            diagnostics::find_arduino_ports,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
