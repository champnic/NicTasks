import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useTaskStore } from "../store/taskStore";

export function NewTaskModal() {
  const { newTaskModalOpen, setNewTaskModalOpen, addTasks, sections } =
    useTaskStore();
  const [value, setValue] = useState("");
  const [sectionId, setSectionId] = useState("today");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (newTaskModalOpen && textareaRef.current) {
      textareaRef.current.focus();
      setValue("");
      setSectionId("today");
    }
  }, [newTaskModalOpen]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, [value]);

  if (!newTaskModalOpen) return null;

  const handleSubmit = () => {
    const lines = value.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const entries = lines.map((line) => {
      const isIndented = /^[\t]|^[ ]{2,}/.test(line);
      return { title: line.trim(), indent: isIndented };
    });

    addTasks(entries, sectionId);
    setValue("");
    setNewTaskModalOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setValue(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    } else if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setNewTaskModalOpen(false);
    }
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const lineCount = value.split("\n").filter((l) => l.trim().length > 0).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setNewTaskModalOpen(false)}
    >
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-slide-up border border-slate-700/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-100">New Tasks</h3>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="One task per line&#10;  Indent for sub-tasks"
          rows={3}
          className="w-full px-3.5 py-2.5 text-[15px] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 mb-3 bg-slate-900/50 placeholder:text-slate-500 text-white resize-none overflow-hidden"
        />

        <div className="flex gap-2 mb-4">
          {sortedSections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSectionId(s.id)}
              className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-all duration-150 ${
                sectionId === s.id
                  ? "bg-primary-900/40 border-primary-500 text-primary-200 shadow-sm"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {lineCount > 0 ? `${lineCount} ${lineCount === 1 ? "task" : "tasks"}` : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setNewTaskModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
            >
              Add Tasks
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-3 text-center font-mono">
          Enter → add · Ctrl+Enter → new line · Esc → cancel
        </p>
      </div>
    </div>
  );
}
