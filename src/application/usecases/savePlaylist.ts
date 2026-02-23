import { useLochordStore } from "../store/useLochordStore";

export async function savePlaylist() {
  return useLochordStore.getState().saveCurrentPlaylist();
}
