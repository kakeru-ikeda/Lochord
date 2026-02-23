import { useLochordStore } from "../store/useLochordStore";

export async function loadPlaylist(path: string) {
  return useLochordStore.getState().selectPlaylist(path);
}
