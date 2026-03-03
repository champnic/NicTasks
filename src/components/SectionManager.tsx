import { useState, KeyboardEvent } from "react";
import { useTaskStore } from "../store/taskStore";

export function SectionManager() {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const { addSection } = useTaskStore();

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      addSection(trimmed);
      setName("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") {
      setName("");
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 mt-4 animate-fade-in">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!name.trim()) setIsAdding(false);
          }}
          placeholder="Section name..."
          autoFocus
          className="flex-1 text-[14px] px-3 py-1.5 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-slate-900 placeholder:text-slate-500 text-white"
        />
        <button
          onClick={handleSubmit}
          className="text-[13px] font-medium px-3 py-1.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Add
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="mt-3 w-full text-left px-3 py-2.5 text-[13px] font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800/80 rounded-xl transition-all duration-150 border border-dashed border-slate-700 hover:border-slate-600 flex items-center gap-1.5"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add Section
    </button>
  );
}
