import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  available: boolean;
  version?: string;
  currentVersion?: string;
  date?: string;
  body?: string;
}

let activeUpdate: Update | null = null;

export async function checkForAppUpdate(): Promise<UpdateInfo> {
  try {
    const update = await check();
    if (update && update.available) {
      activeUpdate = update;
      return {
        available: true,
        version: update.version,
        currentVersion: update.currentVersion,
        date: update.date,
        body: update.body,
      };
    }
    activeUpdate = null;
    return {
      available: false,
      currentVersion: update?.currentVersion,
    };
  } catch (err: unknown) {
    activeUpdate = null;
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

export async function downloadAndInstallUpdate(
  onProgress?: (downloaded: number, total: number | null) => void
): Promise<void> {
  if (!activeUpdate) {
    throw new Error('No update is available to install');
  }

  let totalBytes: number | null = null;
  let downloadedBytes = 0;

  await activeUpdate.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        totalBytes = event.data.contentLength ?? null;
        if (onProgress) {
          onProgress(0, totalBytes);
        }
        break;
      case 'Progress':
        downloadedBytes += event.data.chunkLength;
        if (onProgress) {
          onProgress(downloadedBytes, totalBytes);
        }
        break;
      case 'Finished':
        if (onProgress) {
          onProgress(totalBytes ?? downloadedBytes, totalBytes);
        }
        break;
    }
  });

  // Automatically restart the application with the newly installed version
  await relaunch();
}
