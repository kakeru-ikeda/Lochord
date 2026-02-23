use crate::commands::fs::Track;
use std::fs;
use std::path::{Path, PathBuf};

#[tauri::command]
pub async fn list_playlists(root: String) -> Result<Vec<String>, String> {
    let playlists_dir = Path::new(&root).join("Playlists");

    if !playlists_dir.exists() {
        fs::create_dir_all(&playlists_dir)
            .map_err(|e| format!("Failed to create Playlists directory: {}", e))?;
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&playlists_dir)
        .map_err(|e| format!("Failed to read Playlists directory: {}", e))?;

    let mut playlists = Vec::new();
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if ext.eq_ignore_ascii_case("m3u8") || ext.eq_ignore_ascii_case("m3u") {
                    playlists.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    playlists.sort();
    Ok(playlists)
}

#[tauri::command]
pub async fn load_playlist(path: String) -> Result<Vec<Track>, String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read playlist: {}", e))?;

    let playlist_path = Path::new(&path);
    let playlist_dir = playlist_path
        .parent()
        .ok_or("Invalid playlist path")?;

    let tracks = parse_m3u8(&content, playlist_dir);
    Ok(tracks)
}

#[tauri::command]
pub async fn save_playlist(path: String, tracks: Vec<Track>) -> Result<bool, String> {
    let playlist_path = Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = playlist_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let playlist_dir = playlist_path.parent().ok_or("Invalid playlist path")?;
    let content = build_m3u8(&tracks, playlist_dir);

    fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Failed to write playlist: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn delete_playlist(path: String) -> Result<bool, String> {
    let p = Path::new(&path);
    if p.exists() {
        fs::remove_file(p)
            .map_err(|e| format!("Failed to delete playlist: {}", e))?;
    }
    Ok(true)
}

fn build_m3u8(tracks: &[Track], playlist_dir: &Path) -> String {
    let mut lines = Vec::new();
    lines.push("#EXTM3U".to_string());

    for track in tracks {
        let duration = track.duration;
        let title = if !track.artist.is_empty() {
            format!("{} - {}", track.artist, track.title)
        } else {
            track.title.clone()
        };
        lines.push(format!("#EXTINF:{},{}", duration, title));

        // Compute relative path from playlist dir to the track
        let abs_path = Path::new(&track.absolute_path);
        let rel = compute_relative_path(playlist_dir, abs_path);
        // Use forward slashes for cross-platform compatibility
        lines.push(rel.replace('\\', "/"));
    }

    lines.join("\n") + "\n"
}

fn compute_relative_path(from_dir: &Path, to_file: &Path) -> String {
    // Try to make a relative path from from_dir to to_file
    let from_parts: Vec<_> = from_dir.components().collect();
    let to_parts: Vec<_> = to_file.components().collect();

    // Find common prefix length
    let common = from_parts
        .iter()
        .zip(to_parts.iter())
        .take_while(|(a, b)| a == b)
        .count();

    let up_count = from_parts.len() - common;
    let mut result = PathBuf::new();
    for _ in 0..up_count {
        result.push("..");
    }
    for part in &to_parts[common..] {
        result.push(part.as_os_str());
    }

    result.to_string_lossy().to_string()
}

fn parse_m3u8(content: &str, playlist_dir: &Path) -> Vec<Track> {
    let mut tracks = Vec::new();
    let mut current_title = String::new();
    let mut current_artist = String::new();
    let mut current_duration: i64 = 0;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line == "#EXTM3U" {
            continue;
        }

        if let Some(info) = line.strip_prefix("#EXTINF:") {
            // Parse: duration,Artist - Title
            let parts: Vec<&str> = info.splitn(2, ',').collect();
            current_duration = parts[0].trim().parse().unwrap_or(0);
            if parts.len() > 1 {
                let display = parts[1].trim();
                if let Some(sep) = display.find(" - ") {
                    current_artist = display[..sep].to_string();
                    current_title = display[sep + 3..].to_string();
                } else {
                    current_title = display.to_string();
                    current_artist = String::new();
                }
            }
        } else if !line.starts_with('#') {
            // This is a path line
            let relative_path = line.replace('\\', "/");
            let abs_path = playlist_dir.join(&relative_path);
            let absolute_path = abs_path
                .canonicalize()
                .unwrap_or(abs_path)
                .to_string_lossy()
                .to_string();

            let title = if current_title.is_empty() {
                Path::new(line)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Unknown")
                    .to_string()
            } else {
                current_title.clone()
            };

            tracks.push(Track {
                title,
                artist: current_artist.clone(),
                duration: current_duration,
                relative_path,
                absolute_path,
            });

            current_title = String::new();
            current_artist = String::new();
            current_duration = 0;
        }
    }

    tracks
}
