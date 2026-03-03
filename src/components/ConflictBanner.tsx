import { useTaskStore } from "../store/taskStore";

export function ConflictBanner() {
  const { conflictFiles, mergeConflicts, dismissConflicts } = useTaskStore();

  if (conflictFiles.length === 0) return null;

  return (
    <div className="bg-amber-900/30 border border-amber-700/80 rounded-xl p-3.5 mb-4 flex items-center gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-lg bg-amber-800/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm text-amber-200 font-semibold">
          Sync conflict detected
        </p>
        <p className="text-xs text-amber-400">
          {conflictFiles.length} conflict file(s) found
        </p>
      </div>
      <button
        onClick={mergeConflicts}
        className="text-xs font-medium px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-sm"
      >
        Merge
      </button>
      <button
        onClick={dismissConflicts}
        className="text-xs font-medium px-2 py-1.5 text-amber-400 hover:text-amber-200 hover:bg-amber-800/40 rounded-lg transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
