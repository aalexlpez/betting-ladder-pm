use serde::Serialize;

#[derive(Serialize)]
struct AppStatus {
    product_name: &'static str,
    version: &'static str,
    execution_mode: &'static str,
    live_trading_enabled: bool,
}

#[tauri::command]
fn app_get_status() -> AppStatus {
    AppStatus {
        product_name: "Prediction Ladder",
        version: env!("CARGO_PKG_VERSION"),
        execution_mode: "disabled",
        live_trading_enabled: false,
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_get_status])
        .run(tauri::generate_context!())
        .expect("failed to run Prediction Ladder desktop shell");
}
