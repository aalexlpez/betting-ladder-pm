fn main() {
    println!("cargo:rerun-if-changed=capabilities/main.json");
    println!("cargo:rerun-if-changed=permissions/app-trading-commands.toml");
    tauri_build::build();
}
