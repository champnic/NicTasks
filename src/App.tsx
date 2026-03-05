import { useEffect, useState, useRef } from "react";
import { useTaskStore } from "./store/taskStore";
import { flushPendingSave } from "./store/taskStore";
import { TaskList } from "./components/TaskList";
import { NewTaskModal } from "./components/NewTaskModal";
import { SectionManager } from "./components/SectionManager";
import { ConflictBanner } from "./components/ConflictBanner";
import { UpdateNotifier } from "./components/UpdateNotifier";
import { LogPanel } from "./components/LogPanel";

function App() {
  const { initialize, isLoaded, showCompleted, toggleShowCompleted, setNewTaskModalOpen } =
    useTaskStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Flush pending saves on window close to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Also listen for Tauri close-requested event
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().onCloseRequested(async () => {
        flushPendingSave();
      }).then((fn) => { unlisten = fn; });
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unlisten?.();
    };
  }, []);

  // Register global shortcut
  useEffect(() => {
    let cancelled = false;
    let unregisterFns: { unregT: (() => Promise<void>) | null; unregL: (() => Promise<void>) | null } = { unregT: null, unregL: null };
    let unlistenFocus: (() => void) | null = null;

    // Track focus state via events since isFocused() is unreliable during global hotkey handlers
    let windowHasFocus = true;

    async function registerShortcut() {
      try {
        const { register, isRegistered, unregister } = await import(
          "@tauri-apps/plugin-global-shortcut"
        );
        if (cancelled) return;

        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();

        // Track focus state via window events
        unlistenFocus = await win.onFocusChanged(({ payload: focused }) => {
          windowHasFocus = focused;
        });

        // Unregister first in case of StrictMode double-mount
        if (await isRegistered("Control+Alt+T")) {
          await unregister("Control+Alt+T");
        }
        if (await isRegistered("Control+Alt+L")) {
          await unregister("Control+Alt+L");
        }
        if (cancelled) return;

        await register("Control+Alt+T", async (event) => {
          if (event.state === "Pressed") {
            await win.unminimize();
            await win.show();
            await win.setFocus();
            setNewTaskModalOpen(true);
          }
        });
        unregisterFns.unregT = () => unregister("Control+Alt+T");

        await register("Control+Alt+L", async (event) => {
          if (event.state === "Pressed") {
            const minimized = await win.isMinimized();
            console.log(`[Ctrl+Alt+L] minimized=${minimized} windowHasFocus=${windowHasFocus}`);
            if (minimized) {
              await win.unminimize();
              await win.show();
              await win.setFocus();
            } else if (windowHasFocus) {
              await win.minimize();
            } else {
              await win.show();
              await win.setFocus();
            }
          }
        });
        unregisterFns.unregL = () => unregister("Control+Alt+L");

        console.log("[Shortcuts] Ctrl+Alt+T and Ctrl+Alt+L registered successfully");
      } catch (e) {
        console.warn("Failed to register global shortcut:", e);
      }
    }

    registerShortcut();

    return () => {
      cancelled = true;
      unregisterFns.unregT?.().catch(console.warn);
      unregisterFns.unregL?.().catch(console.warn);
      unlistenFocus?.();
    };
  }, [setNewTaskModalOpen]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-sm text-slate-300 font-medium">Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <Header
        showCompleted={showCompleted}
        toggleShowCompleted={toggleShowCompleted}
      />

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-5 py-5">
        <UpdateNotifier />
        <ConflictBanner />
        <TaskList />
        <SectionManager />
      </main>

      {/* New task modal */}
      <NewTaskModal />

      {/* Error log panel */}
      <LogPanel />
    </div>
  );
}

function Header({ showCompleted, toggleShowCompleted }: { showCompleted: boolean; toggleShowCompleted: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/80 shadow-sm">
      <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 128 128" fill="none">
              <rect x="10" y="10" width="108" height="108" rx="24" fill="#ff984f" opacity="0.6" />
              <rect x="24" y="28" width="80" height="16" rx="8" fill="#FF6B00" />
              <rect x="34" y="56" width="60" height="16" rx="8" fill="#FFFFFF" fillOpacity="0.8" />
              <rect x="34" y="84" width="60" height="16" rx="8" fill="#FFFFFF" fillOpacity="0.8" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-slate-100 tracking-tight">NicTasks</h1>
          <span className="text-[10px] text-slate-500 font-normal">v0.1.8</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Show/Hide Done toggle */}
          <button
            onClick={toggleShowCompleted}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition-all duration-150 ${
              showCompleted
                ? "bg-primary-600/30 text-primary-300 border border-primary-500/40 hover:bg-primary-600/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title={showCompleted ? "Hide completed tasks" : "Show completed tasks"}
          >
            {showCompleted ? "✓ Done" : "Show done"}
          </button>

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-md transition-all duration-150"
              title="Menu"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                {/* Open JSON folder */}
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    const { getAppDir } = await import("./storage/persistence");
                    const { openPath } = await import("@tauri-apps/plugin-opener");
                    const dir = await getAppDir();
                    await openPath(dir);
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" />
                  </svg>
                  Open data folder
                </button>

                <div className="border-t border-slate-700 my-1" />

                {/* Shortcut hints */}
                <div className="px-3 py-1.5 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Keyboard Shortcuts
                </div>
                <div className="px-3 py-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-slate-400">Global Add Task</span>
                  <kbd className="text-[11px] text-slate-500 font-mono bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700">Ctrl+Alt+T</kbd>
                </div>
                <div className="px-3 py-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-slate-400">Global Show/Hide</span>
                  <kbd className="text-[11px] text-slate-500 font-mono bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700">Ctrl+Alt+L</kbd>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default App;
