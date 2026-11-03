// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--diagnostics" || a == "--probe" || a == "-d") {
        let caps = autonomous_studio_desktop::probe_native_hardware();
        println!("============================================================");
        println!("  🎬 Autonomous Studio Pro — Native Desktop Core");
        println!("============================================================");
        println!("  GPU Adapter Name:   {}", caps.gpu_adapter_name);
        println!("  Graphics & Compute: {}", caps.backend_api);
        println!("  NVENC Acceleration: {}", caps.supports_nvenc);
        println!("  NVDEC Acceleration: {}", caps.supports_nvdec);
        println!("  Local Stream Port:  {}", caps.local_stream_server_port);
        println!("============================================================");
        return;
    }

    autonomous_studio_desktop::run();
}

