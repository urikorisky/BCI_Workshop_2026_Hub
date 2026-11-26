use crate::models::AuthUser;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[derive(Debug, Deserialize)]
struct TokenExchangeResponse {
    id_token: Option<String>,
    refresh_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct StoredAuthSession {
    hub_version: String,
    user: AuthUser,
}

#[derive(Debug, Deserialize)]
struct JwtClaims {
    email: Option<String>,
    name: Option<String>,
    picture: Option<String>,
}

fn generate_random_b64(len: usize) -> String {
    let mut buf = vec![0u8; len];
    rand::thread_rng().fill_bytes(&mut buf);
    URL_SAFE_NO_PAD.encode(buf)
}

fn decode_jwt_claims(id_token: &str) -> Result<JwtClaims, String> {
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid JWT format returned by Google".to_string());
    }
    let decoded = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|e| format!("Failed to decode ID token payload: {e}"))?;
    serde_json::from_slice(&decoded).map_err(|e| format!("Failed to parse ID token claims: {e}"))
}

fn parse_query_param(request_line: &str, key: &str) -> Option<String> {
    let path_part = request_line.split_whitespace().nth(1)?;
    let query = path_part.split('?').nth(1)?;
    for pair in query.split('&') {
        let mut kv = pair.splitn(2, '=');
        let k = kv.next()?;
        let v = kv.next().unwrap_or("");
        if k == key {
            return urlencoding::decode(v).ok().map(|s| s.into_owned());
        }
    }
    None
}

#[tauri::command]
pub async fn start_google_sign_in(
    app: tauri::AppHandle,
    client_id: String,
) -> Result<AuthUser, String> {
    use tauri_plugin_opener::OpenerExt;

    let resolved_client_id = option_env!("GOOGLE_CLIENT_ID")
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .or_else(|| {
            let trimmed = client_id.trim().to_string();
            if trimmed.is_empty() || trimmed.contains("REPLACE_WITH") {
                None
            } else {
                Some(trimmed)
            }
        })
        .ok_or_else(|| {
            "Google OAuth Client ID is not configured yet (set GOOGLE_CLIENT_ID secret or manifest.json)."
                .to_string()
        })?;

    let client_secret = option_env!("GOOGLE_CLIENT_SECRET").unwrap_or("");

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind local OAuth callback port: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to inspect local callback port: {e}"))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}/callback");

    let verifier = generate_random_b64(48);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let state = generate_random_b64(24);

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&code_challenge={}&code_challenge_method=S256&state={}&access_type=offline&prompt=select_account%20consent",
        urlencoding::encode(&resolved_client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode("openid email profile"),
        urlencoding::encode(&challenge),
        urlencoding::encode(&state),
    );

    app.opener()
        .open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser for Google Sign-In: {e}"))?;

    let (mut socket, _) = tokio::time::timeout(
        std::time::Duration::from_secs(180),
        listener.accept(),
    )
    .await
    .map_err(|_| "Timed out waiting for Google Sign-In in browser (180s).".to_string())?
    .map_err(|e| format!("OAuth callback connection error: {e}"))?;

    let mut buffer = [0u8; 4096];
    let n = socket
        .read(&mut buffer)
        .await
        .map_err(|e| format!("Failed reading OAuth callback: {e}"))?;
    let req_text = String::from_utf8_lossy(&buffer[..n]);
    let first_line = req_text.lines().next().unwrap_or("");

    let returned_state = parse_query_param(first_line, "state").unwrap_or_default();
    let error_param = parse_query_param(first_line, "error");
    let code = parse_query_param(first_line, "code");

    let html_body = if error_param.is_some() || code.is_none() || returned_state != state {
        "<!doctype html><html><body style='font-family:sans-serif;text-align:center;padding:48px'><h2>Sign-in cancelled or failed</h2><p>You can close this tab and return to BCI Workshop Hub.</p></body></html>"
    } else {
        "<!doctype html><html><body style='font-family:sans-serif;text-align:center;padding:48px'><h2>ההתחברות הושלמה / Sign-in complete!</h2><p>ניתן לסגור לשונית זו ולחזור לאפליקציית הסדנה.<br/>You can close this tab and return to BCI Workshop Hub.</p></body></html>"
    };

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html_body.len(),
        html_body
    );
    let _ = socket.write_all(response.as_bytes()).await;
    let _ = socket.shutdown().await;

    if let Some(err) = error_param {
        return Err(format!("Google Sign-In error: {err}"));
    }
    if returned_state != state {
        return Err("OAuth state mismatch; please try signing in again.".to_string());
    }
    let auth_code = code.ok_or_else(|| "No authorization code returned by Google.".to_string())?;

    let mut form_params = vec![
        ("code", auth_code.as_str()),
        ("client_id", resolved_client_id.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("grant_type", "authorization_code"),
        ("code_verifier", verifier.as_str()),
    ];
    if !client_secret.trim().is_empty() {
        form_params.push(("client_secret", client_secret));
    }

    let token_res: TokenExchangeResponse = reqwest::Client::new()
        .post("https://oauth2.googleapis.com/token")
        .form(&form_params)
        .send()
        .await
        .map_err(|e| format!("Failed contacting Google token endpoint: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Invalid JSON from Google token endpoint: {e}"))?;

    if let Some(err) = token_res.error {
        return Err(format!(
            "Google token error: {err} ({})",
            token_res.error_description.unwrap_or_default()
        ));
    }

    let id_token = token_res
        .id_token
        .ok_or_else(|| "Google did not return an id_token.".to_string())?;
    let claims = decode_jwt_claims(&id_token)?;

    let email = claims
        .email
        .ok_or_else(|| "Verified email missing in Google ID token.".to_string())?;
    let name = claims.name.unwrap_or_else(|| email.clone());

    Ok(AuthUser {
        email,
        name,
        id_token,
        picture: claims.picture,
        refresh_token: token_res.refresh_token,
    })
}

fn resolve_client_id(client_id: &str) -> Option<String> {
    option_env!("GOOGLE_CLIENT_ID")
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .or_else(|| {
            let trimmed = client_id.trim().to_string();
            if trimmed.is_empty() || trimmed.contains("REPLACE_WITH") {
                None
            } else {
                Some(trimmed)
            }
        })
}

fn auth_session_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("BCI_Workshop_2026_Hub")
        .join("auth_session.json")
}

#[tauri::command]
pub async fn save_auth_session(user: AuthUser, hub_version: String) -> Result<(), String> {
    let path = auth_session_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed creating session dir: {e}"))?;
    }
    let stored = StoredAuthSession { hub_version, user };
    let json = serde_json::to_string_pretty(&stored).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("Failed saving auth session: {e}"))
}

pub fn clear_auth_session_file() {
    let path = auth_session_path();
    if path.exists() {
        let _ = std::fs::remove_file(&path);
    }
    if let Some(parent) = path.parent() {
        let is_empty = std::fs::read_dir(parent)
            .map(|mut d| d.next().is_none())
            .unwrap_or(false);
        if is_empty {
            let _ = std::fs::remove_dir(parent);
        }
    }
}

#[tauri::command]
pub async fn clear_auth_session() -> Result<(), String> {
    clear_auth_session_file();
    Ok(())
}

#[tauri::command]
pub async fn load_auth_session(
    client_id: String,
    hub_version: String,
) -> Result<Option<AuthUser>, String> {
    let path = auth_session_path();
    if !path.exists() {
        return Ok(None);
    }
    let raw = match std::fs::read_to_string(&path) {
        Ok(s) => s,
        Err(_) => return Ok(None),
    };
    let mut stored: StoredAuthSession = match serde_json::from_str(&raw) {
        Ok(s) => s,
        Err(_) => {
            let _ = std::fs::remove_file(&path);
            return Ok(None);
        }
    };

    if stored.hub_version.trim() != hub_version.trim() {
        let _ = std::fs::remove_file(&path);
        return Ok(None);
    }

    if let (Some(ref refresh_token), Some(resolved_client_id)) =
        (stored.user.refresh_token.clone(), resolve_client_id(&client_id))
    {
        let client_secret = option_env!("GOOGLE_CLIENT_SECRET").unwrap_or("");
        let mut form_params = vec![
            ("refresh_token", refresh_token.as_str()),
            ("client_id", resolved_client_id.as_str()),
            ("grant_type", "refresh_token"),
        ];
        if !client_secret.trim().is_empty() {
            form_params.push(("client_secret", client_secret));
        }

        if let Ok(client) = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
        {
            if let Ok(resp) = client
                .post("https://oauth2.googleapis.com/token")
                .form(&form_params)
                .send()
                .await
            {
                if let Ok(token_res) = resp.json::<TokenExchangeResponse>().await {
                    if let Some(err) = token_res.error {
                        if err == "invalid_grant" {
                            let _ = std::fs::remove_file(&path);
                            return Ok(None);
                        }
                    } else if let Some(new_id_token) = token_res.id_token {
                        stored.user.id_token = new_id_token.clone();
                        if let Ok(claims) = decode_jwt_claims(&new_id_token) {
                            if let Some(email) = claims.email {
                                stored.user.email = email;
                            }
                            if let Some(name) = claims.name {
                                stored.user.name = name;
                            }
                            if claims.picture.is_some() {
                                stored.user.picture = claims.picture;
                            }
                        }
                        if let Ok(updated_json) = serde_json::to_string_pretty(&stored) {
                            let _ = std::fs::write(&path, updated_json);
                        }
                    }
                }
            }
        }
    }

    Ok(Some(stored.user))
}
