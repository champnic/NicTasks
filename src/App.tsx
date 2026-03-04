import { useEffect } from "react";
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
      <header className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/80 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-base font-semibold text-slate-100 tracking-tight">NicTasks</h1>
            <span className="text-[10px] text-slate-500 font-normal">v0.1.4</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const { getAppDir } = await import("./storage/persistence");
                const { openPath } = await import("@tauri-apps/plugin-opener");
                const dir = await getAppDir();
                await openPath(dir);
              }}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-md transition-all duration-150"
              title="Open data folder"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" />
              </svg>
            </button>
            <button
              onClick={toggleShowCompleted}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition-all duration-150 ${
                showCompleted
                  ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {showCompleted ? "Hide done" : "Show done"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-5 py-5">
        <UpdateNotifier />
        <ConflictBanner />
        <TaskList />
        <SectionManager />
      </main>

      {/* New task modal */}
      <NewTaskModal />

      {/* Shortcut hint */}
      <div className="fixed bottom-3 right-3 text-[11px] text-slate-500 font-mono bg-slate-800/60 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-700/50">
        Ctrl+Alt+T
      </div>

      {/* Error log panel */}
      <LogPanel />
    </div>
  );
}

export default App;
