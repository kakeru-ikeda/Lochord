import { invoke } from "@tauri-apps/api/core";
import { AudioTags } from "../../domain/entities/AudioTags";

export async function readAudioTags(path: string): Promise<AudioTags> {
  return invoke<AudioTags>("read_audio_tags", { path });
}

export async function writeAudioTags(path: string, tags: AudioTags): Promise<void> {
  return invoke<void>("write_audio_tags", { path, tags });
}
