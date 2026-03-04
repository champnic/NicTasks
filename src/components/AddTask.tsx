import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { useTaskStore } from "../store/taskStore";

interface AddTaskProps {
  sectionId: string;
}

export function AddTask({ sectionId }: AddTaskProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addTasks } = useTaskStore();

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const lines = value.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const entries = lines.map((line) => {
      const isIndented = /^[\t]|^[ ]{2,}/.test(line);
      return { title: line.trim(), indent: isIndented };
    });

    addTasks(entries, sectionId);
    setValue("");
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
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + "\n" + value.substring(end);
      setValue(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setValue("");
      textareaRef.current?.blur();
    }
  };

  const lineCount = value.split("\n").filter((l) => l.trim().length > 0).length;
  const hasContent = value.trim().length > 0;

  return (
    <div className="mt-1.5">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tasks... (one per line, indent for sub-tasks)"
          rows={1}
          className="w-full text-[14px] px-3 py-2 border border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-slate-800/50 placeholder:text-slate-600 text-slate-100 resize-none overflow-hidden transition-colors"
        />
        {hasContent && (
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[11px] text-slate-500">
              {lineCount} {lineCount === 1 ? "task" : "tasks"} · indent for sub-tasks
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono">
                Enter
              </span>
              <button
                onClick={handleSubmit}
                className="text-xs font-medium px-3 py-1 bg-primary-500 text-white rounded-md hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sm"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
