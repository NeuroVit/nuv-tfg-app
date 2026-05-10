#[tauri::command]
async fn fetch_google_mobile_credential(ticket: String, base_url: String) -> Result<String, String> {
  let trimmed_base = base_url.trim().trim_end_matches('/');
  let endpoint = format!("{trimmed_base}/auth/google/mobile/credential");
  let mut url = reqwest::Url::parse(&endpoint)
    .map_err(|e| format!("Invalid endpoint URL: {e}"))?;
  url.query_pairs_mut().append_pair("ticket", &ticket);

  let client = reqwest::Client::new();
  let response = client
    .get(url)
    .header("Accept", "application/json")
    .send()
    .await
    .map_err(|e| format!("Network request failed: {e}"))?;

  let status = response.status();
  if !status.is_success() {
    let body = response.text().await.unwrap_or_default();
    return Err(format!("HTTP {} {}", status.as_u16(), body));
  }

  let payload: serde_json::Value = response
    .json()
    .await
    .map_err(|e| format!("Invalid JSON response: {e}"))?;

  payload
    .get("credential")
    .and_then(|value| value.as_str())
    .filter(|value| !value.is_empty())
    .map(|value| value.to_string())
    .ok_or_else(|| "Missing credential in response".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_deep_link::init())
    .invoke_handler(tauri::generate_handler![fetch_google_mobile_credential])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
