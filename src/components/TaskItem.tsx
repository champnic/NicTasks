import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useTaskStore } from "../store/taskStore";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { Task } from "../types";

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  subtasks?: Task[];
}

function formatElapsed(dateStr: string): string {
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y`;
}

export function TaskItem({ id, title, completed, createdAt, dragHandleRef, subtasks }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { editTaskWithSubtasks, deleteTask, toggleComplete } = useTaskStore();

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
      // Place cursor at end of first line
      const firstLineEnd = ta.value.indexOf("\n");
      const pos = firstLineEnd === -1 ? ta.value.length : firstLineEnd;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    }
  }, [isEditing]);

  // Keep textarea height in sync with content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [editValue, isEditing]);

  const handleStartEdit = () => {
    if (!completed) {
      setEditValue(title);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const lines = editValue.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setIsEditing(false);
      return;
    }

    const entries = lines.map((line) => {
      const isIndented = /^[\t]|^[ ]{2,}/.test(line);
      return { title: line.trim(), indent: isIndented };
    });

    // First non-indented line updates the task title; indented lines add as new subtasks
    editTaskWithSubtasks(id, entries);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = editValue.substring(0, start) + "  " + editValue.substring(end);
      setEditValue(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    } else if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-1.5 py-0 rounded-md border transition-all duration-150 ${
          completed
            ? "bg-slate-800/50 border-slate-700"
            : "bg-slate-800 border-slate-700/80 hover:border-primary-500 hover:shadow-sm"
        }`}
      >
        {/* Drag handle */}
        <button
          ref={dragHandleRef}
          className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -ml-0.5"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </button>

        {/* Checkbox */}
        <label className="relative flex items-center justify-center shrink-0 cursor-pointer p-0.5">
          <input
            type="checkbox"
            checked={completed}
            onChange={() => toggleComplete(id)}
            className="peer sr-only"
          />
          <div className={`w-[22px] h-[22px] rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
            completed
              ? "bg-primary-500 border-primary-500"
              : "border-slate-600 peer-hover:border-primary-400"
          }`}>
            {completed && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
        </label>

        {/* Title */}
        {isEditing ? (
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full text-[14px] px-2 py-0.5 border border-primary-500 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/30 bg-slate-900 text-white resize-none overflow-hidden"
              rows={1}
            />
            <div className="flex items-center justify-between mt-1 px-0.5">
              <span className="text-[11px] text-slate-500">
                indent for sub-tasks
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Enter to save</span>
            </div>
          </div>
        ) : (
          <span
            className={`flex-1 text-[13px] leading-tight cursor-pointer select-none transition-all duration-200 ${
              completed ? "line-through text-slate-500" : "text-slate-100"
            }`}
            onClick={handleStartEdit}
          >
            {title}
          </span>
        )}

        {/* Elapsed time */}
        {!isEditing && (
          <span className="text-[10px] text-slate-600 shrink-0 tabular-nums" title={new Date(createdAt).toLocaleString()}>
            {formatElapsed(createdAt)}
          </span>
        )}

        {/* Delete button */}
        <button
          onClick={() => deleteTask(id)}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all duration-150 shrink-0 p-0.5 rounded hover:bg-red-900/30"
          aria-label="Delete task"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Subtasks */}
      {subtasks && subtasks.length > 0 && (
        <div className="ml-8 mt-0.5 space-y-0 border-l-2 border-slate-700/50 pl-2">
          {subtasks.map((sub) => (
            <SubTaskItem key={sub.id} task={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubTaskItem({ task }: { task: Task }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateTask, deleteTask, toggleComplete } = useTaskStore();

  const { ref: dragRef, isDragSource } = useDraggable({
    id: task.id,
    type: "task",
  });

  const { ref: topRef, isDropTarget: isTopTarget } = useDroppable({
    id: `${task.id}::top`,
    accept: ["task"],
  });

  const { ref: bottomRef, isDropTarget: isBottomTarget } = useDroppable({
    id: `${task.id}::bottom`,
    accept: ["task"],
  });

  const showTop = isTopTarget && !isDragSource;
  const showBottom = isBottomTarget && !isDragSource;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!task.completed) {
      setEditValue(task.title);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="relative">
      {/* Drop zone overlays */}
      <div ref={topRef} className="absolute top-0 left-0 right-0 h-[50%] z-10 pointer-events-none" />
      <div ref={bottomRef} className="absolute bottom-0 left-0 right-0 h-[50%] z-10 pointer-events-none" />

      {/* Visual drop indicators */}
      {showTop && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary-400 z-20 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
      )}
      {showBottom && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-400 z-20 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
      )}

      <div ref={dragRef} style={{ opacity: isDragSource ? 0.3 : 1, transition: 'opacity 150ms' }}>
        <div className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all duration-150 ${
          task.completed ? "opacity-60" : "hover:bg-slate-800/60"
        }`}>
      <label className="relative flex items-center justify-center shrink-0 cursor-pointer p-0.5">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleComplete(task.id)}
          className="peer sr-only"
        />
        <div className={`w-[20px] h-[20px] rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
          task.completed
            ? "bg-primary-500 border-primary-500"
            : "border-slate-600 peer-hover:border-primary-400"
        }`}>
          {task.completed && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </div>
      </label>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 text-[13px] px-2 py-0.5 border border-primary-500 rounded-md outline-none focus:ring-2 focus:ring-primary-500/30 bg-slate-900 text-white"
        />
      ) : (
        <span
          className={`flex-1 text-[13px] leading-snug cursor-pointer select-none transition-all duration-200 ${
            task.completed ? "line-through text-slate-500" : "text-slate-300"
          }`}
          onClick={handleStartEdit}
        >
          {task.title}
        </span>
      )}

      <button
        onClick={() => deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all duration-150 shrink-0 p-0.5 rounded hover:bg-red-900/30"
        aria-label="Delete subtask"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
        </div>
      </div>
    </div>
  );
}
