export type Track = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  coverArt: string; // base64 data URI (empty string = no cover)
  duration: number; // seconds
  relativePath: string; // path written in M3U8
  absolutePath: string; // path for UI operations
};
