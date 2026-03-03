import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useTaskStore } from "../store/taskStore";
import { TaskItem } from "./TaskItem";
import { AddTask } from "./AddTask";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";

interface SectionProps {
  id: string;
  name: string;
  isDefault: boolean;
  index: number;
}

export function Section({ id, name, isDefault, index }: SectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const renameRef = useRef<HTMLInputElement>(null);

  const { tasks, showCompleted, renameSection, deleteSection } = useTaskStore();

  const { ref: sortableRef } = useSortable({
    id: `section-${id}`,
    index,
    type: "section",
    accept: ["section"],
  });

  const sectionTasks = tasks
    .filter((t) => t.sectionId === id && !t.parentId)
    .filter((t) => showCompleted || !t.completed)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.order - b.order;
    });

  const getSubtasks = (parentId: string) =>
    tasks
      .filter((t) => t.parentId === parentId)
      .filter((t) => showCompleted || !t.completed)
      .sort((a, b) => a.order - b.order);

  const totalTasks = tasks.filter((t) => t.sectionId === id && !t.completed && !t.parentId).length;
  const completedCount = tasks.filter((t) => t.sectionId === id && t.completed && !t.parentId).length;

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== name) {
      renameSection(id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") {
      setRenameValue(name);
      setIsRenaming(false);
    }
  };

  // Section icon based on name
  const sectionIcon = id === "today" ? (
    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
    </svg>
  ) : id === "later" ? (
    <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );

  return (
    <div ref={sortableRef} className="mb-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2 group px-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
          aria-label={isCollapsed ? "Expand section" : "Collapse section"}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {sectionIcon}

        {isRenaming ? (
          <input
            ref={renameRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleRenameKeyDown}
            className="text-[13px] font-semibold px-2 py-0.5 border border-primary-500 rounded-md outline-none focus:ring-2 focus:ring-primary-500/30 uppercase tracking-wide bg-slate-900 text-white"
          />
        ) : (
          <h2
            className="text-[13px] font-semibold text-slate-300 cursor-pointer select-none uppercase tracking-wider"
            onDoubleClick={() => !isDefault && setIsRenaming(true)}
          >
            {name}
          </h2>
        )}

        <span className="text-[12px] text-slate-400 font-medium tabular-nums">
          {totalTasks > 0 && totalTasks}{completedCount > 0 && ` · ${completedCount} done`}
        </span>

        {!isDefault && (
          <button
            onClick={() => deleteSection(id)}
            className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all duration-150 text-[12px] font-medium px-1.5 py-0.5 rounded hover:bg-red-900/30"
            aria-label="Delete section"
          >
            Delete
          </button>
        )}
      </div>

      {/* Tasks list */}
      {!isCollapsed && (
        <div className="space-y-0.5 pl-5">
          {sectionTasks.map((task, taskIndex) => (
            <DraggableTaskItem
              key={task.id}
              task={task}
              index={taskIndex}
              sectionId={id}
              subtasks={getSubtasks(task.id)}
            />
          ))}
          {sectionTasks.length === 0 && (
            <div className="text-[13px] text-slate-500 py-2 px-3 italic">
              No tasks yet
            </div>
          )}
          <AddTask sectionId={id} />
        </div>
      )}
    </div>
  );
}

// Wrapper to make TaskItem draggable with edge/center drop zones
import { Task } from "../types";

function DraggableTaskItem({
  task,
  subtasks,
}: {
  task: Task;
  index: number;
  sectionId: string;
  subtasks: Task[];
}) {
  const { ref: dragRef, isDragSource } = useDraggable({
    id: task.id,
    type: "task",
  });

  const { ref: topRef, isDropTarget: isTopTarget } = useDroppable({
    id: `${task.id}::top`,
    accept: ["task"],
  });

  const { ref: centerRef, isDropTarget: isCenterTarget } = useDroppable({
    id: `${task.id}::center`,
    accept: ["task"],
  });

  const { ref: bottomRef, isDropTarget: isBottomTarget } = useDroppable({
    id: `${task.id}::bottom`,
    accept: ["task"],
  });

  // Don't show indicators on self
  const showTop = isTopTarget && !isDragSource;
  const showCenter = isCenterTarget && !isDragSource && !task.parentId;
  const showBottom = isBottomTarget && !isDragSource;

  return (
    <div className="relative">
      {/* Invisible drop zone overlays — collision detection uses bounding rects */}
      <div ref={topRef} className="absolute top-0 left-0 right-0 h-[30%] z-10 pointer-events-none" />
      <div ref={centerRef} className="absolute top-[30%] left-0 right-0 h-[40%] z-10 pointer-events-none" />
      <div ref={bottomRef} className="absolute bottom-0 left-0 right-0 h-[30%] z-10 pointer-events-none" />

      {/* Visual drop indicators */}
      {showTop && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary-400 z-20 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
      )}
      {showCenter && (
        <div className="absolute inset-0 border-2 border-primary-400 rounded-xl z-20 pointer-events-none bg-primary-500/10" />
      )}
      {showBottom && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-400 z-20 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
      )}

      <div ref={dragRef} style={{ opacity: isDragSource ? 0.3 : 1, transition: 'opacity 150ms' }}>
        <TaskItem
          id={task.id}
          title={task.title}
          completed={task.completed}
          subtasks={subtasks}
        />
      </div>
    </div>
  );
}
