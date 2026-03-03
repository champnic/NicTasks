import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
  readDir,
  remove,
} from "@tauri-apps/plugin-fs";
import { documentDir, homeDir } from "@tauri-apps/api/path";
import { AppData, APP_DATA_VERSION, DEFAULT_SECTIONS } from "../types";
import { v4 as uuidv4 } from "uuid";

const APP_FOLDER = "NicTasks";
const DATA_FILE = "tasks.json";

let cachedDocDir: string | null = null;
let deviceId: string | null = null;

async function getDocDir(): Promise<string> {
  if (!cachedDocDir) {
    // Prefer OneDrive-synced Documents if it exists, so the app
    // uses the same path regardless of OS folder-redirection settings.
    const home = await homeDir();
    const oneDrivePaths = [
      `${home}\\OneDrive - Microsoft\\Documents`,
      `${home}\\OneDrive\\Documents`,
    ];
    for (const candidate of oneDrivePaths) {
      if (await exists(candidate)) {
        cachedDocDir = candidate;
        return cachedDocDir;
      }
    }
    // Fall back to OS default Documents folder
    cachedDocDir = await documentDir();
  }
  return cachedDocDir;
}

export async function getAppDir(): Promise<string> {
  const docDir = await getDocDir();
  return `${docDir}\\${APP_FOLDER}`;
}

async function getDataFilePath(): Promise<string> {
  const appDir = await getAppDir();
  return `${appDir}\\${DATA_FILE}`;
}

async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  // Generate a device ID and store it per-install
  // We'll use a simple approach: store in localStorage since it's per-device
  const stored = localStorage.getItem("nictasks-device-id");
  if (stored) {
    deviceId = stored;
    return stored;
  }
  deviceId = uuidv4();
  localStorage.setItem("nictasks-device-id", deviceId);
  return deviceId;
}

export async function ensureAppDir(): Promise<void> {
  const appDir = await getAppDir();
  const dirExists = await exists(appDir);
  if (!dirExists) {
    await mkdir(appDir, { recursive: true });
  }
}

export async function loadData(): Promise<AppData> {
  try {
    await ensureAppDir();
    const filePath = await getDataFilePath();
    const fileExists = await exists(filePath);

    if (!fileExists) {
      return createDefaultData();
    }

    const content = await readTextFile(filePath);
    const data: AppData = JSON.parse(content);

    // Basic migration support
    if (!data.version || data.version < APP_DATA_VERSION) {
      data.version = APP_DATA_VERSION;
    }

    return data;
  } catch (error) {
    console.error("Failed to load data:", error);
    return createDefaultData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await ensureAppDir();
    const filePath = await getDataFilePath();

    data.lastModified = new Date().toISOString();
    data.deviceId = await getDeviceId();

    const json = JSON.stringify(data, null, 2);
    await writeTextFile(filePath, json);
  } catch (error) {
    console.error("Failed to save data:", error);
  }
}

async function createDefaultData(): Promise<AppData> {
  return {
    version: APP_DATA_VERSION,
    sections: [...DEFAULT_SECTIONS],
    tasks: [],
    lastModified: new Date().toISOString(),
    deviceId: await getDeviceId(),
  };
}

/**
 * Scan for OneDrive conflict copies and return their paths.
 * OneDrive creates files like "tasks-MACHINENAME.json" or "tasks (1).json"
 */
export async function scanForConflicts(): Promise<string[]> {
  try {
    const appDir = await getAppDir();
    const entries = await readDir(appDir);
    const conflicts: string[] = [];

    for (const entry of entries) {
      if (
        entry.name &&
        entry.name !== DATA_FILE &&
        entry.name !== "tasks.tmp.json" &&
        entry.name.startsWith("tasks") &&
        entry.name.endsWith(".json")
      ) {
        conflicts.push(`${appDir}\\${entry.name}`);
      }
    }

    return conflicts;
  } catch {
    return [];
  }
}

/**
 * Merge a conflict file by taking any tasks not already present.
 */
export async function mergeConflictFile(
  conflictPath: string,
  currentData: AppData
): Promise<AppData> {
  try {
    const content = await readTextFile(conflictPath);
    const conflictData: AppData = JSON.parse(content);

    const existingIds = new Set(currentData.tasks.map((t) => t.id));
    const existingSectionIds = new Set(currentData.sections.map((s) => s.id));

    // Merge tasks that don't exist
    for (const task of conflictData.tasks) {
      if (!existingIds.has(task.id)) {
        currentData.tasks.push(task);
      } else {
        // If both have the task, keep the most recently updated one
        const existing = currentData.tasks.find((t) => t.id === task.id)!;
        if (task.updatedAt > existing.updatedAt) {
          Object.assign(existing, task);
        }
      }
    }

    // Merge custom sections
    for (const section of conflictData.sections) {
      if (!existingSectionIds.has(section.id)) {
        currentData.sections.push(section);
      }
    }

    // Remove the conflict file after merge
    await remove(conflictPath);

    return currentData;
  } catch (error) {
    console.error("Failed to merge conflict file:", error);
    return currentData;
  }
}
