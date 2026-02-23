use crate::commands::fs::{read_audio_metadata, Track};
use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Deserialize, Debug, Clone)]
pub struct PlaylistSaveOptions {
    /// "relative" | "absolute" | "relative-from-root"
    pub path_mode: String,
    /// Music root directory (used for relative-from-root mode)
    pub music_root: Option<String>,
    /// "m3u8" | "m3u" | "txt" | "csv"
    pub format: String,
}

/// Supported playlist file extensions in the dedicated playlist directory
const PLAYLIST_EXTENSIONS: &[&str] = &["m3u8", "m3u", "txt", "csv"];

/// Scan a single directory for playlist files matching the given extensions.
fn scan_dir_for_playlists(dir: &Path, extensions: &[&str], results: &mut Vec<String>) {
    if !dir.exists() {
        return;
    }
    for entry in WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if extensions.iter().any(|e| ext.eq_ignore_ascii_case(e)) {
                results.push(path.to_string_lossy().to_string());
            }
        }
    }
}

#[tauri::command]
pub async fn list_playlists(root: String, playlist_dir: Option<String>) -> Result<Vec<String>, String> {
    let root_path = Path::new(&root);

    let mut playlists = Vec::new();

    // Always scan musicRoot for legacy m3u/m3u8 files
    scan_dir_for_playlists(root_path, &["m3u8", "m3u"], &mut playlists);

    // If a custom playlistDir is set (and different from musicRoot),
    // also scan that directory for all supported extensions
    if let Some(ref pd) = playlist_dir {
        let pd_path = Path::new(pd);
        // Only scan separately if it's not already under musicRoot
        // (if it is inside musicRoot, m3u/m3u8 are already found above;
        //  we still need to scan for txt/csv there)
        scan_dir_for_playlists(pd_path, PLAYLIST_EXTENSIONS, &mut playlists);
    } else {
        // Default Playlists/ subdir inside rootscans txt/csv too
        let default_dir = root_path.join("Playlists");
        scan_dir_for_playlists(&default_dir, &["txt", "csv"], &mut playlists);
    }

    // Deduplicate (same file may be found twice if playlistDir is inside root)
    playlists.sort();
    playlists.dedup();
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

    let ext = playlist_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let tracks = match ext.as_str() {
        "txt" => parse_txt(&content, playlist_dir),
        "csv" => parse_csv(&content, playlist_dir),
        _ => parse_m3u8(&content, playlist_dir),
    };
    Ok(tracks)
}

#[tauri::command]
pub async fn save_playlist(
    path: String,
    tracks: Vec<Track>,
    options: Option<PlaylistSaveOptions>,
) -> Result<bool, String> {
    let playlist_path = Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = playlist_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let playlist_dir = playlist_path.parent().ok_or("Invalid playlist path")?;

    let opts = options.unwrap_or(PlaylistSaveOptions {
        path_mode: "relative".to_string(),
        music_root: None,
        format: "m3u8".to_string(),
    });

    let content = match opts.format.as_str() {
        "txt" => build_txt(&tracks, playlist_dir, &opts),
        "csv" => build_csv(&tracks, playlist_dir, &opts),
        _ => build_m3u8(&tracks, playlist_dir, &opts),
    };

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

fn resolve_track_path(track: &Track, playlist_dir: &Path, opts: &PlaylistSaveOptions) -> String {
    match opts.path_mode.as_str() {
        "absolute" => track.absolute_path.replace('\\', "/"),
        "relative-from-root" => {
            if let Some(ref root) = opts.music_root {
                let root_path = Path::new(root);
                let abs_path = Path::new(&track.absolute_path);
                abs_path
                    .strip_prefix(root_path)
                    .map(|p| p.to_string_lossy().to_string().replace('\\', "/"))
                    .unwrap_or_else(|_| {
                        let rel = compute_relative_path(playlist_dir, abs_path);
                        rel.replace('\\', "/")
                    })
            } else {
                let abs_path = Path::new(&track.absolute_path);
                let rel = compute_relative_path(playlist_dir, abs_path);
                rel.replace('\\', "/")
            }
        }
        _ => {
            // "relative" – relative from playlist dir (default)
            let abs_path = Path::new(&track.absolute_path);
            let rel = compute_relative_path(playlist_dir, abs_path);
            rel.replace('\\', "/")
        }
    }
}

fn build_m3u8(tracks: &[Track], playlist_dir: &Path, opts: &PlaylistSaveOptions) -> String {
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

        let path_str = resolve_track_path(track, playlist_dir, opts);
        lines.push(path_str);
    }

    lines.join("\n") + "\n"
}

fn build_txt(tracks: &[Track], playlist_dir: &Path, opts: &PlaylistSaveOptions) -> String {
    let mut lines = Vec::new();
    for track in tracks {
        lines.push(resolve_track_path(track, playlist_dir, opts));
    }
    lines.join("\n") + "\n"
}

fn build_csv(tracks: &[Track], playlist_dir: &Path, opts: &PlaylistSaveOptions) -> String {
    let mut lines = Vec::new();
    lines.push("title,artist,duration_sec,path".to_string());
    for track in tracks {
        let path_str = resolve_track_path(track, playlist_dir, opts);
        // Escape CSV fields: wrap in quotes if they contain comma/quote/newline
        let title = csv_escape(&track.title);
        let artist = csv_escape(&track.artist);
        let path_escaped = csv_escape(&path_str);
        lines.push(format!("{},{},{},{}", title, artist, track.duration, path_escaped));
    }
    lines.join("\n") + "\n"
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
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
    let mut extinf_duration: i64 = 0;
    let mut extinf_display = String::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line == "#EXTM3U" {
            continue;
        }

        if let Some(info) = line.strip_prefix("#EXTINF:") {
            // Store raw EXTINF data; we'll prefer file metadata when available
            let parts: Vec<&str> = info.splitn(2, ',').collect();
            extinf_duration = parts[0].trim().parse().unwrap_or(0);
            if parts.len() > 1 {
                extinf_display = parts[1].trim().to_string();
            } else {
                extinf_display = String::new();
            }
        } else if !line.starts_with('#') {
            // This is a path line
            let relative_path = line.replace('\\', "/");
            let abs_path = playlist_dir.join(&relative_path);

            // Try to resolve the file. If canonicalize succeeds the file exists.
            let (absolute_path, title, artist, duration) = match abs_path.canonicalize() {
                Ok(resolved) => {
                    let absolute = resolved.to_string_lossy().to_string();
                    let (t, a, d) = read_audio_metadata(&resolved);
                    let dur = if d > 0 { d } else { extinf_duration };
                    (absolute, t, a, dur)
                }
                Err(_) => {
                    // File not available – use raw path and EXTINF display as fallback
                    let absolute = abs_path.to_string_lossy().to_string();
                    let (t, a, d) = parse_extinf_display(&extinf_display, line, extinf_duration);
                    (absolute, t, a, d)
                }
            };

            tracks.push(Track {
                title,
                artist,
                duration,
                relative_path,
                absolute_path,
            });

            extinf_duration = 0;
            extinf_display = String::new();
        }
    }

    tracks
}

/// Parse the display portion of an EXTINF line (artist - title or just title).
/// This is used only as a fallback when the audio file cannot be read.
fn parse_extinf_display(display: &str, path_line: &str, duration: i64) -> (String, String, i64) {
    if display.is_empty() {
        let title = Path::new(path_line)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();
        return (title, String::new(), duration);
    }

    // Try "Artist - Title" split; only split on first occurrence
    if let Some(sep) = display.find(" - ") {
        let artist = display[..sep].to_string();
        let title = display[sep + 3..].to_string();
        return (title, artist, duration);
    }

    (display.to_string(), String::new(), duration)
}

/// Resolve a path line to a Track. Handles absolute and relative paths.
fn resolve_path_to_track(path_line: &str, playlist_dir: &Path) -> Option<Track> {
    let normalized = path_line.replace('\\', "/");
    if normalized.is_empty() {
        return None;
    }

    let p = Path::new(path_line);
    let (abs_path, rel_path) = if p.is_absolute() {
        (p.to_path_buf(), normalized.clone())
    } else {
        let abs = playlist_dir.join(path_line);
        (abs, normalized.clone())
    };

    let (absolute_path, title, artist, duration) = match abs_path.canonicalize() {
        Ok(resolved) => {
            let absolute = resolved.to_string_lossy().to_string();
            let (t, a, d) = read_audio_metadata(&resolved);
            (absolute, t, a, d)
        }
        Err(_) => {
            let absolute = abs_path.to_string_lossy().to_string();
            let title = p
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown")
                .to_string();
            (absolute, title, String::new(), 0)
        }
    };

    Some(Track {
        title,
        artist,
        duration,
        relative_path: rel_path,
        absolute_path,
    })
}

/// Parse a plain-text playlist (one path per line, # lines are comments)
fn parse_txt(content: &str, playlist_dir: &Path) -> Vec<Track> {
    content
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .filter_map(|l| resolve_path_to_track(l, playlist_dir))
        .collect()
}

/// Parse a CSV playlist (header: title,artist,duration_sec,path)
fn parse_csv(content: &str, playlist_dir: &Path) -> Vec<Track> {
    let mut tracks = Vec::new();
    let mut is_first = true;
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // Skip header row
        if is_first {
            is_first = false;
            if line.to_lowercase().starts_with("title") {
                continue;
            }
        }
        // Simple CSV split (handles quoted fields with commas)
        let fields = csv_split(line);
        if fields.len() < 4 {
            continue;
        }
        let path_field = fields[3].trim().trim_matches('"');
        if let Some(track) = resolve_path_to_track(path_field, playlist_dir) {
            tracks.push(track);
        }
    }
    tracks
}

/// Minimal CSV field splitter that handles double-quoted fields
fn csv_split(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' => {
                if in_quotes {
                    // Check for escaped quote ""
                    if chars.peek() == Some(&'"') {
                        chars.next();
                        current.push('"');
                    } else {
                        in_quotes = false;
                    }
                } else {
                    in_quotes = true;
                }
            }
            ',' if !in_quotes => {
                fields.push(current.clone());
                current.clear();
            }
            other => current.push(other),
        }
    }
    fields.push(current);
    fields
}
