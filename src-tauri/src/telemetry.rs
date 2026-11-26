use crate::models::{TelemetryPayload, TelemetryResponse};
use serde_json::json;
use std::collections::HashMap;
use sysinfo::System;

#[tauri::command]
pub async fn upload_telemetry(payload: TelemetryPayload) -> Result<TelemetryResponse, String> {
    let endpoint = payload.endpoint.trim();
    if endpoint.is_empty() || endpoint.contains("REPLACE_WITH") {
        return Err("Telemetry endpoint URL is not configured in manifest.json yet.".to_string());
    }

    let resolved_os_arch = if payload.os_arch.trim().is_empty() {
        let os_name = System::name().unwrap_or_else(|| std::env::consts::OS.to_string());
        let os_ver = System::os_version().unwrap_or_default();
        format!("{os_name} {os_ver} ({})".trim(), std::env::consts::ARCH)
            .replace("  ", " ")
    } else {
        payload.os_arch.clone()
    };

    let resolved_overall_status = if payload.overall_status.trim().is_empty()
        && payload.event_type == "sign_in"
    {
        "SIGNED_IN".to_string()
    } else {
        payload.overall_status.clone()
    };

    let mut checks_map: HashMap<String, serde_json::Value> = HashMap::new();
    for chk in &payload.checks {
        let key = match chk.id.as_str() {
            "arduino_compile" => "arduino",
            "python_gui" => "python",
            "lsl_loopback" => "lsl",
            "brainflow_synthetic" => "brainflow",
            "mic_audio" => "mic",
            other => other,
        };
        checks_map.insert(
            key.to_string(),
            json!({
                "status": chk.status,
                "summary": chk.summary,
                "details": chk.details,
            }),
        );
    }

    let body = json!({
        "id_token": payload.id_token,
        "event_type": payload.event_type,
        "hub_version": payload.hub_version,
        "os_arch": resolved_os_arch,
        "overall_status": resolved_overall_status,
        "checks": checks_map,
        "optional_apps_selected": payload.optional_apps_selected,
        "student_note": payload.student_note,
        "raw_logs": payload.raw_logs,
    });

    let resp = reqwest::Client::new()
        .post(endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed connecting to telemetry Apps Script: {e}"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed reading Apps Script response: {e}"))?;

    if !status.is_success() {
        return Err(format!("Apps Script returned HTTP {status}: {text}"));
    }

    serde_json::from_str::<TelemetryResponse>(&text)
        .map_err(|e| format!("Invalid JSON from Apps Script ({e}): {text}"))
}
