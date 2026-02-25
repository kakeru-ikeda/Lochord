use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub genre: String,
    pub year: i64,
    #[serde(rename = "coverArt")]
    pub cover_art: String,
    pub duration: i64,
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    #[serde(rename = "absolutePath")]
    pub absolute_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioTags {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub genre: String,
    pub year: i64,
    #[serde(rename = "coverArt")]
    pub cover_art: String,
}

const MUSIC_EXTENSIONS: &[&str] = &["flac", "mp3", "aac", "wav", "m4a"];

#[tauri::command]
pub async fn select_music_root(app: AppHandle) -> Result<Option<String>, String> {
    let path = app.dialog().file().blocking_pick_folder();

    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    let path = app.dialog().file().blocking_pick_folder();

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

    let allowed_exts: Vec<String> =
        extensions.unwrap_or_else(|| MUSIC_EXTENSIONS.iter().map(|s| s.to_string()).collect());
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

    // Try to read metadata (cover art excluded during scan for performance)
    let meta = read_audio_metadata(file_path, false);

    Track {
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        genre: meta.genre,
        year: meta.year,
        cover_art: meta.cover_art,
        duration: meta.duration,
        relative_path,
        absolute_path,
    }
}

pub struct AudioMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub genre: String,
    pub year: i64,
    pub cover_art: String,
    pub duration: i64,
}

pub fn read_audio_metadata(path: &Path, include_cover: bool) -> AudioMetadata {
    use lofty::prelude::*;
    use lofty::probe::Probe;

    let default_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let tagged = match Probe::open(path).and_then(|p| p.read()) {
        Ok(t) => t,
        Err(_) => {
            return AudioMetadata {
                title: default_title,
                artist: String::new(),
                album: String::new(),
                genre: String::new(),
                year: 0,
                cover_art: String::new(),
                duration: 0,
            }
        }
    };

    let duration = tagged.properties().duration().as_secs() as i64;

    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());

    let (title, artist, album, genre, year, cover_art) = if let Some(tag) = tag {
        let t = tag
            .title()
            .map(|s| s.to_string())
            .unwrap_or(default_title.clone());
        let a = tag.artist().map(|s| s.to_string()).unwrap_or_default();
        let al = tag.album().map(|s| s.to_string()).unwrap_or_default();
        let g = tag.genre().map(|s| s.to_string()).unwrap_or_default();
        let y = tag.year().unwrap_or(0) as i64;

        let cover = if include_cover {
            extract_cover_from_tag(tag)
        } else {
            String::new()
        };

        (t, a, al, g, y, cover)
    } else {
        (
            default_title,
            String::new(),
            String::new(),
            String::new(),
            0,
            String::new(),
        )
    };

    AudioMetadata {
        title,
        artist,
        album,
        genre,
        year,
        cover_art,
        duration,
    }
}

fn extract_cover_from_tag(tag: &lofty::tag::Tag) -> String {
    if let Some(pic) = tag.pictures().first() {
        use base64::Engine;
        let mime = match pic.mime_type() {
            Some(lofty::picture::MimeType::Jpeg) => "image/jpeg",
            Some(lofty::picture::MimeType::Png) => "image/png",
            Some(lofty::picture::MimeType::Bmp) => "image/bmp",
            Some(lofty::picture::MimeType::Gif) => "image/gif",
            Some(lofty::picture::MimeType::Tiff) => "image/tiff",
            _ => "image/jpeg",
        };
        let encoded = base64::engine::general_purpose::STANDARD.encode(pic.data());
        format!("data:{};base64,{}", mime, encoded)
    } else {
        String::new()
    }
}

fn extract_cover_art_from_file(path: &Path) -> String {
    use lofty::prelude::*;
    use lofty::probe::Probe;

    let tagged = match Probe::open(path).and_then(|p| p.read()) {
        Ok(t) => t,
        Err(_) => return String::new(),
    };

    let tag = match tagged.primary_tag().or_else(|| tagged.first_tag()) {
        Some(t) => t,
        None => return String::new(),
    };

    if let Some(pic) = tag.pictures().first() {
        use base64::Engine;
        let mime = match pic.mime_type() {
            Some(lofty::picture::MimeType::Jpeg) => "image/jpeg",
            Some(lofty::picture::MimeType::Png) => "image/png",
            Some(lofty::picture::MimeType::Bmp) => "image/bmp",
            Some(lofty::picture::MimeType::Gif) => "image/gif",
            Some(lofty::picture::MimeType::Tiff) => "image/tiff",
            _ => "image/jpeg",
        };
        let encoded = base64::engine::general_purpose::STANDARD.encode(pic.data());
        format!("data:{};base64,{}", mime, encoded)
    } else {
        String::new()
    }
}

#[tauri::command]
pub async fn read_audio_tags(path: String) -> Result<AudioTags, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let meta = read_audio_metadata(file_path, false);
    let cover_art = extract_cover_art_from_file(file_path);

    Ok(AudioTags {
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        genre: meta.genre,
        year: meta.year,
        cover_art,
    })
}

#[tauri::command]
pub async fn write_audio_tags(path: String, tags: AudioTags) -> Result<(), String> {
    use lofty::prelude::*;
    use lofty::probe::Probe;

    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let mut tagged = Probe::open(file_path)
        .and_then(|p| p.read())
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Get or create primary tag
    let tag = match tagged.primary_tag_mut() {
        Some(t) => t,
        None => {
            // Determine the primary tag type for this file type
            let file_type = tagged.file_type();
            let tag_type = file_type.primary_tag_type();
            tagged.insert_tag(lofty::tag::Tag::new(tag_type));
            tagged.primary_tag_mut().unwrap()
        }
    };

    tag.set_title(tags.title);
    tag.set_artist(tags.artist);
    tag.set_album(tags.album);
    tag.set_genre(tags.genre);
    if tags.year > 0 {
        tag.set_year(tags.year as u32);
    }

    // Handle cover art
    if !tags.cover_art.is_empty() {
        // Parse data URI: data:image/jpeg;base64,...
        if let Some(data) = parse_data_uri(&tags.cover_art) {
            // Remove existing pictures
            tag.remove_picture_type(lofty::picture::PictureType::CoverFront);

            let pic = lofty::picture::Picture::new_unchecked(
                lofty::picture::PictureType::CoverFront,
                Some(data.mime_type),
                None,
                data.bytes,
            );
            tag.push_picture(pic);
        }
    }

    tag.save_to_path(&path, lofty::config::WriteOptions::default())
        .map_err(|e| format!("Failed to save tags: {}", e))?;

    Ok(())
}

struct DataUriParts {
    mime_type: lofty::picture::MimeType,
    bytes: Vec<u8>,
}

fn parse_data_uri(uri: &str) -> Option<DataUriParts> {
    use base64::Engine;

    // Expected format: data:image/jpeg;base64,<data>
    let uri = uri.strip_prefix("data:")?;
    let (header, data) = uri.split_once(";base64,")?;

    let mime_type = match header {
        "image/jpeg" => lofty::picture::MimeType::Jpeg,
        "image/png" => lofty::picture::MimeType::Png,
        "image/bmp" => lofty::picture::MimeType::Bmp,
        "image/gif" => lofty::picture::MimeType::Gif,
        "image/tiff" => lofty::picture::MimeType::Tiff,
        _ => lofty::picture::MimeType::Jpeg,
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .ok()?;

    Some(DataUriParts { mime_type, bytes })
}
