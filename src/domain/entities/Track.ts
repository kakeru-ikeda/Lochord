export type Track = {
  title: string;
  artist: string;
  albumArtist: string;
  album: string;
  genre: string;
  year: number;
  trackNumber: number; // 0 = unknown
  totalTracks: number; // 0 = unknown
  discNumber: number; // 0 = unknown
  totalDiscs: number; // 0 = unknown
  composer: string;
  comment: string;
  lyrics: string;
  bpm: number; // 0 = unknown
  copyright: string;
  publisher: string;
  isrc: string;
  coverArt: string; // base64 data URI (empty string = no cover)
  duration: number; // seconds
  relativePath: string; // path written in M3U8
  absolutePath: string; // path for UI operations
};
