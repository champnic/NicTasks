import { useEffect } from "react";
import { useTaskStore } from "./store/taskStore";
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

  // Register global shortcut
  useEffect(() => {
    let registered = false;

    async function registerShortcut() {
      try {
        const { register } = await import(
          "@tauri-apps/plugin-global-shortcut"
        );
        await register("Control+Alt+T", (event) => {
          if (event.state === "Pressed") {
            import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
              const win = getCurrentWindow();
              win.show();
              win.setFocus();
            });
            setNewTaskModalOpen(true);
          }
        });
        registered = true;
      } catch (e) {
        console.warn("Failed to register global shortcut:", e);
      }
    }

    registerShortcut();

    return () => {
      if (registered) {
        import("@tauri-apps/plugin-global-shortcut").then(({ unregister }) => {
          unregister("Control+Alt+T").catch(console.warn);
        });
      }
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
            <span className="text-[10px] text-slate-500 font-normal">v0.1.0</span>
          </div>
          <div className="flex items-center gap-2">
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
