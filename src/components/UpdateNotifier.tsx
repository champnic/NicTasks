import { useEffect, useState } from "react";

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setUpdateAvailable(true);
      }
    } catch (e) {
      console.log("Update check skipped:", e);
    }
  }

  async function installUpdate() {
    try {
      setUpdating(true);
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch (e) {
      console.error("Update failed:", e);
      setUpdating(false);
    }
  }

  if (!updateAvailable) return null;

  return (
    <div className="bg-primary-900/30 border border-primary-700/80 rounded-xl p-3.5 mb-4 flex items-center gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-primary-800/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59l-1.95-2.1a.75.75 0 10-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm text-primary-200 font-semibold">Update available</p>
        <p className="text-xs text-primary-400">A new version is ready to install.</p>
      </div>
      <button
        onClick={installUpdate}
        disabled={updating}
        className="text-xs font-medium px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-sm"
      >
        {updating ? "Installing..." : "Install & Restart"}
      </button>
    </div>
  );
}
