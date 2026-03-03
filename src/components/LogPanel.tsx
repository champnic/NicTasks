import { useEffect, useState, useRef } from "react";

interface LogEntry {
  id: number;
  level: "error" | "warn" | "info";
  message: string;
  timestamp: Date;
}

let nextId = 0;
const listeners = new Set<(entry: LogEntry) => void>();

function addLogEntry(level: LogEntry["level"], message: string) {
  const entry: LogEntry = { id: nextId++, level, message, timestamp: new Date() };
  listeners.forEach((fn) => fn(entry));
}

// Intercept console.error and console.warn globally (once)
const originalError = console.error;
const originalWarn = console.warn;
let patched = false;

export function installLogInterceptor() {
  if (patched) return;
  patched = true;

  console.error = (...args: unknown[]) => {
    originalError(...args);
    addLogEntry("error", args.map(String).join(" "));
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    addLogEntry("warn", args.map(String).join(" "));
  };

  window.addEventListener("unhandledrejection", (e) => {
    addLogEntry("error", `Unhandled promise rejection: ${e.reason}`);
  });

  window.addEventListener("error", (e) => {
    addLogEntry("error", `${e.message} (${e.filename}:${e.lineno})`);
  });
}

export function LogPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (entry: LogEntry) => {
      setEntries((prev) => [...prev.slice(-99), entry]);
      setDismissed(false);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const errorEntries = entries.filter((e) => e.level === "error" || e.level === "warn");

  if (errorEntries.length === 0 || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-red-800/60 shadow-lg animate-slide-up">
      <div className="flex items-center justify-between px-4 py-1.5 bg-red-900/30 border-b border-red-800/40">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-[12px] font-semibold text-red-300">
            {errorEntries.length} {errorEntries.length === 1 ? "error" : "errors"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEntries([]); setDismissed(true); }}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="max-h-36 overflow-y-auto px-4 py-2 space-y-1 font-mono text-[11px]">
        {errorEntries.map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <span className="text-slate-600 shrink-0">
              {entry.timestamp.toLocaleTimeString()}
            </span>
            <span className={entry.level === "error" ? "text-red-400" : "text-amber-400"}>
              [{entry.level}]
            </span>
            <span className="text-slate-300 break-all">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
