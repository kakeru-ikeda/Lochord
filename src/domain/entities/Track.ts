export type Track = {
  title: string;
  artist: string;
  duration: number; // seconds
  relativePath: string; // path written in M3U8
  absolutePath: string; // path for UI operations
};
