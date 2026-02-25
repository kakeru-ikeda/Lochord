mod commands;

use commands::fs::{
    read_audio_tags, scan_music_directory, select_directory, select_music_root, write_audio_tags,
};
use commands::m3u::{delete_playlist, list_playlists, load_playlist, save_playlist};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            select_music_root,
            select_directory,
            scan_music_directory,
            read_audio_tags,
            write_audio_tags,
            list_playlists,
            load_playlist,
            save_playlist,
            delete_playlist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
