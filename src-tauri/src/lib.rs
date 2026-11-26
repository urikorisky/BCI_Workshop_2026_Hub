mod auth;
mod diagnostics;
mod installer;
mod models;
mod scanner;
mod system;
mod telemetry;
mod uninstall;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            installer::fetch_manifest,
            system::get_system_guardrails,
            auth::start_google_sign_in,
            auth::save_auth_session,
            auth::load_auth_session,
            auth::clear_auth_session,
            scanner::scan_installed_components,
            installer::install_component,
            diagnostics::run_diagnostics,
            telemetry::upload_telemetry,
            installer::create_gitbook_shortcut,
            installer::sync_course_materials,
            installer::launch_app,
            installer::check_hub_update,
            installer::download_and_open_hub_update,
            uninstall::record_hub_installed,
            uninstall::get_uninstall_plan,
            uninstall::execute_uninstall,
            diagnostics::find_arduino_ports,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
