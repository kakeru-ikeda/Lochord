/**
 * Format seconds to mm:ss display string
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Extract playlist name from M3U8 file path
 */
export function playlistNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const filename = normalized.split("/").pop() ?? path;
  return filename.replace(/\.m3u8?$/i, "");
}
