import { Track } from "./Track";

export type Playlist = {
  name: string;
  path: string; // absolute path to M3U8 file
  tracks: Track[];
  isDirty: boolean; // true when there are unsaved changes
};
