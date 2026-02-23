import { useLochordStore } from "../store/useLochordStore";

export async function scanLibrary() {
  return useLochordStore.getState().scanLibrary();
}
