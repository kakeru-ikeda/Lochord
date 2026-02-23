use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    pub title: String,
    pub artist: String,
    pub duration: i64,
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    #[serde(rename = "absolutePath")]
    pub absolute_path: String,
}

const MUSIC_EXTENSIONS: &[&str] = &["flac", "mp3", "aac", "wav", "m4a"];

#[tauri::command]
pub async fn select_music_root(app: AppHandle) -> Result<Option<String>, String> {
    let path = app
        .dialog()
        .file()
        .blocking_pick_folder();

    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    let path = app
        .dialog()
        .file()
        .blocking_pick_folder();

    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn scan_music_directory(
    path: String,
    extensions: Option<Vec<String>>,
    exclude_patterns: Option<Vec<String>>,
) -> Result<Vec<Track>, String> {
    let root = Path::new(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let allowed_exts: Vec<String> = extensions
        .unwrap_or_else(|| MUSIC_EXTENSIONS.iter().map(|s| s.to_string()).collect());
    let exclude = exclude_patterns.unwrap_or_default();

    let mut tracks = Vec::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                let name = e.file_name().to_string_lossy();
                // Skip the Playlists directory to avoid traversing M3U8 files
                if name == "Playlists" {
                    return false;
                }
                // Skip user-defined exclude patterns
                for pattern in &exclude {
                    if name.to_lowercase().contains(&pattern.to_lowercase()) {
                        return false;
                    }
                }
            }
            true
        })
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let file_path = entry.path();
        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        if let Some(ext) = ext {
            if allowed_exts.iter().any(|e| e.eq_ignore_ascii_case(&ext)) {
                let track = build_track(file_path, root);
                tracks.push(track);
            }
        }
    }

    // Sort by path for consistent ordering
    tracks.sort_by(|a, b| a.absolute_path.cmp(&b.absolute_path));

    Ok(tracks)
}

fn build_track(file_path: &Path, root: &Path) -> Track {
    let absolute_path = file_path.to_string_lossy().to_string();

    // relative path from music root
    let relative_path = file_path
        .strip_prefix(root)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string();

    // Try to read metadata
    let (title, artist, duration) = read_audio_metadata(file_path);

    Track {
        title,
        artist,
        duration,
        relative_path,
        absolute_path,
    }
}

pub fn read_audio_metadata(path: &Path) -> (String, String, i64) {
    use lofty::prelude::*;
    use lofty::probe::Probe;

    let default_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let tagged = match Probe::open(path).and_then(|p| p.read()) {
        Ok(t) => t,
        Err(_) => return (default_title, String::new(), 0),
    };

    let duration = tagged
        .properties()
        .duration()
        .as_secs() as i64;

    let (title, artist) = if let Some(tag) = tagged.primary_tag() {
        let t = tag
            .title()
            .map(|s| s.to_string())
            .unwrap_or(default_title.clone());
        let a = tag
            .artist()
            .map(|s| s.to_string())
            .unwrap_or_default();
        (t, a)
    } else if let Some(tag) = tagged.first_tag() {
        let t = tag
            .title()
            .map(|s| s.to_string())
            .unwrap_or(default_title.clone());
        let a = tag
            .artist()
            .map(|s| s.to_string())
            .unwrap_or_default();
        (t, a)
    } else {
        (default_title, String::new())
    };

    (title, artist, duration)
}
